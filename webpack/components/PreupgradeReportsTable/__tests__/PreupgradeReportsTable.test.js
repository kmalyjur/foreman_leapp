import React from 'react';
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { APIActions } from 'foremanReact/redux/API';
import PreupgradeReportsTable from '../index';

jest.mock('foremanReact/redux/API');

jest.mock('foremanReact/constants', () => ({
  ...jest.requireActual('foremanReact/constants'),
  getControllerSearchProps: jest.fn(() => ({
    autocomplete: { url: '' },
    bookmarks: { controller: 'preupgrade_report_entries', url: '/bookmarks' },
  })),
  STATUS: { PENDING: 'PENDING', RESOLVED: 'RESOLVED', ERROR: 'ERROR' },
}));

jest.mock('foremanReact/Root/Context/ForemanContext', () => ({
  useForemanSettings: jest.fn(() => ({ perPage: 5 })),
}));

jest.mock('foremanReact/components/SearchBar', () => {
  const MockSearchBar = ({ onSearch, searchQuery }) => (
    <input
      data-testid="search-input"
      value={searchQuery || ''}
      onChange={() => {}}
      onKeyDown={e => {
        if (e.key === 'Enter') onSearch(e.target.value);
      }}
    />
  );
  return MockSearchBar;
});

const mockStore = configureMockStore([thunk]);
const mockJobId = 42;
const mockReportId = 999;
const mockJobData = {
  id: mockJobId,
  template_name: 'Run preupgrade via Leapp',
};

const mockEntries = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  title: `Report Entry ${i + 1}`,
  hostname: 'example.com',
  host_id: 100 + i,
  severity: i === 0 ? 'high' : 'low',
  summary: `Summary for report entry ${i + 1}`,
  tags: i === 0 ? ['security', 'network'] : [],
  flags: i === 0 ? ['inhibitor'] : [],
  detail: {
    remediations:
      i === 0
        ? [{ type: 'command', context: ['echo', 'fix_command'] }]
        : i === 1
        ? [{ type: 'hint', context: 'Do something manually' }]
        : null,
    external:
      i === 0 ? [{ url: 'http://example.com', title: 'External Link' }] : [],
  },
}));

describe('PreupgradeReportsTable', () => {
  let store;

  beforeEach(() => {
    store = mockStore({ API: {} });
    jest.clearAllMocks();

    APIActions.get.mockImplementation(({ key, handleSuccess }) => {
      return dispatch => {
        if (key.includes('GET_LEAPP_REPORT_LIST')) {
          handleSuccess({ results: [{ id: mockReportId }] });
        }
        if (key.includes('GET_LEAPP_REPORT_DETAIL')) {
          handleSuccess({
            id: mockReportId,
            preupgrade_report_entries: mockEntries,
            results: mockEntries,
            total: mockEntries.length,
            subtotal: mockEntries.length,
          });
        }
        return { type: 'MOCK_API_SUCCESS' };
      };
    });

    APIActions.post.mockImplementation(() => () => ({ type: 'MOCK_API_POST' }));
  });

  const renderComponent = (data = mockJobData) =>
    render(
      <Provider store={store}>
        <PreupgradeReportsTable data={data} />
      </Provider>
    );

  const expandSection = () => {
    fireEvent.click(screen.getByText('Leapp preupgrade report'));
  };

  const waitForTable = () =>
    waitFor(() => screen.getByText('Report Entry 1', { selector: 'td' }));

  it('renders data', async () => {
    renderComponent();
    expandSection();
    await waitForTable();
    expect(
      screen.getByText('Report Entry 1', { selector: 'td' })
    ).toBeInTheDocument();
  });

  it('does not render anything for non-Leapp jobs', () => {
    renderComponent({ id: 55, template_name: 'Standard RHEL Update' });
    expect(
      screen.queryByText('Leapp preupgrade report')
    ).not.toBeInTheDocument();
  });

  it('renders empty state message when no issues found', async () => {
    APIActions.get.mockImplementation(({ key, handleSuccess }) => {
      return () => {
        if (key.includes('GET_LEAPP_REPORT_LIST'))
          handleSuccess({ results: [{ id: mockReportId }] });
        if (key.includes('GET_LEAPP_REPORT_DETAIL'))
          handleSuccess({
            id: mockReportId,
            preupgrade_report_entries: [],
            results: [],
            total: 0,
          });
        return { type: 'EMPTY' };
      };
    });
    renderComponent();
    expandSection();
    await waitFor(() =>
      expect(
        screen.getByText('The preupgrade report shows no issues.')
      ).toBeInTheDocument()
    );
  });

  it('expands a row and shows details', async () => {
    renderComponent();
    expandSection();
    await waitForTable();
    fireEvent.click(screen.getAllByLabelText('Details')[0]);
    expect(
      await screen.findByText('Summary for report entry 1')
    ).toBeInTheDocument();
  });

  it('expands all rows when expand-all is clicked', async () => {
    renderComponent();
    expandSection();
    await waitForTable();
    fireEvent.click(screen.getByLabelText('Expand all rows'));
    expect(
      await screen.findByText('Summary for report entry 1')
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Summary for report entry 5')
    ).toBeInTheDocument();
  });

  it('collapses all rows when expand-all is clicked a second time', async () => {
    renderComponent();
    expandSection();
    await waitForTable();

    const expandAllButton = screen.getByLabelText('Expand all rows');
    fireEvent.click(expandAllButton); // expand
    await screen.findByText('Summary for report entry 1');
    fireEvent.click(expandAllButton); // collapse

    await waitFor(() => {
      expect(
        screen.queryByText('Summary for report entry 1')
      ).not.toBeInTheDocument();
    });
  });

  it('calls the show endpoint with search param', async () => {
    renderComponent();
    expandSection();
    await waitForTable();

    const input = screen.getByTestId('search-input');
    fireEvent.keyDown(input, {
      key: 'Enter',
      target: { value: 'title = Report' },
    });

    await waitFor(() => {
      const calls = APIActions.get.mock.calls
        .flat()
        .filter(
          arg =>
            arg?.key?.includes('GET_LEAPP_REPORT_DETAIL') && arg?.params?.search
        );
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0].params.search).toBe('title = Report');
    });
  });

  it('calls the endpoint with sort parameters when a column header is clicked', async () => {
    renderComponent();
    expandSection();
    await waitForTable();

    const titleSortButton = screen.getByRole('button', { name: /Title/i });
    fireEvent.click(titleSortButton);

    await waitFor(() => {
      const calls = APIActions.get.mock.calls
        .flat()
        .filter(
          arg =>
            arg?.key?.includes('GET_LEAPP_REPORT_DETAIL') && arg?.params?.order
        );
      const lastCall = calls[calls.length - 1];
      expect(lastCall.params.order).toContain('title');
    });
  });

  it('paginates to the next page', async () => {
    renderComponent();
    expandSection();
    await waitForTable();
    fireEvent.click(screen.getAllByLabelText('Go to next page')[0]);
    await waitFor(() => screen.getByText('Report Entry 6', { selector: 'td' }));
    expect(
      screen.getByText('Report Entry 10', { selector: 'td' })
    ).toBeInTheDocument();
  });

  it('changes perPage limit to 10', async () => {
    renderComponent();
    expandSection();
    await waitForTable();
    fireEvent.click(screen.getAllByLabelText('Items per page')[0]);
    fireEvent.click(screen.getAllByText('10 per page')[0]);
    await waitFor(() =>
      expect(
        screen.getByText('Report Entry 10', { selector: 'td' })
      ).toBeInTheDocument()
    );
  });

  it('displays correct inhibitor status based on flags', async () => {
    renderComponent();
    expandSection();
    await waitForTable();

    const row1 = screen
      .getByText('Report Entry 1', { selector: 'td' })
      .closest('tr');
    expect(
      within(row1.querySelector('td[data-label="Inhibitor?"]')).getByText('Yes')
    ).toBeInTheDocument();

    const row2 = screen
      .getByText('Report Entry 2', { selector: 'td' })
      .closest('tr');
    expect(
      within(row2.querySelector('td[data-label="Inhibitor?"]')).getByText('No')
    ).toBeInTheDocument();
  });

  it('shows Has Remediation? Yes for any remediation type, not only command', async () => {
    renderComponent();
    expandSection();
    await waitForTable();

    const row1 = screen
      .getByText('Report Entry 1', { selector: 'td' })
      .closest('tr');
    expect(
      within(row1.querySelector('td[data-label="Has Remediation?"]')).getByText(
        'Yes'
      )
    ).toBeInTheDocument();

    const row2 = screen
      .getByText('Report Entry 2', { selector: 'td' })
      .closest('tr');
    expect(
      within(row2.querySelector('td[data-label="Has Remediation?"]')).getByText(
        'Yes'
      )
    ).toBeInTheDocument();

    const row3 = screen
      .getByText('Report Entry 3', { selector: 'td' })
      .closest('tr');
    expect(
      within(row3.querySelector('td[data-label="Has Remediation?"]')).getByText(
        'No'
      )
    ).toBeInTheDocument();
  });

  it('renders Fix Selected button disabled initially', async () => {
    renderComponent();
    expandSection();
    await waitForTable();
    expect(screen.getByRole('button', { name: 'Fix Selected' })).toBeDisabled();
  });

  it('enables Fix Selected after selecting a fixable (command) row', async () => {
    renderComponent();
    expandSection();
    await waitForTable();

    // checkboxes[0] = SelectAll, checkboxes[1] = entry id=1 (command remediation)
    fireEvent.click(screen.getAllByRole('checkbox')[1]);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Fix Selected' })
      ).not.toBeDisabled()
    );
  });

  it('Fix Selected dispatches APIActions.post with correct feature, host_ids and remediation_ids', async () => {
    renderComponent();
    expandSection();
    await waitForTable();

    fireEvent.click(screen.getAllByRole('checkbox')[1]); // select entry id=1 (host_id=100)

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Fix Selected' })
      ).not.toBeDisabled()
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fix Selected' }));

    expect(APIActions.post).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('/api/job_invocations'),
        params: {
          job_invocation: {
            feature: 'leapp_remediation_plan',
            host_ids: [100],
            inputs: { remediation_ids: '1' },
          },
        },
      })
    );
  });

  it('hint-only row checkbox is disabled and does not enable Fix Selected', async () => {
    renderComponent();
    expandSection();
    await waitForTable();

    // checkboxes[2] = entry id=2, which has hint-only remediation — must be disabled
    const hintCheckbox = screen.getAllByRole('checkbox')[2];
    expect(hintCheckbox).toBeDisabled();

    fireEvent.click(hintCheckbox);
    expect(screen.getByRole('button', { name: 'Fix Selected' })).toBeDisabled();
  });

  it('renders Run Upgrade button enabled when entries are present', async () => {
    renderComponent();
    expandSection();
    await waitForTable();
    expect(
      screen.getByRole('button', { name: 'Run Upgrade' })
    ).not.toBeDisabled();
  });

  it('Run Upgrade dispatches APIActions.post with correct feature and all host_ids', async () => {
    renderComponent();
    expandSection();
    await waitForTable();

    fireEvent.click(screen.getByRole('button', { name: 'Run Upgrade' }));

    expect(APIActions.post).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('/api/job_invocations'),
        params: {
          job_invocation: {
            feature: 'leapp_upgrade',
            host_ids: expect.arrayContaining([100, 101, 102]),
          },
        },
      })
    );
    const callParams = APIActions.post.mock.calls[0][0].params.job_invocation;
    expect(callParams.inputs).toBeUndefined();
  });

  it('does not render toolbar buttons when report has no entries', async () => {
    APIActions.get.mockImplementation(({ key, handleSuccess }) => {
      return () => {
        if (key.includes('GET_LEAPP_REPORT_LIST'))
          handleSuccess({ results: [{ id: mockReportId }] });
        if (key.includes('GET_LEAPP_REPORT_DETAIL'))
          handleSuccess({
            id: mockReportId,
            results: [],
            preupgrade_report_entries: [],
          });
        return { type: 'EMPTY' };
      };
    });
    renderComponent();
    expandSection();
    await waitFor(() =>
      screen.getByText('The preupgrade report shows no issues.')
    );
    expect(
      screen.queryByRole('button', { name: 'Fix Selected' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Run Upgrade' })
    ).not.toBeInTheDocument();
  });

  it('renders the SelectAll checkbox', async () => {
    renderComponent();
    expandSection();
    await waitForTable();
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
  });

  it('selecting all fixable rows enables Fix Selected', async () => {
    renderComponent();
    expandSection();
    await waitForTable();

    fireEvent.click(screen.getByLabelText('Select all'));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Fix Selected' })
      ).not.toBeDisabled()
    );
  });
});

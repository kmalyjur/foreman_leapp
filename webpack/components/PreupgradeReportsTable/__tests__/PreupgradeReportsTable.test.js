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
  severity: i === 0 ? 'high' : 'low',
  summary: `Summary for report entry ${i + 1}`,
  tags: i === 0 ? ['security', 'network'] : [],
  flags: i === 0 ? ['inhibitor'] : [],
  detail: {
    remediations:
      i === 0 ? [{ type: 'command', context: ['echo', 'fix_command'] }] : [],
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
        if (key.includes('GET_LEAPP_REPORT_LIST'))
          handleSuccess({ results: [{ id: mockReportId }] });
        if (key.includes('GET_LEAPP_REPORT_DETAIL'))
          handleSuccess({
            id: mockReportId,
            preupgrade_report_entries: mockEntries,
          });
        return { type: 'MOCK_API_SUCCESS' };
      };
    });
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

  it('renders data', async () => {
    renderComponent();
    expandSection();
    await waitFor(() => screen.getByText('Report Entry 1', { selector: 'td' }));
    expect(
      screen.getByText('Report Entry 1', { selector: 'td' })
    ).toBeInTheDocument();
  });

  it('expands a row and shows details', async () => {
    renderComponent();
    expandSection();
    await waitFor(() => screen.getByText('Report Entry 1', { selector: 'td' }));

    const rowExpandButtons = screen.getAllByLabelText('Details');
    fireEvent.click(rowExpandButtons[0]);

    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Summary for report entry 1')).toBeInTheDocument();
  });

  it('expands all rows', async () => {
    renderComponent();
    expandSection();
    await waitFor(() => screen.getByText('Report Entry 1', { selector: 'td' }));

    const expandAllButton = screen.getByLabelText('Expand all rows');
    fireEvent.click(expandAllButton);

    expect(screen.getByText('Summary for report entry 1')).toBeInTheDocument();
    expect(screen.getByText('Summary for report entry 5')).toBeInTheDocument();
  });

  it('paginates to the next page', async () => {
    renderComponent();
    expandSection();
    await waitFor(() => screen.getByText('Report Entry 1', { selector: 'td' }));

    fireEvent.click(screen.getAllByLabelText('Go to next page')[0]);
    await waitFor(() => screen.getByText('Report Entry 6', { selector: 'td' }));

    expect(
      screen.getByText('Report Entry 10', { selector: 'td' })
    ).toBeInTheDocument();
  });

  it('changes perPage limit to 10', async () => {
    renderComponent();
    expandSection();
    await waitFor(() => screen.getByText('Report Entry 1', { selector: 'td' }));

    fireEvent.click(screen.getAllByLabelText('Items per page')[0]);
    fireEvent.click(screen.getAllByText('10 per page')[0]);

    await waitFor(() => {
      expect(
        screen.getByText('Report Entry 10', { selector: 'td' })
      ).toBeInTheDocument();
    });
  });

  it('renders empty state message when no issues found', async () => {
    APIActions.get.mockImplementation(({ key, handleSuccess }) => {
      return () => {
        if (key.includes('GET_LEAPP_REPORT_LIST'))
          handleSuccess({ results: [{ id: mockReportId }] });
        if (key.includes('GET_LEAPP_REPORT_DETAIL'))
          handleSuccess({ id: mockReportId, preupgrade_report_entries: [] });
        return { type: 'EMPTY' };
      };
    });
    renderComponent();
    expandSection();
    await waitFor(() => {
      expect(
        screen.getByText('The preupgrade report shows no issues.')
      ).toBeInTheDocument();
    });
  });

  it('does not render anything for non-Leapp jobs', () => {
    const nonLeappData = { id: 55, template_name: 'Standard RHEL Update' };
    renderComponent(nonLeappData);
    expect(
      screen.queryByText('Leapp preupgrade report')
    ).not.toBeInTheDocument();
  });

  it('displays correct inhibitor status based on flags', async () => {
    renderComponent();
    expandSection();
    await waitFor(() => screen.getByText('Report Entry 1', { selector: 'td' }));

    const row1 = screen
      .getByText('Report Entry 1', { selector: 'td' })
      .closest('tr');
    const inhibitorCell1 = row1.querySelector('td[data-label="Inhibitor?"]');
    expect(within(inhibitorCell1).getByText('Yes')).toBeInTheDocument();

    const row2 = screen
      .getByText('Report Entry 2', { selector: 'td' })
      .closest('tr');
    const inhibitorCell2 = row2.querySelector('td[data-label="Inhibitor?"]');
    expect(within(inhibitorCell2).getByText('No')).toBeInTheDocument();
  });
});

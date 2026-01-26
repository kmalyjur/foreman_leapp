import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

// Updated mock entries with data needed for ReportDetails
const mockEntries = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  title: `Report Entry ${i + 1}`,
  hostname: 'example.com',
  severity: i === 0 ? 'high' : 'low',
  summary: `Summary for report entry ${i + 1}`,
  tags: i === 0 ? ['security', 'network'] : [],
  flags: i === 0 ? ['inhibitor'] : [],
  detail: { 
    remediations: i === 0 ? [{ type: 'command', context: ['echo', 'fix_command'] }] : [],
    external: i === 0 ? [{ url: 'http://example.com', title: 'External Link' }] : []
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

  const renderComponent = () =>
    render(
      <Provider store={store}>
        <PreupgradeReportsTable data={mockJobData} />
      </Provider>
    );

  const expandSection = () => {
    fireEvent.click(screen.getByText('Leapp preupgrade report'));
  };

  it('renders data', async () => {
    renderComponent();
    expandSection();

    // Use selector: 'td' to ensure we only find the table cell title, avoiding duplicates
    await waitFor(() => screen.getByText('Report Entry 1', { selector: 'td' }));

    expect(screen.getByText('Report Entry 1', { selector: 'td' })).toBeInTheDocument();
    expect(screen.getByText('Report Entry 5', { selector: 'td' })).toBeInTheDocument();
    expect(screen.queryByText('Report Entry 6')).not.toBeInTheDocument();
  });

  it('expands a row and shows details', async () => {
    renderComponent();
    expandSection();
    await waitFor(() => screen.getByText('Report Entry 1', { selector: 'td' }));

    // Find the expand button for the first row
    const rowExpandButtons = screen.getAllByLabelText('Details');
    fireEvent.click(rowExpandButtons[0]);

    // Assert that the detailed information from ReportDetails is visible.
    // Since we only render details for the expanded row, "Summary" is unique.
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Summary for report entry 1')).toBeInTheDocument();
    
    // Check Tags
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('security')).toBeInTheDocument();
    
    // Check Remediations
    expect(screen.getByText('Command')).toBeInTheDocument();
    expect(screen.getByText('echo fix_command')).toBeInTheDocument();

    // Check Links
    expect(screen.getByText('Links')).toBeInTheDocument();
    expect(screen.getByText('External Link')).toBeInTheDocument();
  });

  it('expands all rows', async () => {
    renderComponent();
    expandSection();
    await waitFor(() => screen.getByText('Report Entry 1', { selector: 'td' }));

    // Find the "Expand all" button in the table header
    const expandAllButton = screen.getByLabelText('Expand all rows');
    fireEvent.click(expandAllButton);

    // Assert that details for multiple rows are now visible
    // We check specific unique text to avoid "Found multiple elements" error
    expect(screen.getByText('Summary for report entry 1')).toBeInTheDocument();
    expect(screen.getByText('Summary for report entry 5')).toBeInTheDocument();
  });

  it('paginates to the next page', async () => {
    renderComponent();
    expandSection();
    await waitFor(() => screen.getByText('Report Entry 1', { selector: 'td' }));

    fireEvent.click(screen.getAllByLabelText('Go to next page')[0]);

    await waitFor(() => screen.getByText('Report Entry 6', { selector: 'td' }));
    expect(screen.getByText('Report Entry 10', { selector: 'td' })).toBeInTheDocument();
    expect(screen.queryByText('Report Entry 1')).not.toBeInTheDocument();
  });

  it('changes perPage limit to 10', async () => {
    renderComponent();
    expandSection();
    await waitFor(() => screen.getByText('Report Entry 1', { selector: 'td' }));

    fireEvent.click(screen.getAllByLabelText('Items per page')[0]);
    fireEvent.click(screen.getAllByText('10 per page')[0]);

    await waitFor(() => {
      expect(screen.getByText('Report Entry 10', { selector: 'td' })).toBeInTheDocument();
      expect(screen.queryByText('Report Entry 11')).not.toBeInTheDocument();
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
      expect(screen.getByText('The preupgrade report shows no issues.')).toBeInTheDocument();
    });
  });
});
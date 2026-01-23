import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import PreupgradeReportsList from '../index';

jest.mock('foremanReact/components/Pagination', () => {
  const MockPagination = () => <div data-testid="pagination">Pagination</div>;
  return MockPagination;
});

jest.mock('../components/images/i_severity-high.svg', () => 'severity-high.svg');
jest.mock('../components/images/i_severity-med.svg', () => 'severity-med.svg');
jest.mock('../components/images/i_severity-low.svg', () => 'severity-low.svg');

const createMockEntries = count =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    preupgradeReportId: 100,
    title: `Entry ${i + 1}`,
    hostname: `host${i + 1}.example.com`,
    severity: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
    flags: i === 0 ? ['inhibitor'] : [],
    detail: {
      remediations:
        i < 2
          ? [{ type: 'command', context: ['echo', 'fix', 'command'] }]
          : [],
    },
  }));

const defaultProps = {
  allEntries: createMockEntries(4),
  isSelected: () => false,
  toggleSelected: jest.fn(),
  sort: { attribute: '', order: 'asc' },
  changeSort: jest.fn(),
  toggleSelectAll: jest.fn(),
};

const renderComponent = (props = {}) =>
  render(<PreupgradeReportsList {...defaultProps} {...props} />);

describe('PreupgradeReportsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the list header', () => {
    renderComponent();

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(screen.getByText('Risk Factor')).toBeInTheDocument();
    expect(screen.getByText('Has Remediation?')).toBeInTheDocument();
    expect(screen.getByText('Inhibitor?')).toBeInTheDocument();
  });

  it('renders entry titles', () => {
    renderComponent();

    expect(screen.getByText('Entry 1')).toBeInTheDocument();
    expect(screen.getByText('Entry 2')).toBeInTheDocument();
    expect(screen.getByText('Entry 3')).toBeInTheDocument();
    expect(screen.getByText('Entry 4')).toBeInTheDocument();
  });

  it('renders entry hostnames', () => {
    renderComponent();

    expect(screen.getByText('host1.example.com')).toBeInTheDocument();
    expect(screen.getByText('host2.example.com')).toBeInTheDocument();
  });

  it('renders checkboxes for entries', () => {
    renderComponent();

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it('calls toggleSelectAll when header checkbox is clicked', () => {
    const toggleSelectAll = jest.fn();
    renderComponent({ toggleSelectAll });

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    expect(toggleSelectAll).toHaveBeenCalled();
  });

  it('renders with empty entries array', () => {
    renderComponent({ allEntries: [] });

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.queryByText('Entry 1')).not.toBeInTheDocument();
  });

  it('renders entries with selected state', () => {
    const isSelected = entry => entry.id === 1;
    renderComponent({ isSelected });

    const checkboxes = screen.getAllByRole('checkbox');
    const entryCheckboxes = checkboxes.slice(1);
    expect(entryCheckboxes[0]).toBeChecked();
    expect(entryCheckboxes[1]).not.toBeChecked();
  });

  it('calls toggleSelected when entry checkbox is clicked', () => {
    const toggleSelected = jest.fn();
    renderComponent({ toggleSelected });

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    expect(toggleSelected).toHaveBeenCalled();
  });

  it('renders pagination component', () => {
    renderComponent();

    expect(screen.getByTestId('pagination')).toBeInTheDocument();
  });
});

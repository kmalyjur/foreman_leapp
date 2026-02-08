import PropTypes from 'prop-types';
import React, { useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import {
  ExpandableSection,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  SearchInput,
  Tooltip,
} from '@patternfly/react-core';
import { ExpandableRowContent, Tbody, Td, Tr } from '@patternfly/react-table';
import { translate as __ } from 'foremanReact/common/I18n';
import { Table } from 'foremanReact/components/PF4/TableIndexPage/Table/Table';
import { getColumnHelpers } from 'foremanReact/components/PF4/TableIndexPage/Table/helpers';
import { APIActions } from 'foremanReact/redux/API';
import { STATUS } from 'foremanReact/constants';
import ReportDetails, { renderSeverityLabel } from './ReportDetails';

const PreupgradeReportsTable = ({ data = {} }) => {
  const [error, setError] = useState(null);
  const [isReportExpanded, setIsReportExpanded] = useState(false);

  // Search State
  const [searchValue, setSearchValue] = useState(''); // What you type
  const [activeSearch, setActiveSearch] = useState(''); // What goes to API

  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 5,
    order: 'severity DESC',
  });

  const [reportSummaryId, setReportSummaryId] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [status, setStatus] = useState(STATUS.RESOLVED);
  const [expandedRowIds, setExpandedRowIds] = useState(new Set());

  const dispatch = useDispatch();
  const isMounted = useRef(false);
  // eslint-disable-next-line camelcase
  const isLeappJob = data?.template_name?.includes('Run preupgrade via Leapp');

  // Track mounted state
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const columns = {
    title: {
      title: __('Title'),
      isSorted: true,
    },
    hostname: {
      title: __('Host'),
      wrapper: entry => entry.hostname || '-',
      isSorted: true,
    },
    severity: {
      title: __('Risk Factor'),
      wrapper: ({ severity }) => renderSeverityLabel(severity),
      isSorted: true,
    },
    has_remediation: {
      title: __('Has Remediation?'),
      wrapper: entry =>
        entry.detail && entry.detail.remediations ? __('Yes') : __('No'),
      isSorted: true,
    },
    inhibitor: {
      title: __('Inhibitor?'),
      wrapper: entry =>
        entry.flags && entry.flags.some(flag => flag === 'inhibitor') ? (
          <Tooltip content={__('This issue inhibits the upgrade.')}>
            <span>{__('Yes')}</span>
          </Tooltip>
        ) : (
          __('No')
        ),
      isSorted: true,
    },
  };

  // --- Search Handlers (FIXED) ---

  // 1. Fix for [object Object]: Check arguments to find the string
  const onSearchChange = (val1, val2) => {
    const value = typeof val1 === 'string' ? val1 : val2;
    setSearchValue(value);
  };

  // 2. Trigger API search
  const onSearchSubmit = (event, val) => {
    if (event && event.preventDefault) event.preventDefault();
    setActiveSearch(searchValue); 
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // 3. Clear search
  const onSearchClear = () => {
    setSearchValue('');
    setActiveSearch('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // STEP 1: Get Report ID
  useEffect(() => {
    if (!isLeappJob || !isReportExpanded || reportSummaryId) return undefined;

    dispatch(
      APIActions.get({
        key: `GET_LEAPP_REPORT_LIST_${data.id}`,
        url: `/api/job_invocations/${data.id}/preupgrade_reports`,
        handleSuccess: listResponse => {
          if (!isMounted.current) return;
          const results = listResponse.data?.results || listResponse.results;
          if (results && results.length > 0) {
            setReportSummaryId(results[0].id);
          } else {
            setReportData({ preupgrade_report_entries: [], subtotal: 0 });
            setStatus(STATUS.RESOLVED);
          }
        },
        handleError: err => {
          if (!isMounted.current) return;
          setError(err);
          setStatus(STATUS.ERROR);
        },
      })
    );
  }, [isReportExpanded, data.id, isLeappJob, reportSummaryId, dispatch]);

  // STEP 2: Get Sorted, Paginated, AND SEARCHED Entries
  useEffect(() => {
    if (!reportSummaryId) return undefined;

    setStatus(STATUS.PENDING);

    // Create a unique key to force re-fetch when parameters change
    const requestKey = `GET_LEAPP_REPORT_DETAIL_${reportSummaryId}_${pagination.page}_${pagination.perPage}_${pagination.order}_${activeSearch}`;

    dispatch(
      APIActions.get({
        key: requestKey,
        url: `/api/preupgrade_reports/${reportSummaryId}`,
        params: {
          page: pagination.page,
          per_page: pagination.perPage,
          order: pagination.order,
          search: activeSearch,
        },
        handleSuccess: detailResponse => {
          if (!isMounted.current) return;
          const payload = detailResponse.data || detailResponse;
          setReportData(payload);
          setStatus(STATUS.RESOLVED);
        },
        handleError: err => {
          if (!isMounted.current) return;
          setError(err);
          setStatus(STATUS.ERROR);
        },
      })
    );
  }, [
    reportSummaryId,
    pagination.page,
    pagination.perPage,
    pagination.order,
    activeSearch,
    dispatch,
  ]);

  const entries = reportData?.preupgrade_report_entries || [];

  const handleParamsChange = newParams => {
    setPagination(prev => ({
      ...prev,
      page: newParams.page !== undefined ? newParams.page : prev.page,
      perPage:
        newParams.perPage !== undefined ? newParams.perPage : prev.perPage,
      order: newParams.order !== undefined ? newParams.order : prev.order,
    }));
    setExpandedRowIds(new Set());
  };

  const toggleRowExpansion = (id, isExpanding) => {
    setExpandedRowIds(prev => {
      const newSet = new Set(prev);
      if (isExpanding) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const areAllRowsExpanded =
    entries.length > 0 && entries.every(entry => expandedRowIds.has(entry.id));

  const onExpandAll = () => {
    setExpandedRowIds(() => {
      if (areAllRowsExpanded) {
        return new Set();
      }
      return new Set(entries.map(e => e.id));
    });
  };

  const [columnKeys, keysToColumnNames] = getColumnHelpers(columns);

  if (!isLeappJob) return null;

  return (
    <ExpandableSection
      className="leapp-report-section"
      isExpanded={isReportExpanded}
      onToggle={(_event, val) => setIsReportExpanded(val)}
      toggleText={__('Leapp preupgrade report')}
    >
      <Toolbar id="leapp-report-toolbar" className="pf-c-toolbar">
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder={__('Search by title...')}
              value={searchValue}
              onChange={onSearchChange} 
              onSearch={onSearchSubmit}
              onClear={onSearchClear}
              resultsCount={`${reportData?.subtotal || 0} ${__('results')}`}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      <Table
        ouiaId="leapp-report-table"
        columns={columns}
        isEmbedded
        params={{
          page: pagination.page,
          perPage: pagination.perPage,
          order: pagination.order,
        }}
        results={entries}
        itemCount={reportData?.subtotal || 0}
        url=""
        isPending={status === STATUS.PENDING}
        errorMessage={
          status === STATUS.ERROR && error?.message ? error.message : null
        }
        showCheckboxes={false}
        refreshData={() => {}}
        isDeleteable={false}
        emptyMessage={
          activeSearch
            ? __('No results found for your search.')
            : __('The preupgrade report shows no issues.')
        }
        setParams={handleParamsChange}
        childrenOutsideTbody
        onExpandAll={onExpandAll}
        areAllRowsExpanded={!areAllRowsExpanded}
      >
        {entries.map((entry, rowIndex) => {
          const isRowExpanded = expandedRowIds.has(entry.id);
          return (
            <Tbody key={entry.id} isExpanded={isRowExpanded}>
              <Tr ouiaId={`table-row-${rowIndex}`}>
                <Td
                  expand={{
                    rowIndex,
                    isExpanded: isRowExpanded,
                    onToggle: (_event, _rowIndex, isOpen) =>
                      toggleRowExpansion(entry.id, isOpen),
                  }}
                />
                {columnKeys.map(key => (
                  <Td key={key} dataLabel={keysToColumnNames[key]}>
                    {columns[key].wrapper
                      ? columns[key].wrapper(entry)
                      : entry[key]}
                  </Td>
                ))}
              </Tr>
              <Tr
                isExpanded={isRowExpanded}
                ouiaId={`table-row-details-${rowIndex}`}
              >
                <Td colSpan={columnKeys.length + 1}>
                  <ExpandableRowContent>
                    {isRowExpanded && <ReportDetails entry={entry} />}
                  </ExpandableRowContent>
                </Td>
              </Tr>
            </Tbody>
          );
        })}
      </Table>
    </ExpandableSection>
  );
};

PreupgradeReportsTable.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.number,
    template_name: PropTypes.string,
  }),
};

PreupgradeReportsTable.defaultProps = {
  data: {},
};

export default PreupgradeReportsTable;
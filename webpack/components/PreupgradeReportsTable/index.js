import PropTypes from 'prop-types';
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import {
  ExpandableSection,
  Tooltip,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  SearchInput,
} from '@patternfly/react-core';
import {
  ExpandableRowContent,
  Tbody,
  Td,
  Tr,
} from '@patternfly/react-table';
import { translate as __ } from 'foremanReact/common/I18n';
// IMPORTANT: Adjust this path to where your Table wrapper lives
import { Table } from 'foremanReact/components/PF4/TableIndexPage/Table/Table';
import { APIActions } from 'foremanReact/redux/API';
import { STATUS } from 'foremanReact/constants';
import { debounce } from 'lodash';

import ReportDetails, { renderSeverityLabel } from './ReportDetails';

const PreupgradeReportsTable = ({ data = {} }) => {
  const [error, setError] = useState(null);
  const [isReportExpanded, setIsReportExpanded] = useState(false);

  // Table State
  const [tableParams, setTableParams] = useState({
    page: 1,
    perPage: 5,
    order: 'severity desc', 
  });

  const [searchValue, setSearchValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [reportSummaryId, setReportSummaryId] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [status, setStatus] = useState(STATUS.RESOLVED);
  const [expandedRowIds, setExpandedRowIds] = useState(new Set());

  const dispatch = useDispatch();
  // eslint-disable-next-line camelcase
  const isLeappJob = data?.template_name?.includes('Run preupgrade via Leapp');
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Columns: Keys must match DB columns for sorting (title, hostname, severity)
  const columns = useMemo(() => ({
    title: { 
      title: __('Title'), 
      isSorted: true, 
      wrapper: null 
    },
    hostname: { 
      title: __('Host'), 
      isSorted: true,
      wrapper: entry => entry.hostname || (reportData && reportData.hostname) || '-'
    },
    severity: { 
      title: __('Risk Factor'), 
      isSorted: true,
      wrapper: ({ severity }) => renderSeverityLabel(severity)
    },
    has_remediation: { 
      title: __('Has Remediation?'), 
      isSorted: false,
      wrapper: entry => entry.detail && entry.detail.remediations ? __('Yes') : __('No')
    },
    inhibitor: { 
      title: __('Inhibitor?'), 
      isSorted: false,
      wrapper: entry => entry.flags && entry.flags.some(flag => flag === 'inhibitor') ? (
        <Tooltip content={__('This issue inhibits the upgrade.')}><span>{__('Yes')}</span></Tooltip>
      ) : __('No')
    },
  }), [reportData]);

  const debouncedSetSearch = useCallback(
    debounce(value => {
      setSearchQuery(value);
      setTableParams(prev => ({ ...prev, page: 1 }));
    }, 800),
    []
  );

  const handleSearchChange = (value) => {
    setSearchValue(value);
    debouncedSetSearch(value);
  };

  const handleParamsChange = (newParams) => {
    setTableParams(prev => ({ ...prev, ...newParams }));
    setExpandedRowIds(new Set());
  };

  // STEP 1: Get Report ID
  useEffect(() => {
    if (!isLeappJob || !isReportExpanded || reportSummaryId) return;

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
            setReportData({ preupgrade_report_entries: [] });
            setStatus(STATUS.RESOLVED);
          }
        },
        handleError: err => {
          if (isMounted.current) {
            setError(err);
            setStatus(STATUS.ERROR);
          }
        },
      })
    );
  }, [isReportExpanded, data.id, isLeappJob, reportSummaryId, dispatch]);

  // STEP 2: Get Sorted Entries
  useEffect(() => {
    if (!reportSummaryId) return;

    setStatus(STATUS.PENDING);

    dispatch(
      APIActions.get({
        key: `GET_LEAPP_REPORT_DETAIL_${reportSummaryId}`,
        url: `/api/preupgrade_reports/${reportSummaryId}`,
        params: {
          page: tableParams.page,
          per_page: tableParams.perPage,
          search: searchQuery,
          order: tableParams.order,
        },
        handleSuccess: detailResponse => {
          if (!isMounted.current) return;
          const payload = detailResponse.data || detailResponse;
          setReportData(payload);
          setStatus(STATUS.RESOLVED);
        },
        handleError: err => {
          if (isMounted.current) {
            setError(err);
            setStatus(STATUS.ERROR);
          }
        },
      })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportSummaryId, tableParams.page, tableParams.perPage, tableParams.order, searchQuery, dispatch]);

  // eslint-disable-next-line camelcase
  const pagedEntries = reportData?.preupgrade_report_entries || [];

  const toggleRowExpansion = (id, isExpanding) => {
    setExpandedRowIds(prev => {
      const newSet = new Set(prev);
      if (isExpanding) newSet.add(id);
      else newSet.delete(id);
      return newSet;
    });
  };

  const areAllRowsExpanded =
    pagedEntries.length > 0 &&
    pagedEntries.every(entry => expandedRowIds.has(entry.id));

  const handleExpandAll = () => {
    setExpandedRowIds(() => {
      if (areAllRowsExpanded) return new Set();
      return new Set(pagedEntries.map(e => e.id));
    });
  };

  if (!isLeappJob) return null;

  return (
    <ExpandableSection
      className="leapp-report-section"
      isExpanded={isReportExpanded}
      onToggle={(_event, val) => setIsReportExpanded(val)}
      toggleText={__('Leapp preupgrade report')}
    >
      <Toolbar id="leapp-report-toolbar" className="pf-u-p-0">
        <ToolbarContent>
          <ToolbarItem variant="search-filter">
            <SearchInput
              aria-label={__('Search reports')}
              onChange={(_event, value) => handleSearchChange(value)}
              value={searchValue}
              onClear={() => handleSearchChange('')}
              placeholder={__('Search...')}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      <Table
        ouiaId="leapp-report-table"
        columns={columns}
        params={tableParams}
        setParams={handleParamsChange}
        results={pagedEntries}
        itemCount={reportData?.subtotal || 0} // Ensure view returns this
        url=""
        isPending={status === STATUS.PENDING}
        errorMessage={status === STATUS.ERROR && error?.message ? error.message : null}
        showCheckboxes={false}
        refreshData={() => {}}
        isDeleteable={false}
        emptyMessage={
          searchQuery 
            ? __('No results found for the search criteria.') 
            : __('The preupgrade report shows no issues.')
        }
        childrenOutsideTbody
        onExpandAll={handleExpandAll}
        areAllRowsExpanded={!areAllRowsExpanded}
      >
        {pagedEntries.map((entry, rowIndex) => {
          const isRowExpanded = expandedRowIds.has(entry.id);
          return (
            <Tbody key={entry.id} isExpanded={isRowExpanded}>
              <Tr ouiaId={`table-row-${rowIndex}`}>
                <Td
                  expand={{
                    rowIndex,
                    isExpanded: isRowExpanded,
                    onToggle: (_event, _rowIndex, isOpen) => toggleRowExpansion(entry.id, isOpen),
                  }}
                />
                {Object.keys(columns).map(key => (
                  <Td key={key} dataLabel={columns[key].title}>
                    {columns[key].wrapper ? columns[key].wrapper(entry) : entry[key]}
                  </Td>
                ))}
              </Tr>
              <Tr isExpanded={isRowExpanded} ouiaId={`table-row-details-${rowIndex}`}>
                <Td colSpan={Object.keys(columns).length + 1}>
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
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    template_name: PropTypes.string,
  }),
};

PreupgradeReportsTable.defaultProps = {
  data: {},
};

export default PreupgradeReportsTable;
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { ExpandableSection, Tooltip } from '@patternfly/react-core';
import { ExpandableRowContent, Tbody, Td, Tr } from '@patternfly/react-table';
import { translate as __ } from 'foremanReact/common/I18n';
import { Table } from 'foremanReact/components/PF4/TableIndexPage/Table/Table';
import { getColumnHelpers } from 'foremanReact/components/PF4/TableIndexPage/Table/helpers';
import { APIActions } from 'foremanReact/redux/API';
import { STATUS } from 'foremanReact/constants';
import { entriesPage } from '../PreupgradeReports/PreupgradeReportsHelpers';
import ReportDetails, { renderSeverityLabel } from './ReportDetails';

const PreupgradeReportsTable = ({ data = {} }) => {
  const [error, setError] = useState(null);

  const [isReportExpanded, setIsReportExpanded] = useState(false); // Outer expansion state (Leapp Report Section)
  const [pagination, setPagination] = useState({ page: 1, perPage: 5 });
  const [reportData, setReportData] = useState(null);
  const [status, setStatus] = useState(STATUS.RESOLVED);
  const [expandedRowIds, setExpandedRowIds] = useState(new Set()); // Inner table expansion state (Rows)

  const dispatch = useDispatch();
  // eslint-disable-next-line camelcase
  const isLeappJob = data?.template_name?.includes('Run preupgrade via Leapp');

  const columns = {
    title: {
      title: __('Title'),
    },
    host: {
      title: __('Host'),
      wrapper: entry =>
        entry.hostname || (reportData && reportData.hostname) || '-',
    },
    risk_factor: {
      title: __('Risk Factor'),
      wrapper: ({ severity }) => renderSeverityLabel(severity),
    },
    has_remediation: {
      title: __('Has Remediation?'),
      wrapper: entry =>
        entry.detail && entry.detail.remediations ? __('Yes') : __('No'),
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
    },
  };

  useEffect(() => {
    let isMounted = true;
    if (!isLeappJob || !isReportExpanded || reportData) {
      return undefined;
    }
    setStatus(STATUS.PENDING);

    dispatch(
      APIActions.get({
        key: `GET_LEAPP_REPORT_LIST_${data.id}`,
        url: `/api/job_invocations/${data.id}/preupgrade_reports`,
        handleSuccess: listResponse => {
          if (!isMounted) return;
          const listPayload = listResponse.data || listResponse;
          const summary = listPayload.results?.[0];
          if (summary?.id) {
            dispatch(
              APIActions.get({
                key: `GET_LEAPP_REPORT_DETAIL_${summary.id}`,
                url: `/api/preupgrade_reports/${summary.id}`,
                handleSuccess: detailResponse => {
                  if (isMounted) {
                    const detailPayload = detailResponse.data || detailResponse;
                    setReportData(detailPayload);
                    setStatus(STATUS.RESOLVED);
                  }
                },
                handleError: err => {
                  if (isMounted) {
                    setError(err);
                    setStatus(STATUS.ERROR);
                  }
                },
              })
            );
          } else if (isMounted) {
            setReportData({});
            setStatus(STATUS.RESOLVED);
          }
        },
        handleError: err => {
          if (isMounted) {
            setError(err);
            setStatus(STATUS.ERROR);
          }
        },
      })
    );

    return () => {
      isMounted = false;
    };
  }, [isReportExpanded, data.id, isLeappJob, reportData, dispatch]);

  // eslint-disable-next-line camelcase
  const entries = reportData?.preupgrade_report_entries || [];
  const pagedEntries = entriesPage(entries, pagination);

  const handleParamsChange = newParams => {
    setPagination(prev => ({
      ...prev,
      page: newParams.page || prev.page,
      perPage: newParams.per_page || prev.perPage,
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
    pagedEntries.length > 0 &&
    pagedEntries.every(entry => expandedRowIds.has(entry.id));

  const onExpandAll = () => {
    setExpandedRowIds(() => {
      if (areAllRowsExpanded) {
        return new Set();
      }
      return new Set(pagedEntries.map(e => e.id));
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
      <Table
        ouiaId="leapp-report-table"
        columns={columns}
        isEmbedded
        params={{
          page: pagination.page,
          perPage: pagination.perPage,
          order: '',
        }}
        results={pagedEntries}
        itemCount={entries.length}
        url=""
        isPending={status === STATUS.PENDING}
        errorMessage={
          status === STATUS.ERROR && error?.message ? error.message : null
        }
        showCheckboxes={false}
        refreshData={() => {}}
        isDeleteable={false}
        emptyMessage={__('The preupgrade report shows no issues.')}
        setParams={handleParamsChange}
        childrenOutsideTbody
        onExpandAll={onExpandAll}
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
              <Tr isExpanded={isRowExpanded} ouiaId={`table-row-details-${rowIndex}`}>
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

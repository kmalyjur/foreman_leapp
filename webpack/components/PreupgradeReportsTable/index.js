/* eslint-disable max-lines */
import PropTypes from 'prop-types';
import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { useDispatch } from 'react-redux';
import {
  Button,
  ExpandableSection,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';
import { ExpandableRowContent, Tbody, Td, Tr } from '@patternfly/react-table';
import { translate as __ } from 'foremanReact/common/I18n';
import { foremanUrl } from 'foremanReact/common/helpers';
import { Table } from 'foremanReact/components/PF4/TableIndexPage/Table/Table';
import SelectAllCheckbox from 'foremanReact/components/PF4/TableIndexPage/Table/SelectAllCheckbox';
import { useBulkSelect } from 'foremanReact/components/PF4/TableIndexPage/Table/TableHooks';
import { RowSelectTd } from 'foremanReact/components/PF4/TableIndexPage/RowSelectTd';
import { getColumnHelpers } from 'foremanReact/components/PF4/TableIndexPage/Table/helpers';
import { getControllerSearchProps, STATUS } from 'foremanReact/constants';
import SearchBar from 'foremanReact/components/SearchBar';
import { APIActions } from 'foremanReact/redux/API';
import { usePreupgradeTableState } from './PreupgradeReportsTableHelpers';
import ReportDetails, { renderSeverityLabel } from './ReportDetails';
import './PreupgradeReportsTable.scss';

const entryWithFixKind = kind => entry =>
  entry.detail &&
  entry.detail.remediations &&
  entry.detail.remediations.some(remediation => remediation.type === kind);

const entryFixable = entryWithFixKind('command');

const isRowFixable = entryFixable;

const submitJobInvocation = (
  dispatch,
  setError,
  feature,
  hostIds,
  remediationIds,
  setIsSubmitting
) => {
  setError(null);
  setIsSubmitting(true);

  const payload = {
    job_invocation: {
      feature,
      host_ids: hostIds,
      ...(remediationIds != null
        ? { inputs: { remediation_ids: remediationIds } }
        : {}),
    },
  };

  dispatch(
    APIActions.post({
      key: `CREATE_JOB_INVOCATION_${feature}`,
      url: foremanUrl('/api/job_invocations'),
      params: payload,
      handleSuccess: response => {
        const result = response.data || response;
        if (result?.id) {
          window.location.assign(foremanUrl(`/job_invocations/${result.id}`));
        } else {
          setIsSubmitting(false);
        }
      },
      handleError: err => {
        setError(err);
        setIsSubmitting(false);
      },
    })
  );
};

const PreupgradeReportsTable = ({ data = {} }) => {
  const [isReportExpanded, setIsReportExpanded] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fixableCount, setFixableCount] = useState(null);
  const dispatch = useDispatch();
  const hasLoadedDataRef = useRef(false);

  const {
    isLeappJob,
    status,
    error,
    reportId,
    rows,
    totalCount,
    pagination,
    sortBy,
    searchValue,
    setSearchValue,
    setPagination,
    setSortBy,
    expandedRowIds,
    toggleRowExpansion,
    areAllRowsExpanded,
    onExpandAll,
  } = usePreupgradeTableState(data, isReportExpanded);

  useEffect(() => {
    if (totalCount > 0 && !hasLoadedDataRef.current) {
      hasLoadedDataRef.current = true;
    }
  }, [totalCount]);
  const hasData = totalCount > 0 || hasLoadedDataRef.current;

  useEffect(() => {
    setFixableCount(null);
  }, [searchValue, reportId]);

  const searchProps = useMemo(() => {
    if (!reportId) return null;
    const baseProps = getControllerSearchProps('preupgrade_report_entries');
    return {
      ...baseProps,
      autocomplete: {
        ...baseProps.autocomplete,
        url: foremanUrl(
          `/api/v2/preupgrade_reports/${reportId}/preupgrade_report_entries/auto_complete_search`
        ),
      },
    };
  }, [reportId]);

  const columns = useMemo(
    () => ({
      title: {
        title: __('Title'),
        isSorted: true,
        width: 30,
      },
      hostname: {
        title: __('Host'),
        wrapper: e => e.hostname || '-',
        isSorted: true,
        width: 20,
      },
      risk_factor: {
        title: __('Risk Factor'),
        wrapper: ({ severity }) => renderSeverityLabel(severity),
        isSorted: true,
        width: 15,
      },
      has_remediation: {
        title: __('Has Remediation?'),
        wrapper: e => (e.detail?.remediations ? __('Yes') : __('No')),
        isSorted: true,
        width: 20,
      },
      inhibitor: {
        title: __('Inhibitor?'),
        wrapper: e =>
          e.flags?.includes('inhibitor') ? (
            <Tooltip content={__('This issue inhibits the upgrade.')}>
              <span>{__('Yes')}</span>
            </Tooltip>
          ) : (
            __('No')
          ),
        isSorted: true,
        width: 15,
      },
    }),
    []
  );

  const pagedFixableEntries = useMemo(() => rows.filter(isRowFixable), [rows]);

  const {
    inclusionSet,
    exclusionSet,
    selectedCount,
    ...selectAllOptions
  } = useBulkSelect({
    results: pagedFixableEntries,
    metadata: {
      total: totalCount,
      page: pagination.page,
      selectable: fixableCount,
    },
    initialSearchQuery: searchValue,
  });

  const {
    selectAll: originalSelectAll,
    selectPage,
    selectNone,
    selectOne,
    areAllRowsSelected,
    isSelected,
  } = selectAllOptions;

  const selectAll = useCallback(
    (...args) => {
      // Get count of all fixable entries before selecting
      if (fixableCount === null) {
        dispatch(
          APIActions.get({
            key: `GET_FIXABLE_COUNT_${reportId}`,
            url: `/api/v2/preupgrade_reports/${reportId}/preupgrade_report_entries`,
            params: {
              search: [searchValue, 'fix_type = command']
                .filter(Boolean)
                .join(' AND '),
              per_page: 0,
            },
            handleSuccess: res => {
              const payload = res.data || res;
              const count = payload.subtotal ?? 0;
              setFixableCount(count);
              originalSelectAll(...args);
            },
            handleError: () => {
              setFixableCount(0);
            },
          })
        );
      } else {
        originalSelectAll(...args);
      }
    },
    [dispatch, reportId, searchValue, fixableCount, originalSelectAll]
  );

  const selectedIds = Array.from(inclusionSet);

  const areAllPageFixableSelected =
    pagedFixableEntries.length > 0 &&
    pagedFixableEntries.every(e => inclusionSet.has(e.id));

  // eslint-disable-next-line camelcase
  const globalHostId = data?.targeting?.host_id;

  const getHostId = useCallback(
    // eslint-disable-next-line camelcase
    entry => entry.host_id || entry.hostId || globalHostId,
    [globalHostId]
  );

  const hostIdsForSelected = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .filter(e => selectedIds.includes(e.id))
            .map(getHostId)
            .filter(Boolean)
        )
      ),
    [rows, selectedIds, getHostId]
  );

  const allHostIds = useMemo(
    () => Array.from(new Set(rows.map(getHostId).filter(Boolean))),
    [rows, getHostId]
  );

  const handleParamsChange = useCallback(
    newParams => {
      let sortChanged = false;
      if (newParams.order !== undefined) {
        const parts = newParams.order.split(' ');
        const newIndex = parts[0] || '';
        const newDirection = (parts[1] || 'ASC').toLowerCase();
        sortChanged =
          newIndex !== sortBy.index || newDirection !== sortBy.direction;
        if (sortChanged)
          setSortBy({ index: newIndex, direction: newDirection });
      }

      let newPage = pagination.page;
      if (sortChanged) {
        newPage = 1;
      } else if (newParams.page !== undefined) {
        newPage = Number(newParams.page);
      }

      // eslint-disable-next-line camelcase
      const newPerPage =
        newParams.per_page !== undefined
          ? Number(newParams.per_page)
          : pagination.perPage;

      setPagination({ page: newPage, perPage: newPerPage });
    },
    [sortBy, pagination, setSortBy, setPagination]
  );

  const commitSearch = val => {
    setSubmitError(null);
    setSearchValue(val);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFixSelected = () => {
    if (areAllRowsSelected() || exclusionSet.size > 0) {
      setSubmitError(null);
      setIsSubmitting(true);

      dispatch(
        APIActions.post({
          key: `BULK_REMEDIATE_${reportId}`,
          url: foremanUrl(
            `/api/v2/preupgrade_reports/${reportId}/preupgrade_report_entries/bulk_remediate`
          ),
          params: {
            search: searchValue,
            excluded_ids: Array.from(exclusionSet),
          },
          handleSuccess: response => {
            const result = response.data || response;
            if (result?.id) {
              window.location.assign(
                foremanUrl(`/job_invocations/${result.id}`)
              );
            } else {
              setIsSubmitting(false);
            }
          },
          handleError: err => {
            setSubmitError(err);
            setIsSubmitting(false);
          },
        })
      );
    } else {
      if (selectedIds.length === 0) return;

      const hostIds =
        hostIdsForSelected.length > 0
          ? hostIdsForSelected
          : [globalHostId].filter(Boolean);

      submitJobInvocation(
        dispatch,
        setSubmitError,
        'leapp_remediation_plan',
        hostIds,
        selectedIds.join(','),
        setIsSubmitting
      );
    }
  };

  const handleRunUpgrade = () => {
    const targetHostIds = globalHostId ? [globalHostId] : allHostIds;
    submitJobInvocation(
      dispatch,
      setSubmitError,
      'leapp_upgrade',
      targetHostIds,
      null,
      setIsSubmitting
    );
  };

  const [columnKeys, keysToColumnNames] = useMemo(
    () => getColumnHelpers(columns),
    [columns]
  );

  if (!isLeappJob) return null;

  const hasAnySelection =
    areAllRowsSelected() || exclusionSet.size > 0 || selectedIds.length > 0;

  const isFixSelectedDisabled =
    status === STATUS.PENDING ||
    isSubmitting ||
    !hasAnySelection ||
    // When using select-all, check if any fixable entries exist on current page
    (areAllRowsSelected() && pagedFixableEntries.length === 0);

  const isRunUpgradeDisabled =
    status === STATUS.PENDING ||
    isSubmitting ||
    (!globalHostId && allHostIds.length === 0);

  const combinedErrorMessage =
    (status === STATUS.ERROR && error?.message ? error.message : null) ||
    submitError?.message ||
    submitError?.error;

  return (
    <ExpandableSection
      className="leapp-report-section"
      isExpanded={isReportExpanded}
      onToggle={(_e, val) => setIsReportExpanded(val)}
      toggleText={__('Leapp preupgrade report')}
    >
      <Toolbar ouiaId="leapp-report-toolbar">
        <ToolbarContent>
          <ToolbarGroup
            variant="filter-group"
            className="leapp-toolbar-filter-group"
          >
            {hasData && (
              <ToolbarItem spacer={{ default: 'spacerNone' }}>
                <SelectAllCheckbox
                  selectAll={selectAll}
                  selectPage={selectPage}
                  selectNone={selectNone}
                  selectedCount={selectedCount}
                  pageRowCount={pagedFixableEntries.length}
                  totalCount={fixableCount}
                  areAllRowsOnPageSelected={areAllPageFixableSelected}
                  areAllRowsSelected={areAllRowsSelected()}
                />
              </ToolbarItem>
            )}

            {reportId && searchProps && (
              <ToolbarItem className="leapp-searchbar-item">
                <SearchBar
                  data={searchProps}
                  searchQuery={searchValue}
                  onSearch={commitSearch}
                  bookmarks={searchProps.bookmarks}
                />
              </ToolbarItem>
            )}
          </ToolbarGroup>

          <ToolbarGroup
            align={{ default: 'alignRight' }}
            variant="button-group"
          >
            <ToolbarItem>
              <Button
                variant="secondary"
                isDisabled={isFixSelectedDisabled}
                onClick={handleFixSelected}
                ouiaId="fix-selected-button"
                isLoading={isSubmitting}
              >
                {__('Fix Selected')}
              </Button>
            </ToolbarItem>
            <ToolbarItem>
              <Button
                variant="primary"
                isDisabled={isRunUpgradeDisabled}
                onClick={handleRunUpgrade}
                ouiaId="run-upgrade-button"
                isLoading={isSubmitting}
              >
                {__('Run Upgrade')}
              </Button>
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
      </Toolbar>

      <Table
        ouiaId="leapp-report-table"
        columns={columns}
        isEmbedded
        params={{
          page: pagination.page,
          per_page: pagination.perPage,
          search: searchValue,
          order: sortBy.index
            ? `${sortBy.index} ${sortBy.direction.toUpperCase()}`
            : '',
        }}
        results={rows}
        itemCount={totalCount}
        url=""
        isPending={status === STATUS.PENDING}
        errorMessage={combinedErrorMessage}
        showCheckboxes
        refreshData={() => {}}
        isDeleteable={false}
        emptyMessage={
          searchValue
            ? __('No results found for your search.')
            : __('The preupgrade report shows no issues.')
        }
        setParams={handleParamsChange}
        childrenOutsideTbody
        onExpandAll={onExpandAll}
        areAllRowsExpanded={!areAllRowsExpanded}
      >
        {rows.map((entry, rowIndex) => {
          const rowKey = entry.id
            ? `entry-${entry.id}`
            : `entry-row-${rowIndex}`;
          const isRowExpanded = expandedRowIds.has(entry.id);
          return (
            <Tbody
              key={rowKey}
              isExpanded={isRowExpanded}
              className={isRowExpanded ? 'leapp-expanded-tbody' : ''}
            >
              <Tr ouiaId={`table-row-${rowIndex}`}>
                <Td
                  expand={{
                    rowIndex,
                    isExpanded: isRowExpanded,
                    onToggle: (_e, _idx, isOpen) =>
                      toggleRowExpansion(entry.id, isOpen),
                  }}
                />
                <RowSelectTd
                  rowData={entry}
                  selectOne={selectOne}
                  isSelected={id => isRowFixable(entry) && isSelected(id)}
                  isSelectable={isRowFixable}
                />
                {columnKeys.map(key => (
                  <Td
                    key={`${rowKey}-col-${key}`}
                    dataLabel={keysToColumnNames[key]}
                  >
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
                <Td colSpan={columnKeys.length + 2}>
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
    // eslint-disable-next-line camelcase
    template_name: PropTypes.string,
    // eslint-disable-next-line camelcase
    status_label: PropTypes.string,
    targeting: PropTypes.shape({
      host_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
  }),
};

PreupgradeReportsTable.defaultProps = {
  data: {},
};

export default PreupgradeReportsTable;

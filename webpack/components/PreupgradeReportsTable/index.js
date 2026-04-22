/* eslint-disable max-lines */
import PropTypes from 'prop-types';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { entryFixable } from '../PreupgradeReports/PreupgradeReportsHelpers';
import ReportDetails, { renderSeverityLabel } from './ReportDetails';
import './PreupgradeReportsTable.scss';

const isRowFixable = entryFixable;

const submitJobInvocation = (
  dispatch,
  setError,
  feature,
  hostIds,
  remediationIds
) => {
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
        }
      },
      handleError: err => setError(err),
    })
  );
};

const PreupgradeReportsTable = ({ data = {} }) => {
  const [isReportExpanded, setIsReportExpanded] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [submitError, setSubmitError] = useState(null);
  const dispatch = useDispatch();

  const {
    isLeappJob,
    status,
    error,
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
    allFilteredRows = rows,
  } = usePreupgradeTableState(data, isReportExpanded);

  const searchProps = useMemo(() => {
    const props = getControllerSearchProps('preupgrade_report_entries');
    return {
      ...props,
      autocomplete: {
        ...props.autocomplete,
        url: foremanUrl('/preupgrade_report_entries/auto_complete_search'),
      },
    };
  }, []);

  useEffect(() => {
    setSearchInput(searchValue);
  }, [searchValue]);

  const columns = {
    title: { title: __('Title'), isSorted: true },
    hostname: {
      title: __('Host'),
      wrapper: e => e.hostname || '-',
      isSorted: true,
    },
    severity: {
      title: __('Risk Factor'),
      wrapper: ({ severity }) => renderSeverityLabel(severity),
      isSorted: true,
    },
    has_remediation: {
      title: __('Has Remediation?'),
      isSorted: false,
      wrapper: e => (e.detail?.remediations ? __('Yes') : __('No')),
    },
    inhibitor: {
      title: __('Inhibitor?'),
      isSorted: false,
      wrapper: e =>
        e.flags?.includes('inhibitor') ? (
          <Tooltip content={__('This issue inhibits the upgrade.')}>
            <span>{__('Yes')}</span>
          </Tooltip>
        ) : (
          __('No')
        ),
    },
  };

  const { inclusionSet, exclusionSet, ...selectAllOptions } = useBulkSelect({
    results: rows,
    metadata: {
      total: totalCount,
      page: pagination.page,
      selectable: totalCount,
    },
    initialSearchQuery: '',
  });

  const {
    selectAll,
    selectPage,
    selectNone,
    selectOne,
    areAllRowsSelected,
    isSelected,
  } = selectAllOptions;

  const validFixableIds = useMemo(
    () => allFilteredRows.filter(isRowFixable).map(e => e.id),
    [allFilteredRows]
  );

  const rawSelectedIds =
    areAllRowsSelected() || exclusionSet.size > 0
      ? allFilteredRows.map(e => e.id).filter(id => !exclusionSet.has(id))
      : Array.from(inclusionSet);

  const selectedIds = useMemo(
    () => rawSelectedIds.filter(id => validFixableIds.includes(id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawSelectedIds.join(','), validFixableIds]
  );

  const pagedFixableEntries = useMemo(() => rows.filter(isRowFixable), [rows]);

  const areAllPageFixableSelected =
    pagedFixableEntries.length > 0 &&
    pagedFixableEntries.every(e => selectedIds.includes(e.id));

  const areAllFixableSelected =
    validFixableIds.length > 0 &&
    validFixableIds.every(id => selectedIds.includes(id));

  const getHostId = useCallback(
    entry => entry.host_id || entry.hostId || data?.targeting?.host_id,
    [data]
  );

  const hostIdsForSelected = useMemo(
    () =>
      Array.from(
        new Set(
          allFilteredRows
            .filter(e => selectedIds.includes(e.id))
            .map(getHostId)
            .filter(Boolean)
        )
      ),
    [allFilteredRows, selectedIds, getHostId]
  );

  const allHostIds = useMemo(
    () => Array.from(new Set(allFilteredRows.map(getHostId).filter(Boolean))),
    [allFilteredRows, getHostId]
  );

  const handleParamsChange = newParams => {
    let sortChanged = false;
    if (newParams.order !== undefined) {
      const parts = newParams.order.split(' ');
      const newIndex = parts[0] || '';
      const newDirection = (parts[1] || 'ASC').toLowerCase();

      sortChanged =
        newIndex !== sortBy.index || newDirection !== sortBy.direction;

      if (sortChanged) {
        setSortBy({ index: newIndex, direction: newDirection });
      }
    }

    setPagination({
      page: sortChanged
        ? 1
        : newParams.page !== undefined
        ? Number(newParams.page)
        : pagination.page,
      perPage:
        newParams.per_page !== undefined
          ? Number(newParams.per_page)
          : pagination.perPage,
    });
  };

  const commitSearch = val => {
    setSearchValue(val);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const [columnKeys, keysToColumnNames] = getColumnHelpers(columns);

  if (!isLeappJob) return null;

  const isFixSelectedDisabled =
    validFixableIds.length === 0 ||
    selectedIds.length === 0 ||
    hostIdsForSelected.length === 0;

  const combinedErrorMessage =
    (status === STATUS.ERROR && error?.message ? error.message : null) ||
    submitError?.message;

  return (
    <ExpandableSection
      className="leapp-report-section"
      isExpanded={isReportExpanded}
      onToggle={(_e, val) => setIsReportExpanded(val)}
      toggleText={__('Leapp preupgrade report')}
    >
      <SearchBar
        data={searchProps}
        searchQuery={searchInput}
        onSearch={commitSearch}
        onChange={val => setSearchInput(val)}
        bookmarks={searchProps.bookmarks}
      />

      {totalCount > 0 && status === STATUS.RESOLVED && (
        <Toolbar ouiaId="leapp-report-toolbar">
          <ToolbarContent>
            <ToolbarGroup variant="filter-group">
              <ToolbarItem>
                <SelectAllCheckbox
                  selectAll={selectAll}
                  selectPage={selectPage}
                  selectNone={selectNone}
                  selectedCount={selectedIds.length}
                  pageRowCount={pagedFixableEntries.length}
                  totalCount={validFixableIds.length}
                  areAllRowsOnPageSelected={areAllPageFixableSelected}
                  areAllRowsSelected={areAllFixableSelected}
                />
              </ToolbarItem>
            </ToolbarGroup>
            <ToolbarGroup
              align={{ default: 'alignRight' }}
              variant="button-group"
            >
              <ToolbarItem>
                <Button
                  variant="secondary"
                  isDisabled={isFixSelectedDisabled}
                  onClick={() =>
                    submitJobInvocation(
                      dispatch,
                      setSubmitError,
                      'leapp_remediation_plan',
                      hostIdsForSelected,
                      selectedIds.join(',')
                    )
                  }
                  ouiaId="fix-selected-button"
                >
                  {__('Fix Selected')}
                </Button>
              </ToolbarItem>
              <ToolbarItem>
                <Button
                  variant="primary"
                  isDisabled={allHostIds.length === 0}
                  onClick={() =>
                    submitJobInvocation(
                      dispatch,
                      setSubmitError,
                      'leapp_upgrade',
                      allHostIds
                    )
                  }
                  ouiaId="run-upgrade-button"
                >
                  {__('Run Upgrade')}
                </Button>
              </ToolbarItem>
            </ToolbarGroup>
          </ToolbarContent>
        </Toolbar>
      )}

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
        page={pagination.page}
        perPage={pagination.perPage}
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
          const isRowExpanded = expandedRowIds.has(entry.id);
          return (
            <Tbody
              key={entry.id}
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
    template_name: PropTypes.string,
    targeting: PropTypes.shape({
      host_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
  }),
};

PreupgradeReportsTable.defaultProps = {
  data: {},
};

export default PreupgradeReportsTable;

import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { ExpandableSection, Label, Tooltip } from '@patternfly/react-core';
import { translate as __ } from 'foremanReact/common/I18n';
import { Table } from 'foremanReact/components/PF4/TableIndexPage/Table/Table';
import { APIActions } from 'foremanReact/redux/API';
import { STATUS } from 'foremanReact/constants';

import { entriesPage } from '../PreupgradeReports/PreupgradeReportsHelpers';

const renderSeverityLabel = severity => {
  switch (severity) {
    case 'high':
      return <Label color="red">{__('High')}</Label>;
    case 'medium':
      return <Label color="orange">{__('Medium')}</Label>;
    case 'low':
      return <Label color="blue">{__('Low')}</Label>;
    case 'info':
      return <Label color="grey">{__('Info')}</Label>;
    default:
      return <Label color="grey">{severity || __('Info')}</Label>;
  }
};

const PreupgradeReportsTable = ({ data = {} }) => {
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, perPage: 5 });
  const [reportData, setReportData] = useState(null);
  const [status, setStatus] = useState(STATUS.RESOLVED);
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
    if (!isLeappJob || !isExpanded || reportData) {
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
  }, [isExpanded, data.id, isLeappJob, reportData, dispatch]);

  // eslint-disable-next-line camelcase
  const entries = reportData?.preupgrade_report_entries || [];
  const pagedEntries = entriesPage(entries, pagination);

  const handleParamsChange = newParams => {
    setPagination(prev => ({
      ...prev,
      page: newParams.page || prev.page,
      perPage: newParams.per_page || prev.perPage,
    }));
  };

  if (!isLeappJob) return null;

  return (
    <ExpandableSection
      className="leapp-report-section"
      isExpanded={isExpanded}
      onToggle={(_event, val) => setIsExpanded(val)}
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
      />
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

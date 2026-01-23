import React, { useState } from 'react';
import MessageBox from 'foremanReact/components/common/MessageBox';
import { LoadingState, Row } from 'patternfly-react';
import PropTypes from 'prop-types';
import { sprintf, translate as __ } from 'foremanReact/common/I18n';

import PreupgradeReportsList from '../PreupgradeReportsList';
import UpgradeAllButton from './components/UpgradeAllButton';
import EntriesFilter from './components/EntriesFilter';
import FixSelectedButton from './components/FixSelectedButton';

import {
  flattenEntries,
  isEmpty,
  anyEntriesFixable,
  filterEntries,
  idsForInvocationFromEntries,
  sortEntries,
  fixableEntries,
} from './PreupgradeReportsHelpers';

import NoReports from './components/NoReports';

const PreupgradeReports = ({
  preupgradeReports,
  csrfToken,
  newJobInvocationUrl,
}) => {
  const [filterType, setFilterType] = useState('title');
  const [filterValue, setFilterValue] = useState('');
  const [checked, setChecked] = useState([]);
  const [sort, setSort] = useState({ attribute: '', order: 'desc' });

  const onFilterValueChange = value => {
    setFilterValue(value);
  };

  const onFilterValueClear = () => setFilterValue('');

  const onFilterTypeChange = value => {
    onFilterValueClear();
    setFilterType(value);
  };

  const isSelected = entry => checked.some(item => item.id === entry.id);

  const anySelected = checked.length > 0;

  const toggleSelected = (entry, isEntrySelected) => {
    if (isEntrySelected) {
      setChecked(checked.filter(item => item.id !== entry.id));
    } else {
      setChecked([entry, ...checked]);
    }
  };

  const toggleSelectAll = () => {
    const allFixable = fixableEntries(preupgradeReports);

    if (checked.length === allFixable.length) {
      setChecked([]);
    } else {
      setChecked(allFixable);
    }
  };

  const changeSort = value => {
    setSort({ ...sort, ...value });
  };

  return (
    <React.Fragment>
      <Row>
        <div className="col-md-8">
          <EntriesFilter
            filterType={filterType}
            onFilterTypeChange={onFilterTypeChange}
            filterValue={filterValue}
            onFilterValueChange={onFilterValueChange}
          />
        </div>
        <div className="col-md-4">
          <div className="btn-toolbar pull-right">
            <FixSelectedButton
              postUrl={newJobInvocationUrl}
              disabled={!anyEntriesFixable(preupgradeReports) || !anySelected}
              csrfToken={csrfToken}
              ids={idsForInvocationFromEntries(checked)}
            />
            <UpgradeAllButton
              postUrl={newJobInvocationUrl}
              csrfToken={csrfToken}
              preupgradeReports={preupgradeReports}
            />
          </div>
        </div>
      </Row>
      <PreupgradeReportsList
        allEntries={filterEntries(
          filterType,
          filterValue,
          sortEntries(flattenEntries(preupgradeReports), sort)
        )}
        isSelected={isSelected}
        toggleSelected={toggleSelected}
        sort={sort}
        changeSort={changeSort}
        toggleSelectAll={toggleSelectAll}
      />
    </React.Fragment>
  );
};

const withLoadingState = Component => componentProps => {
  const { error, loading, preupgradeReports, reportsExpected } = componentProps;

  if (!isEmpty(error)) {
    return (
      <MessageBox
        key="preupgrade-reports-error"
        icontype="error-circle-o"
        msg={sprintf(__('Could not retrieve data: %(status)s - %(msg)s'), {
          status: error.statusText,
          msg: error.errorMsg,
        })}
      />
    );
  }

  return (
    <LoadingState loading={loading}>
      {preupgradeReports.length > 0 ? (
        <Component {...componentProps} />
      ) : (
        <NoReports reportsExpected={reportsExpected} />
      )}
    </LoadingState>
  );
};

PreupgradeReports.propTypes = {
  preupgradeReports: PropTypes.array.isRequired,
  csrfToken: PropTypes.string.isRequired,
  newJobInvocationUrl: PropTypes.string.isRequired,
};

export default withLoadingState(PreupgradeReports);

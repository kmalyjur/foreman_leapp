import React from 'react';
import { addGlobalFill } from 'foremanReact/components/common/Fill/GlobalFill';
import PreupgradeReportsTable from './components/PreupgradeReportsTable';

addGlobalFill(
  'job-invocation-additional-info',
  'leapp-preupgrade-report-fill',
  <PreupgradeReportsTable key="leapp-report-fill" />,
  100
);

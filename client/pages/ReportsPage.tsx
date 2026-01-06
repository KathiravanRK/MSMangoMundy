import React from 'react';
import Page from '../components/ui/Page';
import ReportGenerator from '../features/reports/ReportGenerator';

const ReportsPage: React.FC = () => {
  return (
    <Page>
      <ReportGenerator />
    </Page>
  );
};

export default ReportsPage;

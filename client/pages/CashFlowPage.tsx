import React from 'react';
import Page from '../components/ui/Page';
import CashFlowManager from '../features/cashflow/CashFlowManager';

const CashFlowPage: React.FC = () => {
  return (
    <Page>
      <CashFlowManager />
    </Page>
  );
};

export default CashFlowPage;

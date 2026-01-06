import React from 'react';
import Page from '../components/ui/Page';
import InvoicesManager from '../features/invoices/InvoicesManager';

const InvoicesPage: React.FC = () => {
  return (
    <Page>
      <InvoicesManager />
    </Page>
  );
};

export default InvoicesPage;

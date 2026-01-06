import React from 'react';
import Page from '../components/ui/Page';
import SupplierInvoicesManager from '../features/supplier_invoices/SupplierInvoicesManager';

const SupplierInvoicesPage: React.FC = () => {
  return (
    <Page>
        <SupplierInvoicesManager />
    </Page>
  );
};

export default SupplierInvoicesPage;

import React from 'react';
import Page from '../components/ui/Page';
import SuppliersList from '../features/suppliers/SuppliersList';

const SuppliersPage: React.FC = () => {
  return (
    <Page>
      <SuppliersList />
    </Page>
  );
};

export default SuppliersPage;

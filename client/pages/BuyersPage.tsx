import React from 'react';
import Page from '../components/ui/Page';
import BuyersList from '../features/buyers/BuyersList';

const BuyersPage: React.FC = () => {
  return (
    <Page>
      <BuyersList />
    </Page>
  );
};

export default BuyersPage;

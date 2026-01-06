import React from 'react';
import Page from '../components/ui/Page';
import AuctionList from '../features/auction/AuctionList';

const AuctionPage: React.FC = () => {
  return (
    <Page>
      <AuctionList />
    </Page>
  );
};

export default AuctionPage;

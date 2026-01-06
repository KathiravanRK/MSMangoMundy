import React from 'react';
import Page from '../components/ui/Page';
import EntriesList from '../features/entries/EntriesList';

const EntriesPage: React.FC = () => {
  return (
    <Page>
      <EntriesList />
    </Page>
  );
};

export default EntriesPage;

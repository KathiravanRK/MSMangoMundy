import React from 'react';
import Page from '../components/ui/Page';
import UsersList from '../features/settings/UsersList';

const UsersPage: React.FC = () => {
  return (
    <Page>
      <UsersList />
    </Page>
  );
};

export default UsersPage;

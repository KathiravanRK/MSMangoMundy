import React from 'react';
import Page from '../components/ui/Page';
import RolesList from '../features/settings/RolesList';

const RolesPage: React.FC = () => {
  return (
    <Page>
      <RolesList />
    </Page>
  );
};

export default RolesPage;

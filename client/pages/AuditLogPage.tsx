import React from 'react';
import Page from '../components/ui/Page';
import AuditLogViewer from '../features/audit/AuditLogViewer';

const AuditLogPage: React.FC = () => {
  return (
    <Page>
      <AuditLogViewer />
    </Page>
  );
};

export default AuditLogPage;

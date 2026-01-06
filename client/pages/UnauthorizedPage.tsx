import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-secondary-light flex items-center justify-center p-4">
        <Card className="text-center max-w-lg">
            <h1 className="text-5xl font-bold text-danger">403</h1>
            <h2 className="text-2xl font-semibold mt-4 text-on-surface">Access Denied</h2>
            <p className="mt-2 text-muted">
                You do not have the necessary permissions to view this page. Please contact your administrator if you believe this is an error.
            </p>
            <Link to="/" className="mt-6 inline-block">
                <Button>Return to Dashboard</Button>
            </Link>
        </Card>
    </div>
  );
};

export default UnauthorizedPage;

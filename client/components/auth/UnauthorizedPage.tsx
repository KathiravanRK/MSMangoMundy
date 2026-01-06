import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../ui/Card';

const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="text-center max-w-lg">
            <h1 className="text-5xl font-bold text-danger">403</h1>
            <h2 className="text-2xl font-semibold mt-4 text-dark">Access Denied</h2>
            <p className="mt-2 text-muted">
                You do not have the necessary permissions to view this page. Please contact your administrator if you believe this is an error.
            </p>
            <Link to="/" className="mt-6 inline-block bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-hover transition-colors">
                Return to Dashboard
            </Link>
        </Card>
    </div>
  );
};

export default UnauthorizedPage;

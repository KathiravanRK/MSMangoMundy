import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from './Button';
import { ICONS } from '../../constants';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background px-4">
                    <div className="max-w-md w-full bg-surface p-8 rounded-2xl shadow-glow-md text-center space-y-6 animate-fadeInUp">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-danger-light text-danger mb-4">
                            <span className="text-4xl">⚠️</span>
                        </div>
                        <h1 className="text-2xl font-bold text-on-surface">Something went wrong</h1>
                        <p className="text-muted">
                            We encountered an unexpected error. Please try refreshing the page or going back to the dashboard.
                        </p>
                        {this.state.error && (
                            <div className="p-4 bg-gray-50 rounded-lg text-left overflow-auto max-h-40">
                                <code className="text-xs text-danger">{this.state.error.toString()}</code>
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                            <Button
                                variant="primary"
                                className="flex-1"
                                onClick={() => window.location.reload()}
                                icon={ICONS.refresh}
                            >
                                Refresh Page
                            </Button>
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={this.handleReset}
                            >
                                Go to Dashboard
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

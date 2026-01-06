
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ICONS } from '../../constants';

interface HeaderProps {
    toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    
    const getPageTitle = () => {
        const path = location.pathname.split('/')[1] || '';
        if (path === '') return 'Dashboard';
        // Handle kebab-case and snake_case paths
        return path.replace(/[-_]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    }

    return (
        <header className="bg-surface/80 backdrop-blur-sm sticky top-0 z-30 w-full shadow-sm no-print">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <button
                            onClick={toggleSidebar}
                            className="text-muted mr-4 md:hidden"
                            aria-label="Open sidebar"
                        >
                            {ICONS.menu}
                        </button>
                        <h1 className="text-xl md:text-2xl font-semibold text-on-surface hidden sm:block">{getPageTitle()}</h1>
                    </div>
                     {user && (
                        <div className="flex items-center space-x-2 md:space-x-4">
                            <div className="relative">
                                <img className="h-10 w-10 rounded-full object-cover" src={`https://i.pravatar.cc/100?u=${user.id}`} alt="User avatar" />
                                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-success ring-2 ring-white"></span>
                            </div>
                            <div className="hidden sm:block text-right">
                                <p className="text-sm font-medium text-on-surface">{user.name}</p>
                                <p className="text-xs text-muted">{user.role?.name}</p>
                            </div>
                            <button onClick={handleLogout} className="p-2 rounded-full text-muted hover:bg-secondary-light hover:text-secondary-dark" title="Logout">
                                {ICONS.logout}
                            </button>
                        </div>
                     )}
                </div>
            </div>
        </header>
    );
};

export default Header;

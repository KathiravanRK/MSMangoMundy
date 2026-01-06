
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-transparent">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      {/* Main content area */}
      <div className="md:ml-64 flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile overlay */}
        {isSidebarOpen && (
            <div 
              onClick={() => setIsSidebarOpen(false)} 
              className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
              aria-hidden="true"
            ></div>
        )}
        
        <Header toggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-y-auto min-w-0">
          <div className="max-w-screen-2xl mx-auto p-4 md:p-6 lg:p-8 animate-fadeInUp">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;


import React from 'react';
import { NavLink } from 'react-router-dom';
import { ICONS } from '../../constants';
import { useAuth, usePermissions } from '../../contexts/AuthContext';
import { Feature } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const navLinksConfig = [
  { to: '/', text: 'Dashboard', icon: ICONS.dashboard, feature: Feature.Dashboard },
  { to: '/entries', text: 'Entries', icon: ICONS.entries, feature: Feature.Entries },
  { to: '/auction', text: 'Auction', icon: ICONS.auction, feature: Feature.Auction },
  { to: '/invoices', text: 'Buyer Invoices', icon: ICONS.invoices, feature: Feature.BuyerInvoices },
  { to: '/supplier-invoices', text: 'Supplier Invoices', icon: ICONS.invoices, feature: Feature.SupplierInvoices },
  { to: '/cashflow', text: 'Cash Flow', icon: ICONS.cash, feature: Feature.CashFlow },
  { to: '/reports', text: 'Reports', icon: ICONS.reports, feature: Feature.Reports },
  { to: '/buyers', text: 'Buyers', icon: ICONS.buyers, feature: Feature.Buyers },
  { to: '/suppliers', text: 'Suppliers', icon: ICONS.suppliers, feature: Feature.Suppliers },
  { to: '/products', text: 'Products', icon: ICONS.products, feature: Feature.Products },

  { type: 'divider', feature: Feature.Users },
  { to: '/users', text: 'Users', icon: ICONS.users, feature: Feature.Users },
  { to: '/roles', text: 'Roles & Permissions', icon: ICONS.roles, feature: Feature.Roles },
  { to: '/audit-log', text: 'Audit Log', icon: ICONS.audit, feature: Feature.AuditLog },
];

const NavItem: React.FC<{ to: string; icon: React.ReactNode; text: string; onClick: () => void; }> = ({ to, icon, text, onClick }) => (
  <li>
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center p-3 my-1 rounded-xl transition-all duration-300 group hover:translate-x-1 ${isActive
          ? 'bg-accent/10 border-r-4 border-accent text-accent font-bold shadow-sm'
          : 'text-muted hover:bg-slate-100 hover:text-on-surface'
        }`
      }
    >
      <span className="mr-3">{icon}</span>
      {text}
    </NavLink>
  </li>
);

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user } = useAuth();
  const { canView } = usePermissions();

  const handleLinkClick = () => {
    if (window.innerWidth < 768) { // md breakpoint
      setIsOpen(false);
    }
  }

  const filteredNavLinks = user ? navLinksConfig.filter(link => !link.feature || canView(link.feature)) : [];

  return (
    <>
      <div className={`fixed inset-0 z-40 md:hidden transition-opacity no-print ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black opacity-50 backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>
      </div>

      <aside className={`w-64 bg-surface/95 backdrop-blur-lg border-r border-border-color h-full flex flex-col shadow-lg fixed top-0 left-0 z-40 transform transition-transform duration-300 ease-in-out md:translate-x-0 no-print ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-border-color h-16">
          <div className="flex items-center">
            {ICONS.logo}
            <h1 className="text-xl font-bold text-on-surface ml-2">MS Mango Mundy</h1>
          </div>
          <button onClick={() => setIsOpen(false)} className="md:hidden text-muted hover:text-dark">
            {ICONS.close}
          </button>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto">
          <ul>
            {filteredNavLinks.map((link, index) =>
              'type' in link && link.type === 'divider' ? (
                <li key={`divider-${index}`} className="my-4 border-t border-border-color"></li>
              ) : 'to' in link ? (
                <NavItem key={link.to} to={link.to} icon={link.icon} text={link.text} onClick={handleLinkClick} />
              ) : null
            )}
          </ul>
        </nav>
        <div className="p-4 border-t border-border-color">
          <div className="p-4 bg-gradient-to-br from-primary-light to-blue-100 rounded-lg text-center">
            <h4 className="font-semibold text-primary-dark">Upgrade Plan</h4>
            <p className="text-xs text-primary-dark/80 mt-1">Unlock all features and get unlimited access.</p>
            <button className="mt-3 w-full bg-primary text-white text-sm font-medium py-2 rounded-md hover:bg-primary-hover transition transform hover:-translate-y-px">
              Upgrade Now
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

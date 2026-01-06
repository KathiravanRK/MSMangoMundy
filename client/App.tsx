
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// Layout and Auth
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Page Components
import DashboardPage from './pages/DashboardPage';
import EntriesPage from './pages/EntriesPage';
import AuctionPage from './pages/AuctionPage';
import BuyersPage from './pages/BuyersPage';
import BuyerDetailPage from './pages/BuyerDetailPage';
import SuppliersPage from './pages/SuppliersPage';
import SupplierDetailPage from './pages/SupplierDetailPage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import InvoicesPage from './pages/InvoicesPage';
import SupplierInvoicesPage from './pages/SupplierInvoicesPage';
import CashFlowPage from './pages/CashFlowPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import RolesPage from './pages/RolesPage';
import AuditLogPage from './pages/AuditLogPage';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import SupplierDraftInvoicePrintPage from './pages/SupplierDraftInvoicePrintPage';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* Public auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Standalone Protected Routes (Print views) */}
        <Route path="/supplier-draft-invoice/print" element={
          <ProtectedRoute>
            <SupplierDraftInvoicePrintPage />
          </ProtectedRoute>
        } />

        {/* All other routes are protected and within the Layout */}
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/entries" element={<EntriesPage />} />
                <Route path="/auction" element={<AuctionPage />} />
                <Route path="/buyers" element={<BuyersPage />} />
                <Route path="/buyers/:buyerId" element={<BuyerDetailPage />} />
                <Route path="/suppliers" element={<SuppliersPage />} />
                <Route path="/suppliers/:supplierId" element={<SupplierDetailPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/products/:productId" element={<ProductDetailPage />} />
                <Route path="/invoices" element={<InvoicesPage />} />
                <Route path="/supplier-invoices" element={<SupplierInvoicesPage />} />
                <Route path="/cashflow" element={<CashFlowPage />} />
                <Route path="/reports" element={<ReportsPage />} />

                {/* Admin-only routes */}
                <Route path="/roles" element={<RolesPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/audit-log" element={<AuditLogPage />} />

                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
};

export default App;

import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

const darkGradientRoutes = new Set([
  '/inventory/items',
  '/inventory/categories',
  '/inventory/expiry',
  '/inventory/logs',
  '/sales/customers',
  '/sales/proforma-invoices',
  '/sales/invoices',
  '/sales/delivery-notes',
  '/sales/invoice-history',
  '/sales/proforma-history',
  '/sales/payments',
  '/sales/reports',
  '/purchases/vendors',
  '/purchases/vendor-list',
  '/purchases/bills',
  '/purchases/payments-made',
  '/purchases/purchase-orders',
  '/purchases/purchase-received',
  '/purchases/vendor-credits',
  '/profile',
  '/organization-settings',
]);

const shipmentSurfaceRoutes = new Set([
  '/sales/delivery-notes',
  '/sales/invoice-history',
  '/sales/proforma-history',
  '/sales/returns',
]);

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const hasDarkGradientOverride = darkGradientRoutes.has(location.pathname);
  const hasShipmentSurfaceOverride = shipmentSurfaceRoutes.has(location.pathname);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className={`flex h-screen bg-gray-100 dark:bg-gray-900 ${hasDarkGradientOverride ? 'dark-gradient-page' : ''} ${hasShipmentSurfaceOverride ? 'dark-shipment-surface-page' : ''}`}>
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Top navigation */}
        <TopNavbar onMenuClick={toggleSidebar} />

        {/* Main content area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900">
          <div className="container mx-auto px-6 py-8">
            {children}
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default Layout; 
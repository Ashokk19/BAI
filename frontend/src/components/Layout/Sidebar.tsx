import React from 'react';
import { NavLink } from 'react-router-dom';
import APP_CONFIG from '@/config/app';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const menuItems = [
    {
      title: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v4H8V5z" />
        </svg>
      ),
      path: '/dashboard',
    },
    {
      title: 'Inventory',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M8 13v4m8-4v4" />
        </svg>
      ),
      path: '/inventory',
      subItems: [
        { title: 'Items List', path: '/inventory/items' },
        { title: 'Item Categories', path: '/inventory/categories' },
        { title: 'Expiry Tracking', path: '/inventory/expiry' },
        { title: 'Inventory Log', path: '/inventory/logs' },
      ],
    },
    {
      title: 'Sales',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      path: '/sales',
      subItems: [
        { title: 'Customers List', path: '/sales/customers' },
        { title: 'Proforma Invoice', path: '/sales/proforma-invoices' },
        { title: 'Tax Invoice', path: '/sales/invoices' },
        { title: 'Delivery Note', path: '/sales/delivery-notes' },
        { title: 'Invoice History', path: '/sales/invoice-history' },
        { title: 'Proforma History', path: '/sales/proforma-history' },
        { title: 'Sales Return', path: '/sales/returns' },
        { title: 'Credits', path: '/sales/credits' },
        { title: 'Payment Log', path: '/sales/payments' },
        { title: 'Shipments', path: '/sales/shipments' },
      ],
    },
    {
      title: 'Purchases',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      path: '/purchases/vendors',
      subItems: [
        { title: 'Vendors', path: '/purchases/vendors' },
        { title: 'Purchase Order', path: '/purchases/purchase-orders' },
        { title: 'Purchase Received', path: '/purchases/purchase-received' },
        { title: 'Bills', path: '/purchases/bills' },
        { title: 'Payments Made', path: '/purchases/payments-made' },
        { title: 'Vendor Credits', path: '/purchases/vendor-credits' },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <div className={`w-8 h-8 ${APP_CONFIG.logo.bgColor} rounded-lg flex items-center justify-center mr-3`}>
              <span className="text-lg">{APP_CONFIG.logo.icon}</span>
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900">{APP_CONFIG.name}</span>
              <p className="text-xs text-gray-600 font-medium">{APP_CONFIG.fullName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 mt-6 px-3 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <div key={item.title}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                      isActive
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  {item.icon}
                  <span className="ml-3">{item.title}</span>
                </NavLink>

                {item.subItems && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.subItems.map((subItem) => (
                      <NavLink
                        key={subItem.title}
                        to={subItem.path}
                        className={({ isActive }) =>
                          `block px-3 py-2 text-sm rounded-md transition-colors duration-200 ${
                            isActive
                              ? 'bg-purple-50 text-purple-700'
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                          }`
                        }
                      >
                        {subItem.title}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
};

export default Sidebar; 
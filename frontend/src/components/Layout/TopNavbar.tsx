import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import APP_CONFIG from '@/config/app';

interface TopNavbarProps {
  onMenuClick: () => void;
}

const TopNavbar: React.FC<TopNavbarProps> = ({ onMenuClick }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  const handleProfileClick = () => {
    navigate('/profile');
    setShowUserMenu(false);
  };

  const handleSettingsClick = () => {
    navigate('/settings');
    setShowUserMenu(false);
  };

  const handleOrganizationSettingsClick = () => {
    navigate('/organization-settings');
    setShowUserMenu(false);
  };

  const handleAdminAccountsClick = () => {
    navigate('/admin/accounts');
    setShowUserMenu(false);
  };

  // Check if user is from master account (case-insensitive)
  const isMasterUser = user?.account_id?.toLowerCase() === 'masteraccount';

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div className="ml-4 lg:ml-0">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{APP_CONFIG.fullName}</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="hidden md:block">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  placeholder="Search..."
                />
              </div>
            </div>

            {/* Notifications */}
            <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 17H9a6 6 0 01-6-6V9a6 6 0 016-6h6a6 6 0 016 6v2" />
              </svg>
              <span className="sr-only">View notifications</span>
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </span>
                </div>
                <span className="ml-3 text-gray-700 dark:text-gray-300 text-sm font-medium hidden md:block">
                  {user?.first_name} {user?.last_name}
                </span>
                <svg className="ml-2 h-4 w-4 text-gray-400 hidden md:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showUserMenu && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 dark:divide-gray-600 focus:outline-none z-50">
                  <div className="px-4 py-3">
                    <p className="text-sm dark:text-gray-300">Signed in as</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={handleProfileClick}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      Your Profile
                    </button>
                    <button
                      onClick={handleSettingsClick}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      Settings
                    </button>
                    <button
                      onClick={handleOrganizationSettingsClick}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      Organization Settings
                    </button>
                    {isMasterUser && (
                      <button
                        onClick={handleAdminAccountsClick}
                        className="block w-full text-left px-4 py-2 text-sm text-purple-700 font-medium hover:bg-purple-50"
                      >
                        Admin Accounts
                      </button>
                    )}
                  </div>
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TopNavbar; 
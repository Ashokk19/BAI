import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './utils/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout/Layout';
import ItemList from './pages/inventory/item-list';
import ItemCategories from './pages/inventory/item-categories';
import ExpiryTracking from './pages/inventory/expiry-tracking';
import InventoryLog from './pages/inventory/inventory-log';
import Customers from './pages/sales/Customers';
import TaxInvoice from './pages/sales/TaxInvoice';
import ProformaInvoice from './pages/sales/ProformaInvoice';
import PaymentLog from './pages/sales/payment-log';
import CustomerList from './pages/sales/customer-list';
import DeliveryNote from './pages/sales/delivery-note';
import SalesReturns from './pages/sales/sales-returns';
import CreditTracking from './pages/sales/credit-tracking';
import InvoiceHistory from './pages/sales/invoice-history';
import ProformaInvoiceHistory from './pages/sales/proforma-invoice-history';
import InvoiceCreation from './pages/sales/invoice-creation';
import ShipmentRecords from './pages/sales/shipment-records';
import Reports from './pages/sales/Reports';
import Vendors from './pages/purchases/Vendors';
import VendorList from './pages/purchases/vendor-list';
import Bills from './pages/purchases/bills';
import PaymentsMade from './pages/purchases/payments-made';
import PurchaseOrders from './pages/purchases/purchase-orders';
import PurchaseReceived from './pages/purchases/purchase-received';
import VendorCredits from './pages/purchases/vendor-credits';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import OrganizationSettings from './pages/OrganizationSettings';
import AccountsAdmin from './pages/admin/accounts';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

// Public Route component (redirects to dashboard if already logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Toaster position="top-center" />
          <Routes>
            {/* Public routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />

            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Inventory Routes */}
            <Route path="/inventory" element={<Navigate to="/inventory/items" replace />} />
            
            <Route
              path="/inventory/items"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ItemList />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/inventory/categories"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ItemCategories />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/inventory/expiry"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ExpiryTracking />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/inventory/logs"
              element={
                <ProtectedRoute>
                  <Layout>
                    <InventoryLog />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Sales Routes */}
            <Route path="/sales" element={<Navigate to="/sales/customers" replace />} />
            
            <Route
              path="/sales/customers"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Customers />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/sales/customer-list"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CustomerList />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/sales/proforma-invoices"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProformaInvoice />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/sales/invoices"
              element={
                <ProtectedRoute>
                  <Layout>
                    <TaxInvoice />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/sales/invoice-creation"
              element={
                <ProtectedRoute>
                  <Layout>
                    <InvoiceCreation />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/sales/invoice-history"
              element={
                <ProtectedRoute>
                  <Layout>
                    <InvoiceHistory />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/sales/proforma-history"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProformaInvoiceHistory />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/sales/payments"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PaymentLog />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/sales/returns"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SalesReturns />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/sales/credits"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CreditTracking />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/sales/delivery-notes"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DeliveryNote />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/sales/shipments"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ShipmentRecords />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/sales/reports"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Reports />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Purchase Routes */}
            <Route path="/purchases" element={<Navigate to="/purchases/vendors" replace />} />
            
            <Route
              path="/purchases/vendors"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Vendors />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/purchases/vendor-list"
              element={
                <ProtectedRoute>
                  <Layout>
                    <VendorList />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/purchases/bills"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Bills />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/purchases/payments-made"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PaymentsMade />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/purchases/purchase-orders"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PurchaseOrders />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/purchases/purchase-received"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PurchaseReceived />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/purchases/vendor-credits"
              element={
                <ProtectedRoute>
                  <Layout>
                    <VendorCredits />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Profile and Settings Routes */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/organization-settings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <OrganizationSettings />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin/accounts"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AccountsAdmin />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Home page (public) */}
            <Route path="/" element={<Home />} />

            {/* 404 - Page not found */}
            <Route
              path="*"
              element={
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                    <p className="text-gray-600 mb-4">Page not found</p>
                    <button
                      onClick={() => window.history.back()}
                      className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                    >
                      Go Back
                    </button>
                  </div>
      </div>
              }
            />
          </Routes>
      </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

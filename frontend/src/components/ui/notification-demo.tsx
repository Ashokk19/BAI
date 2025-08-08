import React from 'react';
import { Button } from './button';
import { Notification, useNotifications, NotificationContainer } from './notification';
import { Heart, Download, Upload, Trash2 } from 'lucide-react';

export const NotificationDemo: React.FC = () => {
  const notifications = useNotifications();

  const showSuccess = () => {
    notifications.success(
      'Success!',
      'Your changes have been saved successfully.',
      { autoClose: true, autoCloseDelay: 3000 }
    );
  };

  const showError = () => {
    notifications.error(
      'Error occurred',
      'Failed to save changes. Please try again.',
      { 
        actions: (
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={() => console.log('Retry')}>
              Retry
            </Button>
            <Button size="sm" variant="ghost" onClick={() => console.log('Cancel')}>
              Cancel
            </Button>
          </div>
        )
      }
    );
  };

  const showWarning = () => {
    notifications.warning(
      'Warning',
      'This action cannot be undone. Are you sure you want to continue?',
      { 
        autoClose: true,
        autoCloseDelay: 7000,
        actions: (
          <div className="flex space-x-2">
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
              Continue
            </Button>
            <Button size="sm" variant="outline">
              Cancel
            </Button>
          </div>
        )
      }
    );
  };

  const showInfo = () => {
    notifications.info(
      'Information',
      'New features are now available in your dashboard.',
      {
        autoClose: true,
        autoCloseDelay: 4000,
        icon: <Heart className="w-5 h-5 text-blue-600" />
      }
    );
  };

  const showCustom = () => {
    notifications.show({
      title: 'File Upload',
      description: 'Your file is being processed in the background.',
      variant: 'default',
      icon: <Upload className="w-5 h-5 text-purple-600" />,
      autoClose: false,
      actions: (
        <div className="flex space-x-2">
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
            View Progress
          </Button>
        </div>
      )
    });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
          BAI Notification System
        </h1>
        <p className="text-gray-600">
          Premium alerts and notifications designed for the BAI application
        </p>
      </div>

      {/* Inline Notifications Examples */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Inline Notifications</h2>
          
          <Notification
            variant="success"
            title="Payment Processed"
            description="Your payment of ₹2,500 has been successfully processed."
            closable={false}
            showIcon={true}
          />

          <Notification
            variant="error"
            title="Connection Failed"
            description="Unable to connect to the server. Please check your internet connection."
            actions={
              <div className="flex space-x-2">
                <Button size="sm" variant="outline">Retry</Button>
                <Button size="sm" variant="ghost">Cancel</Button>
              </div>
            }
          />

          <Notification
            variant="warning"
            title="Storage Almost Full"
            description="You're using 95% of your storage space. Consider upgrading your plan."
            icon={<Download className="w-5 h-5 text-amber-600" />}
          />

          <Notification
            variant="info"
            title="New Feature Available"
            description="Check out our new inventory tracking dashboard!"
            size="sm"
          />

          <Notification
            variant="default"
            title="System Maintenance"
            description="Scheduled maintenance will occur tonight from 2:00 AM to 4:00 AM."
            size="lg"
            actions={
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                Learn More
              </Button>
            }
          />
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Programmatic Notifications</h2>
          <div className="bg-gray-50 p-6 rounded-xl border">
            <p className="text-sm text-gray-600 mb-4">
              Click the buttons below to show toast notifications in the top-right corner:
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={showSuccess}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Success Toast
              </Button>
              
              <Button 
                onClick={showError}
                className="bg-red-600 hover:bg-red-700"
              >
                Error Toast
              </Button>
              
              <Button 
                onClick={showWarning}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Warning Toast
              </Button>
              
              <Button 
                onClick={showInfo}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Info Toast
              </Button>
              
              <Button 
                onClick={showCustom}
                className="bg-purple-600 hover:bg-purple-700 col-span-2"
              >
                Custom Notification
              </Button>
              
              <Button 
                onClick={() => notifications.clear()}
                variant="outline"
                className="col-span-2"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>

          {/* Usage Examples */}
          <div className="bg-gray-50 p-6 rounded-xl border">
            <h3 className="font-semibold mb-3">Usage Examples</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="bg-white p-3 rounded border">
                <code className="text-purple-600">
                  notifications.success('Title', 'Description')
                </code>
              </div>
              <div className="bg-white p-3 rounded border">
                <code className="text-purple-600">
                  notifications.error('Error', 'Message', &#123; autoClose: false &#125;)
                </code>
              </div>
              <div className="bg-white p-3 rounded border">
                <code className="text-purple-600">
                  &lt;Notification variant="warning" title="Title" /&gt;
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features List */}
      <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl border border-purple-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full"></div>
            <span>5 notification variants</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full"></div>
            <span>Auto-close with progress bar</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full"></div>
            <span>Custom icons and actions</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full"></div>
            <span>Multiple positions</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full"></div>
            <span>Smooth animations</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full"></div>
            <span>TypeScript support</span>
          </div>
        </div>
      </div>

      {/* Notification Container for toast notifications */}
      <NotificationContainer position="top-right" />
    </div>
  );
};

export default NotificationDemo; 
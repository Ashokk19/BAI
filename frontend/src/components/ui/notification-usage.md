# BAI Notification System Usage Guide

A premium, sleek notification and alert component system designed specifically for the BAI application's elite UI theme.

## 🎨 Design Features

- **Purple-Blue Gradient Theme**: Matches your BAI application's corporate colors
- **Modern Typography**: Uses Segoe UI with proper hierarchy
- **Smooth Animations**: Premium slide, fade, bounce, and scale effects
- **Backdrop Blur**: Modern glass-morphism effects
- **Gradient Backgrounds**: Each notification type has themed gradients
- **Decorative Elements**: Subtle circular elements for premium look

## 📦 Components

### 1. `Notification` - Main component for inline alerts
### 2. `NotificationContainer` - Toast notification container
### 3. `useNotifications` - React hook for programmatic notifications
### 4. `notificationManager` - Global notification manager

## 🚀 Quick Start

### Step 1: Add NotificationContainer to your main layout

```tsx
// In your main App.tsx or Layout component
import { NotificationContainer } from '@/components/ui/notification';

function App() {
  return (
    <div className="app">
      {/* Your app content */}
      
      {/* Add this at the end for toast notifications */}
      <NotificationContainer position="top-right" />
    </div>
  );
}
```

### Step 2: Use notifications in your components

```tsx
import { useNotifications, Notification } from '@/components/ui/notification';

function MyComponent() {
  const notifications = useNotifications();

  const handleSave = async () => {
    try {
      await saveData();
      notifications.success('Success!', 'Data saved successfully');
    } catch (error) {
      notifications.error('Error', 'Failed to save data');
    }
  };

  return (
    <div>
      {/* Inline notification */}
      <Notification
        variant="info"
        title="Welcome!"
        description="Complete your profile to get started."
      />
      
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

## 📋 Notification Types

### 1. Success Notifications
```tsx
notifications.success('Payment Processed', 'Your payment of ₹2,500 was successful');

<Notification
  variant="success"
  title="Profile Updated"
  description="Your profile has been updated successfully."
/>
```

### 2. Error Notifications
```tsx
notifications.error('Connection Failed', 'Unable to connect to server');

<Notification
  variant="error"
  title="Validation Error"
  description="Please fill in all required fields."
  actions={
    <Button size="sm" variant="outline">Fix Issues</Button>
  }
/>
```

### 3. Warning Notifications
```tsx
notifications.warning('Storage Full', 'You are running out of storage space');

<Notification
  variant="warning"
  title="Unsaved Changes"
  description="You have unsaved changes that will be lost."
/>
```

### 4. Info Notifications
```tsx
notifications.info('New Feature', 'Check out our new dashboard!');

<Notification
  variant="info"
  title="System Update"
  description="A new version is available."
/>
```

### 5. Default (Purple Theme)
```tsx
notifications.show({
  variant: 'default',
  title: 'Notification',
  description: 'This matches BAI theme colors'
});

<Notification
  variant="default"
  title="System Maintenance"
  description="Maintenance scheduled for tonight."
/>
```

## ⚙️ Configuration Options

### Notification Props

```tsx
interface NotificationProps {
  variant?: 'success' | 'error' | 'warning' | 'info' | 'default';
  size?: 'sm' | 'md' | 'lg';
  position?: 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center' | 'inline';
  animation?: 'slide' | 'fade' | 'bounce' | 'scale';
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  showIcon?: boolean;
  closable?: boolean;
  autoClose?: boolean;
  autoCloseDelay?: number;
  onClose?: () => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}
```

### Advanced Usage Examples

#### Custom Icons
```tsx
import { Upload, Download } from 'lucide-react';

<Notification
  variant="info"
  title="File Upload"
  description="Your file is being processed"
  icon={<Upload className="w-5 h-5 text-blue-600" />}
/>
```

#### Action Buttons
```tsx
<Notification
  variant="warning"
  title="Confirm Action"
  description="This action cannot be undone"
  actions={
    <div className="flex space-x-2">
      <Button size="sm" className="bg-red-600 hover:bg-red-700">
        Delete
      </Button>
      <Button size="sm" variant="outline">
        Cancel
      </Button>
    </div>
  }
/>
```

#### Auto-close with Progress Bar
```tsx
notifications.success('Saved!', 'Changes saved', {
  autoClose: true,
  autoCloseDelay: 3000
});
```

#### Different Sizes
```tsx
<Notification size="sm" title="Small notification" />
<Notification size="md" title="Medium notification" />
<Notification size="lg" title="Large notification" />
```

## 🎯 Real-world Usage Examples

### Form Validation
```tsx
const handleSubmit = async (data) => {
  try {
    await submitForm(data);
    notifications.success(
      'Form Submitted',
      'Your information has been saved successfully.'
    );
  } catch (error) {
    notifications.error(
      'Validation Error',
      'Please check the form and try again.',
      {
        actions: (
          <Button size="sm" onClick={() => scrollToFirstError()}>
            Show Errors
          </Button>
        )
      }
    );
  }
};
```

### File Operations
```tsx
const handleFileUpload = async (file) => {
  const uploadId = notifications.info(
    'Uploading File',
    `Uploading ${file.name}...`,
    { autoClose: false }
  );

  try {
    await uploadFile(file);
    notifications.dismiss(uploadId);
    notifications.success('Upload Complete', `${file.name} uploaded successfully`);
  } catch (error) {
    notifications.dismiss(uploadId);
    notifications.error('Upload Failed', 'Please try again');
  }
};
```

### API Responses
```tsx
const fetchData = async () => {
  try {
    const data = await api.getData();
    if (data.warnings?.length > 0) {
      notifications.warning(
        'Partial Success',
        `Data loaded with ${data.warnings.length} warnings`
      );
    }
  } catch (error) {
    notifications.error(
      'Failed to Load',
      'Unable to fetch data from server'
    );
  }
};
```

## 🎨 Customization

### Custom Styling
```tsx
<Notification
  className="border-2 border-purple-300 shadow-2xl"
  variant="default"
  title="Custom Styled"
/>
```

### Container Positioning
```tsx
<NotificationContainer position="bottom-left" />
<NotificationContainer position="top-center" />
```

## 📱 Integration with Existing Components

### Replace existing toast usage:
```tsx
// OLD: Basic toast
toast.success('Success!');

// NEW: BAI Notification
notifications.success('Success!', 'Action completed successfully');
```

### Replace existing alert usage:
```tsx
// OLD: Browser alert
alert('Error occurred');

// NEW: BAI Notification
notifications.error('Error', 'Something went wrong');
```

## 🎯 Best Practices

1. **Use appropriate variants**: Success for confirmations, Error for failures, Warning for cautions
2. **Keep titles short**: 1-3 words maximum
3. **Descriptive messages**: Explain what happened and what to do next
4. **Use auto-close wisely**: Auto-close success/info, manual close for errors/warnings
5. **Include actions when helpful**: Provide retry, undo, or navigation options
6. **Consistent positioning**: Use the same position throughout your app

## 🚀 Migration Guide

If you're replacing existing toast/alert systems:

1. Replace toast imports with notification imports
2. Update toast calls to use the new notification API
3. Add NotificationContainer to your main layout
4. Update styling to match BAI theme colors

## 🎉 Ready to Use!

The notification system is now ready to be used throughout your BAI application. It will provide a consistent, premium user experience that matches your application's elite design standards. 
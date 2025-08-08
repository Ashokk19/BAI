import React, { useState, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const notificationVariants = cva(
  "relative w-full max-w-md rounded-xl border backdrop-blur-sm transition-all duration-300 ease-out transform",
  {
    variants: {
      variant: {
        success: "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 text-emerald-900 shadow-emerald-100/50",
        error: "bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-900 shadow-red-100/50",
        warning: "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 text-amber-900 shadow-amber-100/50",
        info: "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-900 shadow-blue-100/50",
        default: "bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 text-purple-900 shadow-purple-100/50"
      },
      size: {
        sm: "p-3 text-sm",
        md: "p-4 text-base",
        lg: "p-5 text-lg"
      },
      position: {
        "top-left": "fixed top-4 left-4 z-50",
        "top-right": "fixed top-4 right-4 z-50",
        "top-center": "fixed top-4 left-1/2 transform -translate-x-1/2 z-50",
        "bottom-left": "fixed bottom-4 left-4 z-50",
        "bottom-right": "fixed bottom-4 right-4 z-50",
        "bottom-center": "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50",
        "inline": "relative"
      },
      animation: {
        slide: "animate-in data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2",
        fade: "animate-in data-[state=open]:fade-in data-[state=closed]:fade-out",
        bounce: "animate-in data-[state=open]:animate-bounce data-[state=closed]:fade-out",
        scale: "animate-in data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      position: "inline",
      animation: "slide"
    }
  }
);

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  default: Bell
};

const colorMap = {
  success: "text-emerald-600",
  error: "text-red-600", 
  warning: "text-amber-600",
  info: "text-blue-600",
  default: "text-purple-600"
};

export interface NotificationProps extends 
  React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof notificationVariants> {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  showIcon?: boolean;
  closable?: boolean;
  autoClose?: boolean;
  autoCloseDelay?: number;
  onClose?: () => void;
  actions?: React.ReactNode;
}

const Notification = React.forwardRef<HTMLDivElement, NotificationProps>(
  ({ 
    className, 
    variant = "default", 
    size = "md",
    position = "inline",
    animation = "slide",
    title, 
    description, 
    icon, 
    showIcon = true,
    closable = true,
    autoClose = false,
    autoCloseDelay = 5000,
    onClose,
    actions,
    children,
    ...props 
  }, ref) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isClosing, setIsClosing] = useState(false);

    const IconComponent = iconMap[variant as keyof typeof iconMap];
    const iconColor = colorMap[variant as keyof typeof colorMap];

    useEffect(() => {
      if (autoClose && autoCloseDelay) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseDelay);

        return () => clearTimeout(timer);
      }
    }, [autoClose, autoCloseDelay]);

    const handleClose = () => {
      setIsClosing(true);
      setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, 200);
    };

    if (!isVisible) return null;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          notificationVariants({ variant, size, position, animation }),
          "shadow-lg",
          {
            "opacity-0 scale-95": isClosing,
            "opacity-100 scale-100": !isClosing
          },
          className
        )}
        data-state={isClosing ? "closed" : "open"}
        {...props}
      >
        {/* Progress bar for auto-close */}
        {autoClose && (
          <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-purple-400 to-blue-400 rounded-t-xl animate-pulse" 
               style={{ 
                 width: '100%',
                 animation: `shrink ${autoCloseDelay}ms linear`
               }} />
        )}

        <div className="flex items-start space-x-3">
          {/* Icon */}
          {showIcon && (
            <div className="flex-shrink-0 mt-0.5">
              {icon || (
                <IconComponent className={cn("w-5 h-5", iconColor)} />
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {title && (
              <h4 className="font-semibold mb-1 text-sm leading-tight">
                {title}
              </h4>
            )}
            
            {description && (
              <p className="text-sm opacity-90 leading-relaxed">
                {description}
              </p>
            )}
            
            {children && (
              <div className="mt-2">
                {children}
              </div>
            )}

            {/* Actions */}
            {actions && (
              <div className="mt-3 flex items-center space-x-2">
                {actions}
              </div>
            )}
          </div>

          {/* Close button */}
          {closable && (
            <button
              onClick={handleClose}
              className="flex-shrink-0 p-1 rounded-full hover:bg-black/10 transition-colors duration-200"
              aria-label="Close notification"
            >
              <X className="w-4 h-4 opacity-60 hover:opacity-100" />
            </button>
          )}
        </div>

        {/* Decorative elements */}
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 opacity-30" />
        <div className="absolute bottom-2 left-2 w-1 h-1 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-20" />
      </div>
    );
  }
);

Notification.displayName = "Notification";

// Notification Manager for programmatic usage
interface NotificationItem extends NotificationProps {
  id: string;
}

class NotificationManager {
  private notifications: NotificationItem[] = [];
  private listeners: ((notifications: NotificationItem[]) => void)[] = [];

  subscribe(listener: (notifications: NotificationItem[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  show(notification: Omit<NotificationProps, 'onClose'>) {
    const id = Math.random().toString(36).substring(2);
    const item: NotificationItem = {
      ...notification,
      id,
      onClose: () => this.dismiss(id)
    };

    this.notifications.push(item);
    this.notify();

    if (notification.autoClose !== false) {
      setTimeout(() => {
        this.dismiss(id);
      }, notification.autoCloseDelay || 5000);
    }

    return id;
  }

  dismiss(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notify();
  }

  clear() {
    this.notifications = [];
    this.notify();
  }

  // Convenience methods
  success(title: string, description?: string, options?: Partial<NotificationProps>) {
    return this.show({
      variant: 'success',
      title,
      description,
      ...options
    });
  }

  error(title: string, description?: string, options?: Partial<NotificationProps>) {
    return this.show({
      variant: 'error',
      title,
      description,
      autoClose: false, // Errors should be manually dismissed
      ...options
    });
  }

  warning(title: string, description?: string, options?: Partial<NotificationProps>) {
    return this.show({
      variant: 'warning',
      title,
      description,
      ...options
    });
  }

  info(title: string, description?: string, options?: Partial<NotificationProps>) {
    return this.show({
      variant: 'info',
      title,
      description,
      ...options
    });
  }
}

// Global notification manager instance
export const notificationManager = new NotificationManager();

// React hook for using notifications
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    return notificationManager.subscribe(setNotifications);
  }, []);

  return {
    notifications,
    show: notificationManager.show.bind(notificationManager),
    dismiss: notificationManager.dismiss.bind(notificationManager),
    clear: notificationManager.clear.bind(notificationManager),
    success: notificationManager.success.bind(notificationManager),
    error: notificationManager.error.bind(notificationManager),
    warning: notificationManager.warning.bind(notificationManager),
    info: notificationManager.info.bind(notificationManager)
  };
};

// Notification Container Component
export const NotificationContainer: React.FC<{
  position?: 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center';
}> = ({ position = 'top-right' }) => {
  const { notifications } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className={cn("fixed z-50 flex flex-col space-y-2", {
      'top-4 left-4': position === 'top-left',
      'top-4 right-4': position === 'top-right',
      'top-4 left-1/2 transform -translate-x-1/2': position === 'top-center',
      'bottom-4 left-4': position === 'bottom-left',
      'bottom-4 right-4': position === 'bottom-right',
      'bottom-4 left-1/2 transform -translate-x-1/2': position === 'bottom-center',
    })}>
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          {...notification}
          position="inline"
        />
      ))}
    </div>
  );
};

export { Notification }; 
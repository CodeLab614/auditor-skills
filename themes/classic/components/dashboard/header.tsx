'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useMounted } from '@/hooks/use-mounted';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Bell,
  UserPlus,
  AlertTriangle,
  Shield,
  UserCheck,
  Sun,
  Moon,
  type LucideIcon,
} from 'lucide-react';
import { MobileSidebar, type NavSection, type UserProfile } from './sidebar';

export interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'user' | 'alert' | 'security' | 'success';
  read?: boolean;
}

interface HeaderProps {
  notifications?: Notification[];
  onNotificationClick?: (notification: Notification) => void;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  sidebarProps?: {
    brandName?: string;
    navigation?: NavSection[];
    user?: UserProfile;
    onLogout?: () => void;
  };
  className?: string;
}

const notificationIcons: Record<Notification['type'], LucideIcon> = {
  user: UserPlus,
  alert: AlertTriangle,
  security: Shield,
  success: UserCheck,
};

const notificationColors: Record<Notification['type'], string> = {
  user: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  alert: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  security: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const defaultNotifications: Notification[] = [
  {
    id: '1',
    title: 'New user registered',
    description: 'Marcus Chen just created an account.',
    time: '2 min ago',
    type: 'user',
    read: false,
  },
  {
    id: '2',
    title: 'Failed login attempt',
    description: '3 failed attempts for user sarah@example.com',
    time: '15 min ago',
    type: 'security',
    read: false,
  },
  {
    id: '3',
    title: 'User verified email',
    description: 'Elena Rostova verified their email address.',
    time: '1 hr ago',
    type: 'success',
    read: true,
  },
  {
    id: '4',
    title: 'Password reset requested',
    description: 'david@example.com requested a password reset.',
    time: '2 hrs ago',
    type: 'alert',
    read: true,
  },
];

export function Header({
  notifications = defaultNotifications,
  onNotificationClick,
  onSearch,
  searchPlaceholder = 'Search metrics, orders, or users...',
  showSearch = true,
  sidebarProps,
  className,
}: HeaderProps) {
  const [searchValue, setSearchValue] = React.useState('');
  const mounted = useMounted();
  const { theme, setTheme } = useTheme();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    onSearch?.(value);
  };

  return (
    <header
      className={cn(
        'h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-6 lg:px-8 shrink-0 z-50 sticky top-0',
        className,
      )}
    >
      <div className='flex items-center gap-4 w-full max-w-md'>
        {/* Mobile Menu Toggle */}
        {sidebarProps && <MobileSidebar {...sidebarProps} />}

        {/* Search */}
        {showSearch && (
          <div className='hidden sm:flex items-center gap-3 w-full bg-muted dark:bg-card dark:border dark:border-border px-3 py-1.5 focus-within:ring-1 focus-within:ring-ring/50 transition-colors'>
            <Search
              className='h-4 w-4 text-muted-foreground'
              strokeWidth={1.5}
            />
            <Input
              type='text'
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={handleSearch}
              className='border-0 bg-transparent p-0 h-auto text-sm placeholder:text-muted-foreground font-light focus-visible:ring-0 focus-visible:ring-offset-0'
            />
            <div className='flex items-center gap-1 text-muted-foreground text-xs font-light tracking-widest uppercase'>
              <kbd className='bg-secondary px-1.5 py-0.5 dark:border dark:border-accent'>
                ⌘
              </kbd>
              <kbd className='bg-secondary px-1.5 py-0.5 dark:border dark:border-accent'>
                K
              </kbd>
            </div>
          </div>
        )}
      </div>

      <div className='flex items-center gap-2 sm:gap-4'>
        {/* Theme Toggle */}
        <Button
          variant='ghost'
          size='icon'
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className='text-muted-foreground hover:text-foreground'
        >
          {mounted && theme === 'dark' ? (
            <Sun className='h-5 w-5' strokeWidth={1.5} />
          ) : (
            <Moon className='h-5 w-5' strokeWidth={1.5} />
          )}
          <span className='sr-only'>Toggle theme</span>
        </Button>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              className='relative text-muted-foreground hover:text-foreground'
            >
              <Bell className='h-5 w-5' strokeWidth={1.5} />
              {unreadCount > 0 && (
                <span className='absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full border border-background' />
              )}
              <span className='sr-only'>Notifications</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align='end'
            className='w-80 p-0 bg-card border-border'
          >
            <div className='px-4 py-3 border-b border-border flex justify-between items-center bg-background'>
              <h3 className='text-sm font-normal'>Notifications</h3>
              {unreadCount > 0 && (
                <Badge
                  variant='secondary'
                  className='text-[10px] uppercase tracking-widest font-medium'
                >
                  {unreadCount} New
                </Badge>
              )}
            </div>
            <div className='max-h-[280px] overflow-y-auto'>
              {notifications.map((notification) => {
                const Icon = notificationIcons[notification.type];
                const isUnread = !notification.read;
                return (
                  <button
                    key={notification.id}
                    onClick={() => onNotificationClick?.(notification)}
                    className={cn(
                      'px-4 py-3 border-b border-border hover:bg-accent/50 transition-colors flex gap-3 text-left w-full relative',
                      isUnread && 'bg-accent/30',
                    )}
                  >
                    {isUnread && (
                      <span className='absolute left-1.5 top-5 w-1.5 h-1.5 bg-blue-500 rounded-full' />
                    )}
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center shrink-0 border mt-0.5',
                        notificationColors[notification.type],
                      )}
                    >
                      <Icon className='h-4 w-4' strokeWidth={1.5} />
                    </div>
                    <div className='flex flex-col min-w-0'>
                      <p
                        className={cn(
                          'text-sm truncate mb-0.5',
                          isUnread
                            ? 'font-medium'
                            : 'font-normal text-muted-foreground',
                        )}
                      >
                        {notification.title}
                      </p>
                      <p
                        className={cn(
                          'text-xs font-light truncate mb-1',
                          isUnread
                            ? 'text-muted-foreground'
                            : 'text-muted-foreground/60',
                        )}
                      >
                        {notification.description}
                      </p>
                      <p className='text-[10px] text-muted-foreground font-light uppercase tracking-widest'>
                        {notification.time}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            <Link
              href='/dashboard/notifications'
              className='block px-4 py-2.5 text-center text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 bg-background transition-colors font-light border-t border-border'
            >
              View all notifications
            </Link>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}

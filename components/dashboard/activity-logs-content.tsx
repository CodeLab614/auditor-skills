'use client';

import * as React from 'react';
import {
  PageHeader,
  DataTable,
  type Column,
} from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Search,
  SlidersHorizontal,
  LogIn,
  LogOut,
  UserPlus,
  KeyRound,
  Shield,
  ShieldOff,
  UserCog,
  Trash2,
  Eye,
  X,
  Monitor,
  Globe,
  Clock,
  ScrollText,
} from 'lucide-react';
import type { ActivityLog } from '@/actions/activity';

const actionConfig: Record<
  string,
  { icon: React.ElementType; label: string; color: string }
> = {
  login: {
    icon: LogIn,
    label: 'Login',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  logout: {
    icon: LogOut,
    label: 'Logout',
    color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  },
  register: {
    icon: UserPlus,
    label: 'Register',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
  terms_accepted: {
    icon: ScrollText,
    label: 'Terms Accepted',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
  password_change: {
    icon: KeyRound,
    label: 'Password Change',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  '2fa_enabled': {
    icon: Shield,
    label: '2FA Enabled',
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  },
  '2fa_disabled': {
    icon: ShieldOff,
    label: '2FA Disabled',
    color: 'text-red-400 bg-red-500/10 border-red-500/20',
  },
  profile_update: {
    icon: UserCog,
    label: 'Profile Update',
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  },
  user_deleted: {
    icon: Trash2,
    label: 'User Deleted',
    color: 'text-red-400 bg-red-500/10 border-red-500/20',
  },
};

function getActionConfig(action: string) {
  return (
    actionConfig[action] || {
      icon: Eye,
      label: action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      color: 'text-muted-foreground bg-muted border-border',
    }
  );
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

function parseUserAgent(ua: string | null): { browser: string; os: string } {
  if (!ua) return { browser: 'Unknown', os: 'Unknown' };

  let browser = 'Unknown';
  let os = 'Unknown';

  // Detect browser
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

  // Detect OS
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone')) os = 'iOS';

  return { browser, os };
}

// Search and Filters Component
interface SearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedActions: string[];
  onActionsChange: (actions: string[]) => void;
  uniqueActions: string[];
  activeFilterCount: number;
}

function SearchAndFilters({
  searchQuery,
  onSearchChange,
  selectedActions,
  onActionsChange,
  uniqueActions,
  activeFilterCount,
}: SearchAndFiltersProps) {
  const toggleAction = (action: string) => {
    const newActions = selectedActions.includes(action)
      ? selectedActions.filter((a) => a !== action)
      : [...selectedActions, action];
    onActionsChange(newActions);
  };

  const clearFilters = () => {
    onActionsChange([]);
  };

  return (
    <div className='flex flex-col sm:flex-row gap-3'>
      {/* Search Input */}
      <div className='relative flex-1'>
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
        <Input
          placeholder='Search by user, email, action, or IP...'
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className='pl-9 bg-background border-border'
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
          >
            <X className='h-4 w-4' />
          </button>
        )}
      </div>

      {/* Filters */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant='outline' className='gap-2 shrink-0'>
            <SlidersHorizontal className='h-4 w-4' />
            Filters
            {activeFilterCount > 0 && (
              <Badge
                variant='secondary'
                className='ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]'
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align='end' className='w-64 p-0 bg-card border-border'>
          {/* Header */}
          <div className='flex items-center justify-between px-4 py-3 border-b border-border'>
            <h4 className='text-sm font-medium'>Filters</h4>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className='text-xs text-primary hover:text-primary/80 font-medium'
              >
                Clear all
              </button>
            )}
          </div>

          <div className='p-4 space-y-3'>
            <label className='text-xs text-muted-foreground uppercase tracking-wider font-medium'>
              Action Type
            </label>
            <div className='space-y-2'>
              {uniqueActions.map((action) => {
                const config = getActionConfig(action);
                return (
                  <div key={action} className='flex items-center space-x-2'>
                    <Checkbox
                      id={`filter-${action}`}
                      checked={selectedActions.includes(action)}
                      onCheckedChange={() => toggleAction(action)}
                    />
                    <Label
                      htmlFor={`filter-${action}`}
                      className='text-sm font-normal cursor-pointer'
                    >
                      {config.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Active Filters Display
interface ActiveFiltersProps {
  selectedActions: string[];
  onRemoveAction: (action: string) => void;
  onClearAll: () => void;
}

function ActiveFilters({ selectedActions, onRemoveAction, onClearAll }: ActiveFiltersProps) {
  if (selectedActions.length === 0) return null;

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <span className='text-xs text-muted-foreground'>Active filters:</span>

      {selectedActions.map((action) => {
        const config = getActionConfig(action);
        return (
          <Badge
            key={action}
            variant='secondary'
            className='gap-1 cursor-pointer hover:bg-secondary/80'
            onClick={() => onRemoveAction(action)}
          >
            {config.label}
            <X className='h-3 w-3' />
          </Badge>
        );
      })}

      <button
        onClick={onClearAll}
        className='text-xs text-muted-foreground hover:text-foreground ml-2'
      >
        Clear all
      </button>
    </div>
  );
}

interface ActivityLogsContentProps {
  logs: ActivityLog[];
}

export function ActivityLogsContent({ logs: initialLogs }: ActivityLogsContentProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedActions, setSelectedActions] = React.useState<string[]>([]);
  const [selectedLog, setSelectedLog] = React.useState<ActivityLog | null>(null);
  const [detailsSheetOpen, setDetailsSheetOpen] = React.useState(false);

  const logs = initialLogs;

  // Get unique actions for filter
  const uniqueActions = React.useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.action)));
  }, [logs]);

  // Filter logs
  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        !searchQuery ||
        log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.ipAddress?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAction =
        selectedActions.length === 0 || selectedActions.includes(log.action);

      return matchesSearch && matchesAction;
    });
  }, [logs, searchQuery, selectedActions]);

  const activeFilterCount = selectedActions.length;

  const removeAction = (action: string) => {
    setSelectedActions((prev) => prev.filter((a) => a !== action));
  };

  const clearAllFilters = () => {
    setSelectedActions([]);
    setSearchQuery('');
  };

  const openDetailsSheet = (log: ActivityLog) => {
    setSelectedLog(log);
    setDetailsSheetOpen(true);
  };

  const columns: Column<ActivityLog>[] = [
    {
      key: 'user',
      header: 'User',
      render: (item) => (
        <div className='flex flex-col'>
          <span className='font-medium text-foreground'>{item.userName}</span>
          <span className='text-xs text-muted-foreground'>{item.userEmail}</span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (item) => {
        const config = getActionConfig(item.action);
        const Icon = config.icon;
        return (
          <Badge variant='outline' className={`gap-1.5 ${config.color}`}>
            <Icon className='h-3 w-3' />
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      render: (item) => (
        <span className='font-mono text-xs text-muted-foreground'>
          {item.ipAddress || 'N/A'}
        </span>
      ),
    },
    {
      key: 'device',
      header: 'Device',
      render: (item) => {
        const { browser, os } = parseUserAgent(item.userAgent);
        return (
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <Monitor className='h-3 w-3' />
            <span>{browser} / {os}</span>
          </div>
        );
      },
    },
    {
      key: 'time',
      header: 'Time',
      render: (item) => (
        <div className='flex flex-col'>
          <span className='text-sm'>{formatRelativeTime(item.createdAt)}</span>
          <span className='text-xs text-muted-foreground'>
            {formatDate(item.createdAt)} {formatTime(item.createdAt)}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (item) => (
        <Button
          variant='ghost'
          size='sm'
          onClick={(e) => {
            e.stopPropagation();
            openDetailsSheet(item);
          }}
        >
          <Eye className='h-4 w-4' />
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title='Activity Logs'
        description='Monitor user activities and system events.'
        dateRangeOptions={[]}
      />

      {/* Search, Filters, and Table */}
      <div className='dark:border dark:border-border bg-card'>
        {/* Search and Filters Bar */}
        <div className='p-4 dark:border-b dark:border-border space-y-3'>
          <SearchAndFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedActions={selectedActions}
            onActionsChange={setSelectedActions}
            uniqueActions={uniqueActions}
            activeFilterCount={activeFilterCount}
          />

          {/* Active Filters and Results Count */}
          {(searchQuery || activeFilterCount > 0) && (
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <ActiveFilters
                selectedActions={selectedActions}
                onRemoveAction={removeAction}
                onClearAll={clearAllFilters}
              />
              <p className='text-sm text-muted-foreground'>
                Showing {filteredLogs.length} of {logs.length} logs
              </p>
            </div>
          )}
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={filteredLogs}
          onRowClick={openDetailsSheet}
          embedded
        />
      </div>

      {/* Details Sheet */}
      <Sheet open={detailsSheetOpen} onOpenChange={setDetailsSheetOpen}>
        <SheetContent side='right' className='sm:max-w-md'>
          <SheetHeader>
            <SheetTitle>Activity Details</SheetTitle>
            <SheetDescription>
              Full details of the selected activity log.
            </SheetDescription>
          </SheetHeader>
          {selectedLog && (
            <div className='p-4 space-y-6'>
              {/* User Info */}
              <div className='space-y-1'>
                <p className='text-xs text-muted-foreground uppercase tracking-wider'>User</p>
                <p className='font-medium'>{selectedLog.userName}</p>
                <p className='text-sm text-muted-foreground'>{selectedLog.userEmail}</p>
              </div>

              {/* Action */}
              <div className='space-y-2'>
                <p className='text-xs text-muted-foreground uppercase tracking-wider'>Action</p>
                {(() => {
                  const config = getActionConfig(selectedLog.action);
                  const Icon = config.icon;
                  return (
                    <Badge variant='outline' className={`gap-1.5 ${config.color}`}>
                      <Icon className='h-3 w-3' />
                      {config.label}
                    </Badge>
                  );
                })()}
              </div>

              {/* IP Address */}
              <div className='space-y-1'>
                <p className='text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1'>
                  <Globe className='h-3 w-3' /> IP Address
                </p>
                <p className='font-mono text-sm'>{selectedLog.ipAddress || 'N/A'}</p>
              </div>

              {/* Timestamp */}
              <div className='space-y-1'>
                <p className='text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1'>
                  <Clock className='h-3 w-3' /> Timestamp
                </p>
                <p className='text-sm'>
                  {formatDate(selectedLog.createdAt)} at {formatTime(selectedLog.createdAt)}
                </p>
              </div>

              {/* Device Info */}
              <div className='space-y-1'>
                <p className='text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1'>
                  <Monitor className='h-3 w-3' /> Device Info
                </p>
                {(() => {
                  const { browser, os } = parseUserAgent(selectedLog.userAgent);
                  return <p className='text-sm'>{browser} on {os}</p>;
                })()}
                {selectedLog.userAgent && (
                  <p className='text-xs text-muted-foreground mt-1 break-all'>
                    {selectedLog.userAgent}
                  </p>
                )}
              </div>

              {/* Additional Details */}
              {selectedLog.details && (
                <div className='space-y-2'>
                  <p className='text-xs text-muted-foreground uppercase tracking-wider'>
                    Additional Details
                  </p>
                  <pre className='text-xs bg-muted p-3 rounded-md overflow-auto max-h-40'>
                    {JSON.stringify(JSON.parse(selectedLog.details), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

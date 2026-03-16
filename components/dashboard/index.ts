// Dashboard Layout Components
export {
  Sidebar,
  MobileSidebar,
  DashboardSidebar,
  type NavItem,
  type NavSection,
  type UserProfile,
} from "./sidebar";

export {
  Header,
  type Notification,
} from "./header";

export {
  PageHeader,
  exportAction,
  type DateRangeOption,
  type ActionButton,
  type PageHeaderProps,
} from "./page-header";

export { DashboardShell } from "./dashboard-shell";

// Page Content Components (Client)
export { DashboardContent } from "./dashboard-content";
export { UsersContent, type User, type AuthProvider } from "./users-content";
export { ProfileContent } from "./profile-content";

// User Management Dialogs
export { AddUserDialog, type NewUserData } from "./add-user-dialog";
export { EditUserDialog } from "./edit-user-dialog";
export { ChangeRoleDialog } from "./change-role-dialog";
export { ResetPasswordDialog } from "./reset-password-dialog";
export { ConfirmDialog, type ConfirmDialogProps } from "./confirm-dialog";

// Data Display Components
export {
  MetricCard,
  MetricGrid,
  metricIcons,
  type MetricCardProps,
  type MetricGridProps,
  type TrendDirection,
} from "./metric-card";

export {
  BarChart,
  createMonthlyData,
  monthlyLabels,
  type BarChartData,
  type BarChartProps,
} from "./bar-chart";

export {
  DataTable,
  type Column,
  type DataTableProps,
} from "./data-table";

export {
  StatusBadge,
  OrderStatusBadge,
  orderStatusMap,
  type StatusType,
  type StatusBadgeProps,
} from "./status-badge";

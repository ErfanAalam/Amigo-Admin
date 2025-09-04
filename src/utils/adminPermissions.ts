// Allowed admin UIDs who can manage other admins
const ALLOWED_ADMIN_UIDS = [
  'yBVwfrDoLwOMiEMEIn450Gtqjw43',
  'Mh4uGEIj44QTUBcT08l2Fuid9h52'
];

export interface AdminPermissions {
  canManageAdmins: boolean;
  canAccessDashboard: boolean;
  canManageGroups: boolean;
  canManageChats: boolean;
  canManageNotifications: boolean;
}

export function checkAdminPermissions(uid: string, permissions: string[] = []): AdminPermissions {
  // Check if user is in the allowed admin UIDs
  const isAllowedAdmin = ALLOWED_ADMIN_UIDS.includes(uid);
  
  // If user has permissions from Firestore, use those; otherwise check hardcoded UIDs
  const hasPermissions = permissions.length > 0;
  
  // Check permissions array for specific access
  const hasAdminManagement = hasPermissions ? permissions.includes('admin_management') : isAllowedAdmin;
  const hasDashboard = hasPermissions ? permissions.includes('dashboard') : isAllowedAdmin;
  const hasManageGroups = hasPermissions ? permissions.includes('manage_groups') : isAllowedAdmin;
  const hasManageChats = hasPermissions ? permissions.includes('manage_chats') : isAllowedAdmin;
  const hasManageNotifications = hasPermissions ? permissions.includes('notifications') : isAllowedAdmin;

  return {
    canManageAdmins: hasAdminManagement,
    canAccessDashboard: hasDashboard,
    canManageGroups: hasManageGroups,
    canManageChats: hasManageChats,
    canManageNotifications: hasManageNotifications,
  };
}

export function getAvailableTabs(permissions: AdminPermissions) {
  const tabs = [];
  
  if (permissions.canAccessDashboard) {
    tabs.push({ id: 'dashboard', label: 'Dashboard', icon: '📊' });
  }
  
  if (permissions.canManageGroups) {
    tabs.push({ id: 'manage_groups', label: 'Manage Groups', icon: '👥' });
  }
  
  if (permissions.canManageChats) {
    tabs.push({ id: 'manage_chats', label: 'Manage Chats', icon: '💬' });
  }
  
  if (permissions.canManageNotifications) {
    tabs.push({ id: 'notifications', label: 'Notifications', icon: '🔔' });
  }
  
  if (permissions.canManageAdmins) {
    tabs.push({ id: 'admin_management', label: 'Admin Management', icon: '👑' });
  }
  
  return tabs;
}

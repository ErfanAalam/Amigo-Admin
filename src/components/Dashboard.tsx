'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';
import { checkAdminPermissions, getAvailableTabs, AdminPermissions } from '../utils/adminPermissions';
import { LogOut, User } from 'lucide-react';
import DashboardTab from './DashboardTab';
import ManageGroupsTab from './ManageGroupsTab';
import ManageChatsTab from './ManageChatsTab';
import NotificationTab from './NotificationTab';
import AdminManagementTab from './AdminManagementTab';
import AgoraTokenTab from './AgoraTokenTab';

enum TabType {
  DASHBOARD = 'dashboard',
  MANAGE_GROUPS = 'manage_groups',
  MANAGE_CHATS = 'manage_chats',
  NOTIFICATIONS = 'notifications',
  ADMIN_MANAGEMENT = 'admin_management',
  // AGORA_TOKENS = 'agora_tokens',
}

interface User {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber: string;
  createdAt: any;
  lastSeen: any;
  isOnline: boolean;
  profileImageUrl?: string | null;
  currentLocation?: {
    latitude: number;
    longitude: number;
    ipAddress: string;
    country: string;
    state: string;
    city: string;
    address?: string;
    timestamp: any;
  };
  lastLocationUpdate?: any;
  role?: 'user' | 'subadmin' | 'admin';
  callAccess?: boolean;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>(TabType.DASHBOARD);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminPermissions, setAdminPermissions] = useState<AdminPermissions | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Real-time update mechanism
  const [updateInterval, setUpdateInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      
      const response = await apiClient.getUsers();
      
      if (response && response.success && Array.isArray(response.users)) {
        
        // Check if data has actually changed to avoid unnecessary re-renders
        const hasChanges = JSON.stringify(users) !== JSON.stringify(response.users);
        if (hasChanges) {
          setUsers(response.users);
        }
      } else {
        console.error('Invalid response structure:', response);
        setError('Failed to fetch users - invalid response structure');
        setUsers([]);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError(error.message || 'Failed to fetch users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [users]);

  // Initialize real-time updates and permissions
  useEffect(() => {
    // Initial fetch
    fetchUsers();
    
    // Set up real-time updates every 2 seconds for instant responsiveness
    const interval = setInterval(() => {
      fetchUsers();
    }, 2000);
    
    setUpdateInterval(interval);

    // Cleanup on unmount
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [fetchUsers]);

  // Check admin permissions when user changes
  useEffect(() => {
    const fetchAdminPermissions = async () => {
      if (user) {
        try {
          const response = await apiClient.getAdminPermissions();
          if (response && response.success) {
            const permissions = checkAdminPermissions(user.uid, response.permissions);
            setAdminPermissions(permissions);
          } else {
            // Fallback to hardcoded permissions if API fails
            const permissions = checkAdminPermissions(user.uid, []);
            setAdminPermissions(permissions);
          }
        } catch (error) {
          console.error('Error fetching admin permissions:', error);
          // Fallback to hardcoded permissions if API fails
          const permissions = checkAdminPermissions(user.uid, []);
          setAdminPermissions(permissions);
        }
      }
    };

    fetchAdminPermissions();
  }, [user]);

  // Manual refresh function for user actions
  const handleManualRefresh = useCallback(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Logout handler
  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      setIsLoggingOut(true);
      try {
        await logout();
        // The AuthContext will handle redirecting to login
      } catch (error) {
        console.error('Error during logout:', error);
        alert('Error during logout. Please try again.');
      } finally {
        setIsLoggingOut(false);
      }
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Get available tabs based on permissions
  const tabs = adminPermissions ? getAvailableTabs(adminPermissions) : [
    { id: TabType.DASHBOARD, label: 'Dashboard', icon: '📊' },
    { id: TabType.MANAGE_GROUPS, label: 'Manage Groups', icon: '👥' },
    { id: TabType.MANAGE_CHATS, label: 'Manage Chats', icon: '💬' },
    { id: TabType.NOTIFICATIONS, label: 'Notifications', icon: '🔔' },
  ];

  // Debug logging

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className=" mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg font-bold">A</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Amigo Admin</h1>
                  <p className="text-sm text-gray-500">Control Panel</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 bg-gray-50 rounded-lg px-4 py-2">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user.email}</p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
              </div>
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Logout"
              >
                {isLoggingOut ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                ) : (
                  <LogOut className="h-4 w-4 mr-2" />
                )}
                <span className="hidden sm:inline">
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className=" mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className=" mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {activeTab === TabType.DASHBOARD && adminPermissions?.canAccessDashboard && (
            <DashboardTab 
              users={users} 
              loading={loading} 
              error={error} 
              onRefresh={handleManualRefresh} 
            />
          )}
          {activeTab === TabType.MANAGE_GROUPS && adminPermissions?.canManageGroups && (
            <ManageGroupsTab users={users} />
          )}
          {activeTab === TabType.MANAGE_CHATS && adminPermissions?.canManageChats && <ManageChatsTab />}
          {activeTab === TabType.NOTIFICATIONS && adminPermissions?.canManageNotifications && <NotificationTab />}
          {activeTab === TabType.ADMIN_MANAGEMENT && adminPermissions?.canManageAdmins && (
            <AdminManagementTab currentAdminUid={user.uid} />
          )}
          {/* {activeTab === TabType.AGORA_TOKENS && <AgoraTokenTab />} */}
        </div>
      </div>
    </div>
  );
}

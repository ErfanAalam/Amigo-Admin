'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';
import DashboardTab from './DashboardTab';
import ManageGroupsTab from './ManageGroupsTab';
import ManageChatsTab from './ManageChatsTab';
import NotificationTab from './NotificationTab';
import AgoraTokenTab from './AgoraTokenTab';

enum TabType {
  DASHBOARD = 'dashboard',
  MANAGE_GROUPS = 'manage_groups',
  MANAGE_CHATS = 'manage_chats',
  NOTIFICATIONS = 'notifications',
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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>(TabType.DASHBOARD);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time update mechanism
  const [updateInterval, setUpdateInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setError(null);
      
      const response = await apiClient.getUsers();
      
      if (response && response.success && Array.isArray(response.users)) {
        // console.log('Users fetched successfully:', response.users);
        
        // Check if data has actually changed to avoid unnecessary re-renders
        const hasChanges = JSON.stringify(users) !== JSON.stringify(response.users);
        if (hasChanges) {
          console.log('User data has changed, updating state...');
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

  // Initialize real-time updates
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

  // Manual refresh function for user actions
  const handleManualRefresh = useCallback(() => {
    console.log('Manual refresh triggered');
    fetchUsers();
  }, [fetchUsers]);

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

  const tabs = [
    { id: TabType.DASHBOARD, label: 'Dashboard', icon: '📊' },
    { id: TabType.MANAGE_GROUPS, label: 'Manage Groups', icon: '👥' },
    { id: TabType.MANAGE_CHATS, label: 'Manage Chats', icon: '💬' },
    { id: TabType.NOTIFICATIONS, label: 'Notifications', icon: '🔔' },
    // { id: TabType.AGORA_TOKENS, label: 'Agora Tokens', icon: '📞' },
  ];

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
              {/* Real-time status indicator */}
              <div className="flex items-center space-x-2 text-xs text-gray-500 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Real-time updates active</span>
                <span>•</span>
                <span>2s refresh</span>
              </div>
              
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
          {activeTab === TabType.DASHBOARD && (
            <DashboardTab 
              users={users} 
              loading={loading} 
              error={error} 
              onRefresh={handleManualRefresh} 
            />
          )}
          {activeTab === TabType.MANAGE_GROUPS && (
            <ManageGroupsTab users={users} />
          )}
          {activeTab === TabType.MANAGE_CHATS && <ManageChatsTab />}
          {activeTab === TabType.NOTIFICATIONS && <NotificationTab />}
          {/* {activeTab === TabType.AGORA_TOKENS && <AgoraTokenTab />} */}
        </div>
      </div>
    </div>
  );
}

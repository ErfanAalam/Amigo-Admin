'use client';

import React, { useState } from 'react';
import { MapPin, X, Globe, Map, Clock, User, Navigation, Shield, Phone, Crown } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

interface User {
  uid: string;
  // email: string;
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

interface DashboardTabProps {
  users: User[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const DashboardTab: React.FC<DashboardTabProps> = ({ users, loading, error, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'role' | 'callAccess';
    userId: string;
    currentValue: any;
    newValue: any;
    message: string;
  } | null>(null);
  const [lastUserCount, setLastUserCount] = useState(users.length);

  // Ensure users is always an array
  const safeUsers = Array.isArray(users) ? users : [];

  // Listen for real-time updates
  React.useEffect(() => {
    if (users.length !== lastUserCount && lastUserCount > 0) {
      // Data has been updated automatically
      showNotification('success', `Data updated in real-time - ${users.length} users loaded`);
    }
    setLastUserCount(users.length);
  }, [users, lastUserCount]);

  // Listen for individual user data changes
  React.useEffect(() => {
    if (users.length > 0 && lastUserCount > 0) {
      // Check for changes in user data (online status, roles, etc.)
      const hasUserDataChanges = users.some((user, index) => {
        const previousUser = safeUsers[index];
        return previousUser && (
          user.isOnline !== previousUser.isOnline ||
          user.role !== previousUser.role ||
          user.callAccess !== previousUser.callAccess ||
          user.lastSeen !== previousUser.lastSeen
        );
      });
      
      if (hasUserDataChanges) {
        showNotification('success', 'User data updated in real-time');
      }
    }
  }, [users, lastUserCount, safeUsers]);
  
  const filteredUsers = safeUsers.filter(user =>
    user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase())
    // user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleRoleUpdate = async (userId: string, newRole: 'user' | 'subadmin' | 'admin') => {
    const currentRole = selectedUser?.role || 'user';
    setConfirmAction({
      type: 'role',
      userId,
      currentValue: currentRole,
      newValue: newRole,
      message: `Are you sure you want to change ${selectedUser?.displayName}'s role from ${currentRole} to ${newRole}?`
    });
  };

  const handleCallAccessToggle = async (userId: string, currentAccess: boolean) => {
    setConfirmAction({
      type: 'callAccess',
      userId,
      currentValue: currentAccess,
      newValue: !currentAccess,
      message: `Are you sure you want to ${!currentAccess ? 'grant' : 'revoke'} call access for ${selectedUser?.displayName}?`
    });
  };

  const confirmAndExecuteAction = async () => {
    if (!confirmAction) return;

    setUpdatingRole(true);
    try {
      if (confirmAction.type === 'role') {
        await apiClient.updateUserRole(confirmAction.userId, confirmAction.newValue);
        showNotification('success', `User role updated to ${confirmAction.newValue}`);
      } else if (confirmAction.type === 'callAccess') {
        await apiClient.updateUserCallAccess(confirmAction.userId, confirmAction.newValue);
        showNotification('success', `Call access ${confirmAction.newValue ? 'granted' : 'revoked'} successfully`);
      }
      
      // Close modals after successful update
      setShowRoleModal(false);
      setSelectedUser(null);
      setConfirmAction(null);
      onRefresh(); // Refresh the user list
    } catch (error) {
      console.error('Error updating user:', error);
      const actionType = confirmAction.type === 'role' ? 'role' : 'call access';
      showNotification('error', `Failed to update ${actionType}. Please try again.`);
    } finally {
      setUpdatingRole(false);
    }
  };

  const getRoleBadge = (role: string | undefined) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <Crown className="h-3 w-3 mr-1" />
            Admin
          </span>
        );
      case 'subadmin':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <Shield className="h-3 w-3 mr-1" />
            Sub Admin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <User className="h-3 w-3 mr-1" />
            User
          </span>
        );
    }
  };

  const getCallAccessBadge = (hasAccess: boolean | undefined) => {
    if (hasAccess) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <Phone className="h-3 w-3 mr-1" />
          Call Access
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <Phone className="h-3 w-3 mr-1" />
        No Access
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-black text-lg">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Notification Display */}
      {notification && (
        <div className={`mb-8 rounded-xl p-4 shadow-sm border ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              notification.type === 'success' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <span className={`text-lg ${
                notification.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}>
                {notification.type === 'success' ? '✓' : '✕'}
              </span>
            </div>
            <div>
              <p className={`text-sm font-medium ${
                notification.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className={`ml-auto text-sm ${
                notification.type === 'success' ? 'text-green-600' : 'text-red-600'
              } hover:opacity-70`}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-8 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-lg">⚠️</span>
              </div>
              <div>
                <h3 className="text-red-800 font-medium">Error Loading Users</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
            <button
              onClick={onRefresh}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 border border-blue-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Total Users</p>
              <p className="text-3xl font-bold text-blue-900">{users.length}</p>
              <div className="flex items-center space-x-1 mt-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-blue-600">Live</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">👥</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 border border-green-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Online Users</p>
              <p className="text-3xl font-bold text-green-900">
                {users.filter(user => user.isOnline).length}
              </p>
              <div className="flex items-center space-x-1 mt-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600">Live</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">🟢</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-2xl p-6 border border-purple-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Sub Admins</p>
              <p className="text-3xl font-bold text-purple-900">
                {users.filter(user => user.role === 'subadmin').length}
              </p>
              <div className="flex items-center space-x-1 mt-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-purple-600">Live</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">🛡️</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-amber-100 rounded-2xl p-6 border border-orange-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">Call Access</p>
              <p className="text-3xl font-bold text-orange-900">
                {users.filter(user => user.callAccess).length}
              </p>
              <div className="flex items-center space-x-1 mt-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-orange-600">Live</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">📞</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
              <p className="text-gray-600 mt-1">Real-time monitoring of all registered users</p>
              <div className="flex items-center space-x-2 mt-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 font-medium">Live updates active</span>
              </div>
            </div>
            <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
              <input
                type="text"
                placeholder="Search users by name or phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 text-sm pr-4 py-3 border-2 text-black border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
              />
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Call Access
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Seen
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.displayName || 'No Name'}</div>
                        <div className="text-sm text-gray-500">{user.phoneNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      user.isOnline 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      <span className={`w-2 h-2 rounded-full mr-2 ${
                        user.isOnline ? 'bg-green-400' : 'bg-gray-400'
                      }`}></span>
                      {user.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    {getCallAccessBadge(user.callAccess)}
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(user.lastSeen) || 'online'}
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    {user.currentLocation ? (
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowLocationModal(true);
                        }}
                        className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        View Location
                      </button>
                    ) : (
                      <span className="text-gray-400 text-sm">No location</span>
                    )}
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowRoleModal(true);
                      }}
                      className="inline-flex items-center px-3 py-2 border border-purple-300 rounded-lg text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Edit Role
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-500">
                {searchTerm ? `No users match "${searchTerm}"` : 'No users available'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Location Modal */}
      {showLocationModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedUser.displayName}'s Location
                </h3>
                <button
                  onClick={() => {
                    setShowLocationModal(false);
                    setSelectedUser(null);
                  }}
                  className="text-gray-400 hover:text-black"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Current Location</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-black">Country:</span>
                      <span className="font-medium text-black">{selectedUser.currentLocation?.country || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black">State:</span>
                      <span className="font-medium text-black">{selectedUser.currentLocation?.state || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black">City:</span>
                      <span className="font-medium text-black">{selectedUser.currentLocation?.city || 'Unknown'}</span>
                    </div>
                    {selectedUser.currentLocation?.address && (
                      <div className="flex justify-between">
                        <span className="text-black">Address:</span>
                        <span className="font-medium text-right max-w-xs truncate" style={{ color: 'black' }}>
                          {selectedUser.currentLocation.address}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Coordinates</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-black">Latitude:</span>
                      <span className="font-mono text-black">{selectedUser.currentLocation?.latitude?.toFixed(8) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black">Longitude:</span>
                      <span className="font-mono text-black">{selectedUser.currentLocation?.longitude?.toFixed(8) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black">IP Address:</span>
                      <span className="font-mono text-black">{selectedUser.currentLocation?.ipAddress || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-black">Online Status:</span>
                      <span className={`font-medium ${selectedUser.isOnline ? 'text-green-600' : 'text-black'}`}>
                        {selectedUser.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black">Last Location Update:</span>
                      <span className="font-medium text-black">{formatDate(selectedUser.lastLocationUpdate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black">Last Seen:</span>
                      <span className="font-medium text-black">{formatDate(selectedUser.lastSeen) || 'online'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      if (selectedUser.currentLocation) {
                        const url = `https://www.google.com/maps?q=${selectedUser.currentLocation.latitude},${selectedUser.currentLocation.longitude}`;
                        window.open(url, '_blank');
                      }
                    }}
                    disabled={!selectedUser.currentLocation}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <Map className="h-4 w-4 mr-2" />
                    Open in Maps
                  </button>
                  <button
                    onClick={() => {
                      setShowLocationModal(false);
                      setSelectedUser(null);
                    }}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Management Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Manage {selectedUser.displayName}'s Role
                </h3>
                <button
                  onClick={() => {
                    setShowRoleModal(false);
                    setSelectedUser(null);
                  }}
                  className="text-gray-400 hover:text-black"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Current Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Role:</span>
                      {getRoleBadge(selectedUser.role)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Call Access:</span>
                      {getCallAccessBadge(selectedUser.callAccess)}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Role Management</h4>
                  
                  {/* Subadmin Toggle */}
                  <button
                    onClick={() => handleRoleUpdate(selectedUser.uid, selectedUser.role === 'subadmin' ? 'user' : 'subadmin')}
                    disabled={updatingRole}
                    className={`w-full flex items-center justify-center px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      selectedUser.role === 'subadmin'
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {updatingRole ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Shield className="h-4 w-4 mr-2" />
                    )}
                    {updatingRole ? 'Updating...' : (selectedUser.role === 'subadmin' ? 'Remove Sub Admin' : 'Make Sub Admin')}
                  </button>

                  {/* Call Access Toggle */}
                  <button
                    onClick={() => handleCallAccessToggle(selectedUser.uid, selectedUser.callAccess || false)}
                    disabled={updatingRole}
                    className={`w-full flex items-center justify-center px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      selectedUser.callAccess
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {updatingRole ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Phone className="h-4 w-4 mr-2" />
                    )}
                    {updatingRole ? 'Updating...' : (selectedUser.callAccess ? 'Remove Call Access' : 'Grant Call Access')}
                  </button>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => {
                      setShowRoleModal(false);
                      setSelectedUser(null);
                    }}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/80 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirm Action
                </h3>
                <button
                  onClick={() => setConfirmAction(null)}
                  className="text-gray-400 hover:text-black"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-yellow-600 text-lg">⚠️</span>
                    </div>
                    <p className="text-sm text-yellow-800 font-medium">
                      {confirmAction.message}
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={confirmAndExecuteAction}
                    disabled={updatingRole}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updatingRole ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : null}
                    {updatingRole ? 'Processing...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    disabled={updatingRole}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardTab;
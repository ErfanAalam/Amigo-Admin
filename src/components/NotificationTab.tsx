import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';

interface NotificationLog {
  id: string;
  sentBy: string;
  sentTo: string | string[];
  notification: {
    title: string;
    body: string;
  };
  data: any;
  timestamp: any;
  status: string;
  totalUsers?: number;
  successfulSends?: number;
  failedSends?: number;
}

export default function NotificationTab() {
  const { user } = useAuth();
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    body: '',
    type: 'general',
    userId: '',
  });
  const [bulkForm, setBulkForm] = useState({
    title: '',
    body: '',
    type: 'general',
    userIds: [] as string[],
    excludeUserId: '',
  });
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Fetch notification logs
  const fetchNotificationLogs = async () => {
    try {
      setLoading(true);
      // Use apiClient for authenticated requests
      const response = await fetch('/api/notifications/logs', {
        headers: {
          'Authorization': `Bearer ${await user?.getIdToken()}`,
        },
      });
      if (response.ok) {
        const logs = await response.json();
        setNotificationLogs(logs);
      } else {
        console.error('Failed to fetch notification logs:', response.status);
      }
    } catch (error) {
      console.error('Error fetching notification logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users for selection
  const fetchUsers = async () => {
    try {
      const usersData = await apiClient.getUsers();
      // Ensure usersData is an array
      if (usersData && usersData.success && Array.isArray(usersData.users)) {
        setUsers(usersData.users);
      } else {
        console.error('Invalid users response:', usersData);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchNotificationLogs();
    fetchUsers();
  }, []);

  // Send single notification
  const sendNotification = async () => {
    try {
      setLoading(true);
      
      // Get user's FCM token using apiClient instead of direct fetch
      const userResponse = await apiClient.getUsers();
      if (!userResponse.success || !Array.isArray(userResponse.users)) {
        alert('Failed to fetch users');
        return;
      }
      
      const targetUser = userResponse.users.find((u: any) => u.uid === notificationForm.userId);
      if (!targetUser) {
        alert('User not found');
        return;
      }

      // Check if user has FCM token (this would be stored in Firestore)
      // For now, we'll send the notification directly to the API
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`,
        },
        body: JSON.stringify({
          to: targetUser.uid, // Send to user ID, API will look up FCM token
          notification: {
            title: notificationForm.title,
            body: notificationForm.body,
          },
          data: {
            type: notificationForm.type,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert('Notification sent successfully!');
        setShowSendModal(false);
        setNotificationForm({ title: '', body: '', type: 'general', userId: '' });
        fetchNotificationLogs();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  // Send bulk notification
  const sendBulkNotification = async () => {
    try {
      setLoading(true);
      
      if (bulkForm.userIds.length === 0) {
        alert('Please select users to notify');
        return;
      }

      const response = await fetch('/api/notifications/send-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`,
        },
        body: JSON.stringify({
          userIds: bulkForm.userIds,
          notification: {
            title: bulkForm.title,
            body: bulkForm.body,
          },
          data: {
            type: bulkForm.type,
            timestamp: new Date().toISOString(),
          },
          excludeUserId: bulkForm.excludeUserId || undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Bulk notification sent! Success: ${result.successfulSends}, Failed: ${result.failedSends}`);
        setShowBulkModal(false);
        setBulkForm({ title: '', body: '', type: 'general', userIds: [], excludeUserId: '' });
        setSelectedUsers([]);
        fetchNotificationLogs();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error sending bulk notification:', error);
      alert('Failed to send bulk notification');
    } finally {
      setLoading(false);
    }
  };

  // Toggle user selection for bulk notifications
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
    setBulkForm(prev => ({ ...prev, userIds: selectedUsers }));
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Notification Management</h2>
        
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setShowSendModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Send Single Notification
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Send Bulk Notification
          </button>
        </div>
      </div>

      {/* Notification Logs */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Notification Logs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sent By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sent To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center">
                    Loading...
                  </td>
                </tr>
              ) : notificationLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No notification logs found
                  </td>
                </tr>
              ) : (
                notificationLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.sentBy}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Array.isArray(log.sentTo) ? `${log.sentTo.length} users` : log.sentTo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.notification.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        log.status === 'success' ? 'bg-green-100 text-green-800' :
                        log.status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTimestamp(log.timestamp)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send Single Notification Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Send Notification</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User
                </label>
                <select
                  value={notificationForm.userId}
                  onChange={(e) => setNotificationForm(prev => ({ ...prev, userId: e.target.value }))}
                  className="w-full px-3 py-2 border text-black border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a user</option>
                  {users.map(user => (
                    <option key={user.uid} value={user.uid}>
                      {user.displayName || user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={notificationForm.title}
                  onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border text-black border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Notification title"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={notificationForm.body}
                  onChange={(e) => setNotificationForm(prev => ({ ...prev, body: e.target.value }))}
                  className="w-full px-3 py-2 border text-black border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Notification message"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={sendNotification}
                  disabled={loading || !notificationForm.title || !notificationForm.body || !notificationForm.userId}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors"
                >
                  {loading ? 'Sending...' : 'Send'}
                </button>
                <button
                  onClick={() => setShowSendModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Bulk Notification Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Send Bulk Notification</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Users
                </label>
                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {users.map(user => (
                    <label key={user.uid} className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.uid)}
                        onChange={() => toggleUserSelection(user.uid)}
                        className="mr-2"
                      />
                      <span className="text-sm">{user.displayName || user.email}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={bulkForm.title}
                  onChange={(e) => setBulkForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Notification title"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={bulkForm.body}
                  onChange={(e) => setBulkForm(prev => ({ ...prev, body: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Notification message"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={sendBulkNotification}
                  disabled={loading || !bulkForm.title || !bulkForm.body || selectedUsers.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors"
                >
                  {loading ? 'Sending...' : `Send to ${selectedUsers.length} users`}
                </button>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

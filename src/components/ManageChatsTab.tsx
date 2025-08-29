'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';
import ChatMessagesModal from './ChatMessagesModal';

interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
}

interface InnerGroup {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  members: string[];
  createdAt: Date;
}

interface Group {
  id: string;
  name: string;
  description: string;
  innerGroups: InnerGroup[];
  members: string[];
  createdAt: Date;
  isActive: boolean;
}

interface Chat {
  id: string;
  participants: string[];
  participantNames: string[];
  lastMessage: string;
  lastMessageType: string;
  lastMessageTime: any;
  lastUpdated: any;
  groupId?: string;
  innerGroupId?: string;
  groupName?: string;
  innerGroupName?: string;
  chatType: 'direct' | 'group' | 'innerGroup';
  messages?: any[];
}

interface ChatDetail {
  id: string;
  type: 'direct' | 'group' | 'innerGroup';
  title: string;
  subtitle: string;
  participants: User[];
  lastMessage: string;
  lastMessageTime: any;
  messageCount: number;
}

const ManageChatsTab: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [directChats, setDirectChats] = useState<Chat[]>([]);
  const [groupChats, setGroupChats] = useState<Chat[]>([]);
  const [innerGroupChats, setInnerGroupChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<ChatDetail | null>(null);
  const [showChatDetail, setShowChatDetail] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [selectedChatForMessages, setSelectedChatForMessages] = useState<{id: string, title: string, subtitle: string} | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  
  // Pagination state for direct chats
  const [currentPage, setCurrentPage] = useState(1);
  const [chatsPerPage] = useState(10);

  useEffect(() => {
    fetchData();
  }, []);

  // Reset to first page when direct chats change
  useEffect(() => {
    setCurrentPage(1);
  }, [directChats.length]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchGroups(),
        fetchDirectChats(),
        fetchUsers()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDirectChats = async () => {
    try {
      const response = await apiClient.getChats();
      if (response.success) {
        // Categorize chats by type based on actual Firebase structure
        const direct = response.chats.filter((chat: any) => chat.chatType === 'direct');
        const innerGroup = response.chats.filter((chat: any) => chat.chatType === 'innerGroup');
        
        setDirectChats(direct);
        setInnerGroupChats(innerGroup);
        // Note: groupChats will be empty since user-created groups don't have separate chat documents
        setGroupChats([]);
      }
    } catch (error) {
      console.error('Error fetching direct chats:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await apiClient.getGroups();
      if (response.success) {
        setGroups(response.groups);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await apiClient.getUsers();
      if (response.success) {
        setUsers(response.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const getUserById = (userId: string) => {
    return users.find(user => user.id === userId);
  };

  const getUserNames = (userIds: string[]) => {
    return userIds.map(id => getUserById(id)?.displayName || 'Unknown User').join(', ');
  };

  const findChatId = (groupId: string, innerGroupId?: string) => {
    if (innerGroupId) {
      // For inner groups, the chat ID is stored as groupId_innerGroupId in the chats collection
      const innerGroupChatId = `${groupId}_${innerGroupId}`;
      // Check if this inner group chat exists in the chats collection
      const innerGroupChat = innerGroupChats.find(chat => 
        chat.id === innerGroupChatId || (chat.groupId === groupId && chat.innerGroupId === innerGroupId)
      );
      return innerGroupChat?.id || innerGroupChatId; // Return the constructed ID if no chat found
    } else {
      // For user-created groups, there's no separate chat document
      // The messages are stored directly in groups/{groupId}/messages
      // So we return the groupId itself, which the API will use to fetch from the groups collection
      return groupId;
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleViewChat = (chat: ChatDetail) => {
    setSelectedChat(chat);
    setShowChatDetail(true);
  };

  const handleViewMessages = (chatId: string, title: string, subtitle: string) => {
    setSelectedChatForMessages({ id: chatId, title, subtitle });
    setShowMessagesModal(true);
    setShowChatDetail(false); // Close the detail modal
  };

  const handleDeleteChat = async (chatId: string) => {
    if (confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      try {
        const response = await apiClient.deleteChat(chatId);
        if (response.success) {
          fetchData(); // Refresh data
        }
      } catch (error) {
        console.error('Error deleting chat:', error);
      }
    }
  };

  const handleArchiveChat = async (chatId: string) => {
    try {
      const response = await apiClient.archiveChat(chatId);
      if (response.success) {
        fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Error archiving chat:', error);
    }
  };

  // Pagination logic for direct chats
  const indexOfLastChat = currentPage * chatsPerPage;
  const indexOfFirstChat = indexOfLastChat - chatsPerPage;
  const currentChats = directChats.slice(indexOfFirstChat, indexOfLastChat);
  const totalPages = Math.ceil(directChats.length / chatsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleDeleteMessage = async (chatId: string, messageId: string) => {
    if (confirm('Are you sure you want to permanently delete this message? This action cannot be undone.')) {
      try {
        // Call API to delete the specific message
        const response = await apiClient.deleteMessage(chatId, messageId);
        if (response.success) {
          // Refresh the messages modal if it's open
          if (showMessagesModal && selectedChatForMessages?.id === chatId) {
            // Trigger a refresh of messages
            // This will be handled by the ChatMessagesModal component
          }
        } else {
          alert('Failed to delete message');
        }
      } catch (error) {
        console.error('Error deleting message:', error);
        alert('Error deleting message');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading chat management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header Section */}
      <div className="mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Chat Management</h2>
          <p className="text-gray-600 mt-2">Manage all groups, inner groups, and direct conversations</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 border border-blue-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Total Groups</p>
              <p className="text-3xl font-bold text-blue-900">{groups.length}</p>
              <p className="text-xs text-blue-600 mt-1">
                {groups.filter(g => g.innerGroups && g.innerGroups.length > 0).length} Admin Managed • {groups.filter(g => !g.innerGroups || g.innerGroups.length === 0).length} User Created
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">👥</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 border border-green-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Total Inner Groups</p>
              <p className="text-3xl font-bold text-green-900">
                {groups.reduce((total, group) => total + (group.innerGroups?.length || 0), 0)}
              </p>
              <p className="text-xs text-green-600 mt-1">Admin Created</p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">🎯</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-2xl p-6 border border-purple-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Direct Chats</p>
              <p className="text-3xl font-bold text-purple-900">{directChats.length}</p>
              <p className="text-xs text-purple-600 mt-1">User Conversations</p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">💬</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-50 to-orange-100 rounded-2xl p-6 border border-yellow-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-600 text-sm font-medium">Total Members</p>
              <p className="text-3xl font-bold text-yellow-900">
                {groups.reduce((total, group) => total + group.members.length, 0)}
              </p>
              <p className="text-xs text-yellow-600 mt-1">Across All Groups</p>
            </div>
            <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">👤</span>
            </div>
          </div>
        </div>
      </div>

      {/* Groups and Inner Groups Section */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Groups & Inner Groups</h3>
        
        {/* Groups with Inner Groups (Admin Created) */}
        {groups.filter(g => g.innerGroups && g.innerGroups.length > 0).length > 0 && (
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
              Admin Managed Groups
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {groups.filter(g => g.innerGroups && g.innerGroups.length > 0).map((group) => (
                <div key={group.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-200">
                  {/* Group Header */}
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                          <span className="text-white font-bold text-lg">A</span>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{group.name}</h4>
                          <p className="text-sm text-gray-600">{group.description}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                              Admin Managed
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              group.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {group.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Group Content */}
                  <div className="p-6">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{group.innerGroups.length}</p>
                        <p className="text-xs text-blue-600 font-medium">Inner Groups</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{group.members.length}</p>
                        <p className="text-xs text-green-600 font-medium">Members</p>
                      </div>
                    </div>

                    {/* Inner Groups */}
                    {group.innerGroups.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-3">Inner Groups</h5>
                        <div className="space-y-2">
                          {group.innerGroups.map((innerGroup) => (
                            <div key={innerGroup.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{innerGroup.name}</p>
                                <p className="text-xs text-gray-500">
                                  {formatTime(innerGroup.startTime)} - {formatTime(innerGroup.endTime)}
                                </p>
                                <p className="text-xs text-gray-400">{innerGroup.members.length} members</p>
                                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full mt-1 inline-block">
                                  Inner Group
                                </span>
                              </div>
                              <div className="flex flex-col space-y-2">
                                <button
                                  onClick={() => handleViewChat({
                                    id: `${group.id}-${innerGroup.id}`,
                                    type: 'innerGroup',
                                    title: `${group.name} - ${innerGroup.name}`,
                                    subtitle: `Admin Inner Group • ${innerGroup.members.length} members`,
                                    participants: innerGroup.members.map(id => getUserById(id)).filter(Boolean) as User[],
                                    lastMessage: 'View inner group chat',
                                    lastMessageTime: innerGroup.createdAt,
                                    messageCount: 0
                                  })}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors duration-200"
                                >
                                  View Chat
                                </button>
                                <button
                                  onClick={() => {
                                    const chatId = findChatId(group.id, innerGroup.id);
                                    if (chatId) {
                                      handleViewMessages(chatId, `${group.name} - ${innerGroup.name}`, `Inner Group • ${innerGroup.members.length} members`);
                                    } else {
                                      alert('No chat found for this inner group');
                                    }
                                  }}
                                  className="text-purple-600 hover:text-purple-800 text-sm font-medium px-3 py-1 rounded-lg hover:bg-purple-50 transition-colors duration-200"
                                >
                                  View Messages
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Group Chat Button */}
                    <div className="space-y-2">
                      <button
                        onClick={() => handleViewChat({
                          id: group.id,
                          type: 'group',
                          title: group.name,
                          subtitle: `Admin Managed Group • ${group.members.length} members`,
                          participants: group.members.map(id => getUserById(id)).filter(Boolean) as User[],
                          lastMessage: 'View group chat',
                          lastMessageTime: group.createdAt,
                          messageCount: 0
                        })}
                        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        View Group Chat
                      </button>
                      <button
                        onClick={() => {
                          const chatId = findChatId(group.id);
                          if (chatId) {
                            handleViewMessages(chatId, group.name, `Admin Managed Group • ${group.members.length} members`);
                          } else {
                            alert('No chat found for this group');
                          }
                        }}
                        className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        View Group Messages
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Groups without Inner Groups (User Created) */}
        {groups.filter(g => !g.innerGroups || g.innerGroups.length === 0).length > 0 && (
          <div className="mb-8">
            <h4 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
              User Created Groups
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {groups.filter(g => !g.innerGroups || g.innerGroups.length === 0).map((group) => (
                <div key={group.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-200">
                  {/* Group Header */}
                  <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                          <span className="text-white font-bold text-lg">U</span>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{group.name}</h4>
                          <p className="text-sm text-gray-600">{group.description}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                              User Group
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              group.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {group.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Group Content */}
                  <div className="p-6">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">0</p>
                        <p className="text-xs text-green-600 font-medium">Inner Groups</p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{group.members.length}</p>
                        <p className="text-xs text-blue-600 font-medium">Members</p>
                      </div>
                    </div>

                    {/* Group Chat Button */}
                    <div className="space-y-2">
                      <button
                        onClick={() => handleViewChat({
                          id: group.id,
                          type: 'group',
                          title: group.name,
                          subtitle: `User Created Group • ${group.members.length} members`,
                          participants: group.members.map(id => getUserById(id)).filter(Boolean) as User[],
                          lastMessage: 'View group chat',
                          lastMessageTime: group.createdAt,
                          messageCount: 0
                        })}
                        className="w-full bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        View Group Chat
                      </button>
                      <button
                        onClick={() => {
                          const chatId = findChatId(group.id);
                          if (chatId) {
                            handleViewMessages(chatId, group.name, `User Created Group • ${group.members.length} members`);
                          } else {
                            alert('No chat found for this group');
                          }
                        }}
                        className="w-full bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        View Group Messages
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {groups.length === 0 && (
          <div className="text-center py-16">
            <div className="text-gray-400 text-6xl mb-4">👥</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No groups created yet</h3>
            <p className="text-gray-500">Groups will appear here when they are created</p>
          </div>
        )}
      </div>

      {/* Direct Chats Section */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Direct Conversations</h3>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100">
            <div>
              <h4 className="text-xl font-bold text-gray-900">User-to-User Chats</h4>
              <p className="text-gray-600 mt-1">Monitor direct conversations between users • Showing {chatsPerPage} chats per page</p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participants
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Message
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {currentChats.map((chat) => (
                  <tr key={chat.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {chat.participantNames[0]?.charAt(0)?.toUpperCase() || 'C'}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {chat.participantNames.slice(0, 2).join(', ')}
                            {chat.participantNames.length > 2 && ` +${chat.participantNames.length - 2} more`}
                          </div>
                          <div className="text-sm text-gray-500">{chat.participants.length} participants</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="max-w-xs">
                        <p className="text-sm text-gray-900 truncate">{chat.lastMessage || 'No messages yet'}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        chat.lastMessageType === 'text' 
                          ? 'bg-blue-100 text-blue-800'
                          : chat.lastMessageType === 'image'
                          ? 'bg-green-100 text-green-800'
                          : chat.lastMessageType === 'video'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {chat.lastMessageType === 'text' && '📝'}
                        {chat.lastMessageType === 'image' && '📷'}
                        {chat.lastMessageType === 'video' && '🎥'}
                        {chat.lastMessageType === 'document' && '📄'}
                        {chat.lastMessageType === 'voice' && '🎤'}
                        {!['text', 'image', 'video', 'document', 'voice'].includes(chat.lastMessageType) && '📎'}
                        {chat.lastMessageType || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(chat.lastMessageTime)}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewChat({
                            id: chat.id,
                            type: 'direct',
                            title: chat.participantNames.join(', '),
                            subtitle: `Direct Chat • ${chat.participants.length} participants`,
                            participants: chat.participants.map(id => getUserById(id)).filter(Boolean) as User[],
                            lastMessage: chat.lastMessage || 'No messages yet',
                            lastMessageTime: chat.lastMessageTime,
                            messageCount: 0
                          })}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200"
                        >
                          View Chat
                        </button>
                        <button
                          onClick={() => handleViewMessages(chat.id, chat.participantNames.join(', '), `Direct Chat • ${chat.participants.length} participants`)}
                          className="bg-purple-100 hover:bg-purple-200 text-purple-800 px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200"
                        >
                          View Messages
                        </button>
                        <button
                          onClick={() => handleArchiveChat(chat.id)}
                          className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200"
                        >
                          Archive
                        </button>
                        <button
                          onClick={() => handleDeleteChat(chat.id)}
                          className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {directChats.length === 0 && (
              <div className="text-center py-16">
                <div className="text-gray-400 text-6xl mb-4">💬</div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No direct chats available</h3>
                <p className="text-gray-500">Direct chats will appear here when users start conversations</p>
              </div>
            )}
          </div>
          
          {/* Pagination Controls */}
          {directChats.length > 0 && totalPages > 1 && (
            <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {indexOfFirstChat + 1} to {Math.min(indexOfLastChat, directChats.length)} of {directChats.length} chats
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    Previous
                  </button>
                  
                  {/* Page Numbers */}
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Detail Modal */}
      {showChatDetail && selectedChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-8 border shadow-2xl rounded-2xl bg-white w-full">
            <div className="mt-3">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedChat.title}</h3>
                  <p className="text-gray-600 mt-1">{selectedChat.subtitle}</p>
                </div>
                <button
                  onClick={() => setShowChatDetail(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>

              {/* Chat Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Participants */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Participants</h4>
                  <div className="space-y-3">
                    {selectedChat.participants.map((user, index) => (
                      <div key={user.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.displayName || 'No Name'}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chat Stats */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Chat Information</h4>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-600">Chat Type</p>
                      <p className="text-lg font-semibold text-blue-900 capitalize">{selectedChat.type}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-600">Last Message</p>
                      <p className="text-lg font-semibold text-green-900">{selectedChat.lastMessage}</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm font-medium text-purple-600">Last Activity</p>
                      <p className="text-lg font-semibold text-purple-900">{formatDate(selectedChat.lastMessageTime)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
                <button
                  onClick={() => setShowChatDetail(false)}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors duration-200"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleViewMessages(selectedChat.id, selectedChat.title, selectedChat.subtitle);
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors duration-200"
                >
                  View Messages
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages Modal */}
      {showMessagesModal && selectedChatForMessages && (
        <ChatMessagesModal
          isOpen={showMessagesModal}
          onClose={() => setShowMessagesModal(false)}
          chatId={selectedChatForMessages.id}
          chatTitle={selectedChatForMessages.title}
          chatSubtitle={selectedChatForMessages.subtitle}
        />
      )}
    </div>
  );
};

export default ManageChatsTab;
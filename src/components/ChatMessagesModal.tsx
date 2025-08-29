'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  timestamp: Date;
  type: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
}

interface ChatMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatTitle: string;
  chatSubtitle: string;
}

const ChatMessagesModal: React.FC<ChatMessagesModalProps> = ({
  isOpen,
  onClose,
  chatId,
  chatTitle,
  chatSubtitle
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatType, setChatType] = useState<string>('');
  const [chatInfo, setChatInfo] = useState<any>({});

  useEffect(() => {
    if (isOpen && chatId) {
      fetchMessages();
    }
  }, [isOpen, chatId]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getChatMessages(chatId);
      if (response.success) {
        setMessages(response.messages);
        setChatType(response.chatType || 'unknown');
        setChatInfo(response.chatInfo || {});
        console.log('Chat messages response:', response);
      } else {
        setError('Failed to fetch messages');
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      setError(error.message || 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (confirm('Are you sure you want to permanently delete this message? This action cannot be undone.')) {
      try {
        const response = await apiClient.deleteMessage(chatId, messageId);
        if (response.success) {
          // Remove the deleted message from the local state
          setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
        } else {
          alert('Failed to delete message');
        }
      } catch (error) {
        console.error('Error deleting message:', error);
        alert('Error deleting message');
      }
    }
  };

  const formatMessageTime = (timestamp: Date) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleString();
  };

  const renderMessage = (message: Message) => {
    return (
      <div key={message.id} className="mb-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">
              {message.senderName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">{message.senderName}</span>
                <span className="text-xs text-gray-500">{formatMessageTime(message.timestamp)}</span>
              </div>
              <button
                onClick={() => handleDeleteMessage(message.id)}
                className="text-red-500 hover:text-red-700 text-xs p-1 rounded hover:bg-red-50 transition-colors duration-200"
                title="Delete message permanently"
              >
                🗑️
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              {message.type === 'text' && (
                <p className="text-sm text-gray-900">{message.text}</p>
              )}
              {message.type === 'image' && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-900">{message.text}</p>
                  {message.mediaUrl && (
                    <img 
                      src={message.mediaUrl} 
                      alt="Image message" 
                      className="max-w-xs rounded-lg"
                    />
                  )}
                </div>
              )}
              {message.type === 'video' && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-900">{message.text}</p>
                  {message.mediaUrl && (
                    <video 
                      src={message.mediaUrl} 
                      controls 
                      className="max-w-xs rounded-lg"
                    />
                  )}
                </div>
              )}
              {message.type === 'document' && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-900">{message.text}</p>
                  {message.mediaUrl && (
                    <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg">
                      <span className="text-blue-600">📄</span>
                      <a 
                        href={message.mediaUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Document
                      </a>
                    </div>
                  )}
                </div>
              )}
              {message.type === 'voice' && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-900">{message.text}</p>
                  {message.mediaUrl && (
                    <audio 
                      src={message.mediaUrl} 
                      controls 
                      className="w-full"
                    />
                  )}
                </div>
              )}
              {!['text', 'image', 'video', 'document', 'voice'].includes(message.type) && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-900">{message.text}</p>
                  <span className="text-xs text-gray-500">Message type: {message.type}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative  mx-auto p-8 border bg-white w-full">
        <div className="mt-3">
          {/* Modal Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{chatTitle}</h3>
              <p className="text-gray-600 mt-1">{chatSubtitle}</p>
              {chatType && (
                <p className="text-xs text-gray-500 mt-1">Chat Type: {chatType}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>

          {/* Messages Content */}
          <div className=" overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading messages...</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-red-600">⚠️</span>
                  <span className="text-red-800">{error}</span>
                </div>
                <button
                  onClick={fetchMessages}
                  className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
                >
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && messages.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-2">💬</div>
                <p className="text-gray-600">No messages found in this chat</p>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-left">
                  <p className="text-xs text-gray-500 mb-2">Debug Information:</p>
                  <p className="text-xs text-gray-500">Chat ID: {chatId}</p>
                  <p className="text-xs text-gray-500">Chat Type: {chatType || 'unknown'}</p>
                  <p className="text-xs text-gray-500">This could mean:</p>
                  <ul className="text-xs text-gray-500 mt-1 ml-4 list-disc">
                    <li>The chat hasn't been created yet</li>
                    <li>No messages have been sent in this chat</li>
                    <li>The chat ID doesn't match the database structure</li>
                  </ul>
                </div>
              </div>
            )}

            {!loading && !error && messages.length > 0 && (
              <div className="space-y-4">
                {messages.map(renderMessage)}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors duration-200"
            >
              Close
            </button>
            <button
              onClick={fetchMessages}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors duration-200"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessagesModal;

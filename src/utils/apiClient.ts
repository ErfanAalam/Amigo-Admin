import { auth } from '../../firebaseConfig';

class ApiClient {
  private async getAuthToken(): Promise<string | null> {
    try {
      const user = auth.currentUser;
      if (!user) return null;
      
      const token = await user.getIdToken();
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const token = await this.getAuthToken();
    
    if (!token) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // User management
  async getUsers(searchTerm?: string) {
    const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
    return this.makeRequest(`/users${query}`);
  }

  async updateUserRole(userId: string, role: 'user' | 'subadmin' | 'admin') {
    return this.makeRequest(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async updateUserCallAccess(userId: string, callAccess: boolean) {
    return this.makeRequest(`/users/${userId}/call-access`, {
      method: 'PUT',
      body: JSON.stringify({ callAccess }),
    });
  }

  // Group management
  async getGroups() {
    return this.makeRequest('/groups');
  }

  async createGroup(groupData: { name: string; description: string; members: string[] }) {
    return this.makeRequest('/groups', {
      method: 'POST',
      body: JSON.stringify(groupData),
    });
  }

  async createInnerGroup(groupId: string, innerGroupData: { 
    name: string; 
    startTime: string; 
    endTime: string; 
    members: string[] 
  }) {
    return this.makeRequest(`/groups/${groupId}/inner-groups`, {
      method: 'POST',
      body: JSON.stringify(innerGroupData),
    });
  }

  async addMemberToGroup(groupId: string, userId: string) {
    return this.makeRequest(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async removeMemberFromGroup(groupId: string, userId: string) {
    return this.makeRequest(`/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  async updateGroupInnerGroups(groupId: string, innerGroups: any[]) {
    return this.makeRequest(`/groups/${groupId}/inner-groups`, {
      method: 'PUT',
      body: JSON.stringify({ innerGroups }),
    });
  }

  // Standalone inner group management
  async getStandaloneInnerGroups() {
    return this.makeRequest('/inner-groups');
  }

  async createStandaloneInnerGroup(innerGroupData: { 
    name: string; 
    description?: string;
    startTime: string; 
    endTime: string; 
    members: string[] 
  }) {
    return this.makeRequest('/inner-groups', {
      method: 'POST',
      body: JSON.stringify(innerGroupData),
    });
  }

  async updateStandaloneInnerGroup(innerGroupId: string, innerGroupData: { 
    name: string; 
    description?: string;
    startTime: string; 
    endTime: string; 
    members: string[] 
  }) {
    return this.makeRequest(`/inner-groups/${innerGroupId}`, {
      method: 'PUT',
      body: JSON.stringify(innerGroupData),
    });
  }

  async deleteStandaloneInnerGroup(innerGroupId: string) {
    return this.makeRequest(`/inner-groups/${innerGroupId}`, {
      method: 'DELETE',
    });
  }

  async deleteGroup(groupId: string) {
    return this.makeRequest(`/groups?groupId=${groupId}`, {
      method: 'DELETE',
    });
  }

  // Chat management
  async getChats() {
    return this.makeRequest('/chats');
  }

  async getChatMessages(chatId: string) {
    return this.makeRequest(`/chats/${chatId}`);
  }

  async deleteChat(chatId: string) {
    return this.makeRequest(`/chats/${chatId}`, {
      method: 'DELETE',
    });
  }

  async archiveChat(chatId: string) {
    return this.makeRequest(`/chats/${chatId}/archive`, {
      method: 'POST',
    });
  }

  async deleteMessage(chatId: string, messageId: string) {
    return this.makeRequest(`/chats/${chatId}/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  // Authentication
  async verifyAuth() {
    const token = await this.getAuthToken();
    if (!token) return null;

    return fetch('/api/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken: token }),
    }).then(res => res.json());
  }
}

export const apiClient = new ApiClient();

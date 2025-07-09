const API_BASE_URL = 'http://localhost:3001/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth methods
  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async logout() {
    const result = await this.request('/auth/logout', { method: 'POST' });
    this.clearToken();
    return result;
  }

  // Task methods
  async getTasks() {
    return this.request('/tasks');
  }

  async createTask(taskData: any) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateTask(taskId: string, updates: any) {
    return this.request(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteTask(taskId: string) {
    return this.request(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  async addCollaborator(taskId: string, email: string, permission: 'read' | 'write') {
    return this.request(`/tasks/${taskId}/collaborators`, {
      method: 'POST',
      body: JSON.stringify({ email, permission }),
    });
  }

  async removeCollaborator(taskId: string, userId: string) {
    return this.request(`/tasks/${taskId}/collaborators/${userId}`, {
      method: 'DELETE',
    });
  }

  async searchUsers(query: string) {
    return this.request(`/tasks/search-users?q=${encodeURIComponent(query)}`);
  }
}

export const apiClient = new ApiClient();
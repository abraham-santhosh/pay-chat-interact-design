import axios, { AxiosInstance, AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          
          const { token, refreshToken: newRefreshToken } = response.data;
          localStorage.setItem('token', token);
          localStorage.setItem('refreshToken', newRefreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  preferences: {
    currency: string;
    notifications: {
      email: boolean;
      push: boolean;
    };
  };
  groups: string[];
  lastLogin: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  createdBy: User;
  members: GroupMember[];
  membersCount: number;
  totalExpenses: number;
  totalSettled: number;
  settings: GroupSettings;
  inviteCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  user: User;
  role: 'admin' | 'member';
  joinedAt: string;
  isActive: boolean;
}

export interface GroupSettings {
  allowMemberInvites: boolean;
  autoSettleDebts: boolean;
  currency: string;
  splitMethod: 'equal' | 'exact' | 'percentage';
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  paidBy: User;
  participants: ExpenseParticipant[];
  group: Group;
  splitMethod: 'equal' | 'exact' | 'percentage';
  date: string;
  settled: boolean;
  settledAt?: string;
  settledBy?: User;
  settlements: Settlement[];
  notes?: string;
  tags: string[];
  location?: {
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
  };
  receipt?: {
    filename: string;
    originalName: string;
  };
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseParticipant {
  user: User;
  share: number;
  shareType: 'equal' | 'exact' | 'percentage';
}

export interface Settlement {
  from: User;
  to: User;
  amount: number;
  method: 'cash' | 'upi' | 'bank_transfer' | 'card' | 'other';
  transactionId?: string;
  settledAt: string;
}

// Auth API
export const authAPI = {
  register: async (data: { name: string; email: string; password: string }) => {
    const response: AxiosResponse = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (data: { email: string; password: string }) => {
    const response: AxiosResponse = await api.post('/auth/login', data);
    return response.data;
  },

  logout: async () => {
    const response: AxiosResponse = await api.post('/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    return response.data;
  },

  getProfile: async (): Promise<{ user: User }> => {
    const response: AxiosResponse = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (data: Partial<User>) => {
    const response: AxiosResponse = await api.put('/auth/profile', data);
    return response.data;
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const response: AxiosResponse = await api.put('/auth/password', data);
    return response.data;
  },
};

// Groups API
export const groupsAPI = {
  getGroups: async (): Promise<{ groups: Group[] }> => {
    const response: AxiosResponse = await api.get('/groups');
    return response.data;
  },

  getGroup: async (groupId: string): Promise<{ group: Group }> => {
    const response: AxiosResponse = await api.get(`/groups/${groupId}`);
    return response.data;
  },

  createGroup: async (data: { name: string; description?: string }): Promise<{ group: Group }> => {
    const response: AxiosResponse = await api.post('/groups', data);
    return response.data;
  },

  updateGroup: async (groupId: string, data: { name?: string; description?: string }) => {
    const response: AxiosResponse = await api.put(`/groups/${groupId}`, data);
    return response.data;
  },

  updateGroupSettings: async (groupId: string, settings: Partial<GroupSettings>) => {
    const response: AxiosResponse = await api.put(`/groups/${groupId}/settings`, { settings });
    return response.data;
  },

  addMember: async (groupId: string, data: { email: string; role?: 'admin' | 'member' }) => {
    const response: AxiosResponse = await api.post(`/groups/${groupId}/members`, data);
    return response.data;
  },

  removeMember: async (groupId: string, memberId: string) => {
    const response: AxiosResponse = await api.delete(`/groups/${groupId}/members/${memberId}`);
    return response.data;
  },

  updateMemberRole: async (groupId: string, memberId: string, role: 'admin' | 'member') => {
    const response: AxiosResponse = await api.put(`/groups/${groupId}/members/${memberId}/role`, { role });
    return response.data;
  },

  joinGroup: async (inviteCode: string): Promise<{ group: Group }> => {
    const response: AxiosResponse = await api.post(`/groups/join/${inviteCode}`);
    return response.data;
  },

  getBalances: async (groupId: string) => {
    const response: AxiosResponse = await api.get(`/groups/${groupId}/balances`);
    return response.data;
  },

  getActivity: async (groupId: string, page?: number, limit?: number) => {
    const response: AxiosResponse = await api.get(`/groups/${groupId}/activity`, {
      params: { page, limit }
    });
    return response.data;
  },

  deleteGroup: async (groupId: string) => {
    const response: AxiosResponse = await api.delete(`/groups/${groupId}`);
    return response.data;
  },
};

// Expenses API
export const expensesAPI = {
  getGroupExpenses: async (groupId: string, params?: { page?: number; limit?: number; category?: string; settled?: boolean }) => {
    const response: AxiosResponse = await api.get(`/expenses/group/${groupId}`, { params });
    return response.data;
  },

  getUserExpenses: async (params?: { page?: number; limit?: number }) => {
    const response: AxiosResponse = await api.get('/expenses/user', { params });
    return response.data;
  },

  getExpense: async (expenseId: string): Promise<{ expense: Expense }> => {
    const response: AxiosResponse = await api.get(`/expenses/${expenseId}`);
    return response.data;
  },

  createExpense: async (data: {
    description: string;
    amount: number;
    currency?: string;
    category?: string;
    paidBy: string;
    participants: Array<string | { user: string; share: number; shareType?: string }>;
    group: string;
    splitMethod?: string;
    notes?: string;
    tags?: string[];
    location?: any;
    date?: string;
  }): Promise<{ expense: Expense }> => {
    const response: AxiosResponse = await api.post('/expenses', data);
    return response.data;
  },

  updateExpense: async (expenseId: string, data: any) => {
    const response: AxiosResponse = await api.put(`/expenses/${expenseId}`, data);
    return response.data;
  },

  settleExpense: async (expenseId: string, settlements?: Settlement[]) => {
    const response: AxiosResponse = await api.post(`/expenses/${expenseId}/settle`, { settlements });
    return response.data;
  },

  addSettlement: async (expenseId: string, data: {
    from: string;
    to: string;
    amount: number;
    method?: string;
    transactionId?: string;
  }) => {
    const response: AxiosResponse = await api.post(`/expenses/${expenseId}/settlements`, data);
    return response.data;
  },

  deleteExpense: async (expenseId: string) => {
    const response: AxiosResponse = await api.delete(`/expenses/${expenseId}`);
    return response.data;
  },

  getExpenseStats: async (groupId: string) => {
    const response: AxiosResponse = await api.get(`/expenses/group/${groupId}/stats`);
    return response.data;
  },
};

// Users API
export const usersAPI = {
  searchUsers: async (query: string) => {
    const response: AxiosResponse = await api.get('/users/search', { params: { q: query } });
    return response.data;
  },

  getUser: async (userId: string) => {
    const response: AxiosResponse = await api.get(`/users/${userId}`);
    return response.data;
  },

  getUserGroups: async (userId: string) => {
    const response: AxiosResponse = await api.get(`/users/${userId}/groups`);
    return response.data;
  },

  updatePreferences: async (userId: string, preferences: any) => {
    const response: AxiosResponse = await api.put(`/users/${userId}/preferences`, preferences);
    return response.data;
  },

  updateAvatar: async (userId: string, avatar: string) => {
    const response: AxiosResponse = await api.put(`/users/${userId}/avatar`, { avatar });
    return response.data;
  },

  getUserStats: async (userId: string) => {
    const response: AxiosResponse = await api.get(`/users/${userId}/stats`);
    return response.data;
  },

  getUserActivity: async (userId: string, page?: number, limit?: number) => {
    const response: AxiosResponse = await api.get(`/users/${userId}/activity`, {
      params: { page, limit }
    });
    return response.data;
  },
};

// Utility functions
export const setAuthTokens = (token: string, refreshToken: string) => {
  localStorage.setItem('token', token);
  localStorage.setItem('refreshToken', refreshToken);
};

export const clearAuthTokens = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

export default api;
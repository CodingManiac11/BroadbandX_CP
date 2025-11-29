import { apiClient, handleApiResponse, handleApiError } from './api';
import { User, Plan, Subscription, ApiResponse } from '../types/index';

export interface DashboardStats {
  totalUsers: number;
  totalPlans: number;
  activeSubscriptions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  newUsersThisMonth: number;
  expiringSoon: number;
  userGrowthRate: number;
  subscriptionsByStatus: Array<{
    _id: string;
    count: number;
  }>;
  popularPlansThisMonth: Array<{
    planDetails: Plan;
    count: number;
    revenue: number;
  }>;
  recentUsers: User[];
  recentSubscriptions: Subscription[];
}

export const adminService = {
  // Dashboard statistics
  getDashboardStats: async (): Promise<DashboardStats> => {
    try {
      const response = await apiClient.get<ApiResponse<DashboardStats>>('/admin/dashboard');
      return handleApiResponse<DashboardStats>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // User management
  getAllUsers: async (page = 1, limit = 10, search = ''): Promise<{
    users: User[];
    total: number;
    pages: number;
    currentPage: number;
  }> => {
    try {
      const response = await apiClient.get<ApiResponse<any>>(`/admin/users?page=${page}&limit=${limit}&search=${search}`);
      return handleApiResponse(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  getUserById: async (userId: string): Promise<User> => {
    try {
      const response = await apiClient.get<ApiResponse<User>>(`/admin/users/${userId}`);
      return handleApiResponse<User>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  updateUserStatus: async (userId: string, status: 'active' | 'inactive' | 'suspended'): Promise<User> => {
    try {
      const response = await apiClient.put<ApiResponse<User>>(`/admin/users/${userId}/status`, { status });
      return handleApiResponse<User>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  createUser: async (userData: Partial<User>): Promise<{ user: User; temporaryPassword?: string }> => {
    try {
      const response = await apiClient.post<ApiResponse<{ user: User; temporaryPassword?: string }>>('/admin/users', userData);
      return handleApiResponse<{ user: User; temporaryPassword?: string }>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  updateUser: async (userId: string, userData: Partial<User>): Promise<User> => {
    try {
      const response = await apiClient.put<ApiResponse<User>>(`/admin/users/${userId}`, userData);
      return handleApiResponse<User>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  deleteUser: async (userId: string): Promise<void> => {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`/admin/users/${userId}`);
      handleApiResponse<void>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Plan management
  getAllPlans: async (): Promise<Plan[]> => {
    try {
      const response = await apiClient.get<ApiResponse<Plan[]>>('/plans');
      return handleApiResponse<Plan[]>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  createPlan: async (planData: Partial<Plan>): Promise<Plan> => {
    try {
      const response = await apiClient.post<ApiResponse<Plan>>('/plans', planData);
      return handleApiResponse<Plan>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  updatePlan: async (planId: string, planData: Partial<Plan>): Promise<Plan> => {
    try {
      const response = await apiClient.put<ApiResponse<Plan>>(`/plans/${planId}`, planData);
      return handleApiResponse<Plan>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  deletePlan: async (planId: string): Promise<void> => {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(`/plans/${planId}`);
      handleApiResponse<void>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Subscription management
  getAllSubscriptions: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {}): Promise<{
    success: boolean;
    data: any[];
    pagination?: {
      page: number;
      pages: number;
      total: number;
      limit: number;
    };
  }> => {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.status && params.status !== 'all') queryParams.append('status', params.status);
      if (params.search) queryParams.append('search', params.search);
      
      const url = `/admin/subscriptions?${queryParams}`;
      console.log('🚀 Making request to:', url);
      console.log('📋 Request params:', params);
      
      const response = await apiClient.get<ApiResponse<any>>(url);
      console.log('📡 Raw response status:', response.status);
      console.log('📦 Raw response data:', response.data);
      
      // Handle the response properly - the backend returns { success: true, data: [...], pagination: {...} }
      if (response.data.success) {
        const result = {
          success: true,
          data: response.data.data || [],
          pagination: response.data.pagination
        };
        console.log('✅ Processed response:', result);
        return result;
      } else {
        throw new Error(response.data.message || 'Failed to fetch subscriptions');
      }
    } catch (error) {
      console.error('❌ Admin subscriptions API error:', error);
      throw new Error(handleApiError(error));
    }
  },

  // Analytics
  getSubscriptionAnalytics: async (): Promise<any> => {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/admin/analytics/subscriptions');
      return handleApiResponse(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  getRevenueAnalytics: async (): Promise<any> => {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/admin/analytics/revenue');
      return handleApiResponse(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  getTopPlans: async (): Promise<any> => {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/admin/analytics/top-plans');
      return handleApiResponse(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  getUsageAnalytics: async (): Promise<any> => {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/admin/analytics/usage');
      return handleApiResponse(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  getCustomerInsights: async (): Promise<any> => {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/admin/analytics/customers');
      return handleApiResponse(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // System health
  getSystemHealth: async (): Promise<any> => {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/admin/health');
      return handleApiResponse(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Plan Request Management
  getAllPlanRequests: async (filters: {
    page?: number;
    limit?: number;
    status?: string;
    requestType?: string;
  }): Promise<any> => {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/admin/plan-requests', { params: filters });
      return handleApiResponse(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  getPlanRequestAnalytics: async (): Promise<any> => {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/admin/plan-requests/analytics');
      return handleApiResponse(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  approvePlanRequest: async (requestId: string, data: { comments?: string; internalNotes?: string }): Promise<any> => {
    try {
      const response = await apiClient.post<ApiResponse<any>>(`/admin/plan-requests/${requestId}/approve`, data);
      return handleApiResponse(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  rejectPlanRequest: async (requestId: string, data: { comments: string; internalNotes?: string }): Promise<any> => {
    try {
      const response = await apiClient.post<ApiResponse<any>>(`/admin/plan-requests/${requestId}/reject`, data);
      return handleApiResponse(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  getPlanRequest: async (requestId: string): Promise<any> => {
    try {
      const response = await apiClient.get<ApiResponse<any>>(`/admin/plan-requests/${requestId}`);
      return handleApiResponse(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
};
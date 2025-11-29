import { apiClient, handleApiResponse, handleApiError } from './api';
import { 
  Plan, 
  PlanFilters, 
  PlanCreateRequest,
  ApiResponse 
} from '../types/index';

export const planService = {
  // Get all plans with optional filters
  getPlans: async (filters?: PlanFilters): Promise<{ plans: Plan[]; pagination?: any }> => {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        if (filters.category) params.append('category', filters.category);
        if (filters.priceRange) {
          params.append('minPrice', filters.priceRange.min.toString());
          params.append('maxPrice', filters.priceRange.max.toString());
        }
        if (filters.speedRange) {
          params.append('minSpeed', filters.speedRange.min.toString());
          params.append('maxSpeed', filters.speedRange.max.toString());
        }
        if (filters.regions?.length) {
          filters.regions.forEach(region => params.append('regions', region));
        }
        if (filters.technology) params.append('technology', filters.technology);
        if (filters.unlimited !== undefined) params.append('unlimited', filters.unlimited.toString());
      }
      
      const response = await apiClient.get<ApiResponse<{ plans: Plan[]; pagination?: any }>>(`/plans?${params}`);
      return handleApiResponse<{ plans: Plan[]; pagination?: any }>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Get plan by ID
  getPlanById: async (id: string): Promise<Plan> => {
    try {
      const response = await apiClient.get<ApiResponse<Plan>>(`/plans/${id}`);
      return handleApiResponse<Plan>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Create new plan (admin only)
  createPlan: async (planData: PlanCreateRequest): Promise<Plan> => {
    try {
      const response = await apiClient.post<ApiResponse<Plan>>('/plans', planData);
      return handleApiResponse<Plan>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Update plan (admin only)
  updatePlan: async (id: string, planData: Partial<PlanCreateRequest>): Promise<Plan> => {
    try {
      const response = await apiClient.put<ApiResponse<Plan>>(`/plans/${id}`, planData);
      return handleApiResponse<Plan>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Delete plan (admin only)
  deletePlan: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await apiClient.delete<ApiResponse<{ message: string }>>(`/plans/${id}`);
      return handleApiResponse<{ message: string }>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Get popular plans
  getPopularPlans: async (limit?: number): Promise<Plan[]> => {
    try {
      const params = limit ? `?limit=${limit}` : '';
      const response = await apiClient.get<ApiResponse<Plan[]>>(`/plans/popular${params}`);
      return handleApiResponse<Plan[]>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Search plans
  searchPlans: async (query: string): Promise<Plan[]> => {
    try {
      const response = await apiClient.get<ApiResponse<Plan[]>>(`/plans/search?q=${encodeURIComponent(query)}`);
      return handleApiResponse<Plan[]>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Get plans by category
  getPlansByCategory: async (category: 'residential' | 'business'): Promise<Plan[]> => {
    try {
      const response = await apiClient.get<ApiResponse<Plan[]>>(`/plans/category/${category}`);
      return handleApiResponse<Plan[]>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Get available regions
  getAvailableRegions: async (): Promise<string[]> => {
    try {
      const response = await apiClient.get<ApiResponse<string[]>>('/plans/regions');
      return handleApiResponse<string[]>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Get available cities for a region
  getAvailableCities: async (region: string): Promise<string[]> => {
    try {
      const response = await apiClient.get<ApiResponse<string[]>>(`/plans/cities/${encodeURIComponent(region)}`);
      return handleApiResponse<string[]>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Compare plans
  comparePlans: async (planIds: string[]): Promise<Plan[]> => {
    try {
      const response = await apiClient.post<ApiResponse<Plan[]>>('/plans/compare', { planIds });
      return handleApiResponse<Plan[]>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Get plan analytics (admin only)
  getPlanAnalytics: async (planId: string): Promise<any> => {
    try {
      const response = await apiClient.get<ApiResponse<any>>(`/plans/${planId}/analytics`);
      return handleApiResponse<any>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
};
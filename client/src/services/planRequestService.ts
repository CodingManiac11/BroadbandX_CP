import { apiClient, handleApiResponse, handleApiError } from './api';
import { ApiResponse, Plan } from '../types/index';

export interface PlanRequestData {
  requestType: 'new_subscription' | 'plan_change' | 'cancel_subscription' | 'plan_upgrade' | 'plan_downgrade';
  requestedPlanId?: string;
  billingCycle: 'monthly' | 'yearly';
  customerNotes?: string;
  urgency?: 'low' | 'medium' | 'high';
  reason?: string;
}

export interface PlanRequest {
  _id: string;
  customer: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  requestType: string;
  requestedPlan?: Plan;
  previousPlan?: Plan;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestDetails: {
    billingCycle: string;
    reason?: string;
    urgency: string;
  };
  pricing: {
    currentAmount?: number;
    newAmount?: number;
    priceDifference?: number;
  };
  customerNotes?: string;
  priority: number;
  summary: string;
  createdAt: string;
  adminAction?: {
    reviewedBy?: {
      firstName: string;
      lastName: string;
    };
    reviewedAt?: string;
    comments?: string;
  };
}

export const planRequestService = {
  // Create a new plan request
  createPlanRequest: async (requestData: PlanRequestData): Promise<PlanRequest> => {
    try {
      const response = await apiClient.post<ApiResponse<PlanRequest>>('/plan-requests', requestData);
      return handleApiResponse<PlanRequest>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Get my plan requests
  getMyPlanRequests: async (filters?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    requests: PlanRequest[];
    total: number;
    pages: number;
    currentPage: number;
  }> => {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/plan-requests/my-requests', { params: filters });
      return handleApiResponse(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Cancel a plan request
  cancelPlanRequest: async (requestId: string, reason?: string): Promise<PlanRequest> => {
    try {
      const response = await apiClient.post<ApiResponse<PlanRequest>>(`/plan-requests/${requestId}/cancel`, { reason });
      return handleApiResponse<PlanRequest>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Get a specific plan request
  getPlanRequest: async (requestId: string): Promise<PlanRequest> => {
    try {
      const response = await apiClient.get<ApiResponse<PlanRequest>>(`/plan-requests/${requestId}`);
      return handleApiResponse<PlanRequest>(response);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
};
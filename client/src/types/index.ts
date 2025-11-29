// API Configuration and Types
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// User Types
export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  emailVerified: boolean;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  preferences?: {
    notifications: {
      email: boolean;
      sms: boolean;
      marketing: boolean;
    };
    language: string;
    timezone: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Plan Types
export interface Plan {
  _id: string;
  name: string;
  description: string;
  category: 'residential' | 'business';
  pricing: {
    monthly: number;
    yearly: number;
    setupFee: number;
    currency: string;
  };
  features: {
    speed: {
      download: number;
      upload: number;
      unit: string;
    };
    dataLimit: {
      amount?: number;
      unit?: string;
      unlimited: boolean;
    };
    features: Array<{
      name: string;
      description: string;
      included: boolean;
    }>;
  };
  availability: {
    regions: string[];
    cities: string[];
  };
  technicalSpecs: {
    technology: string;
    latency: number;
    reliability: number;
    installation: {
      required: boolean;
      fee: number;
      timeframe: string;
    };
  };
  targetAudience: string;
  contractTerms: {
    minimumTerm: number;
    earlyTerminationFee: number;
    autoRenewal: boolean;
  };
  status?: 'active' | 'inactive' | 'draft';
  isActive: boolean;
  popularity: number;
  createdAt: string;
  updatedAt: string;
}

// Subscription Types
export interface Subscription {
  _id: string;
  user: string | {
    _id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    isLocked?: boolean;
    id?: string;
  };
  plan: Plan;
  status: 'active' | 'suspended' | 'cancelled' | 'pending';
  startDate: string;
  endDate: string;
  nextBillingDate: string;
  billingCycle: 'monthly' | 'yearly';
  autoRenewal: boolean;
  paymentMethod?: string;
  pricing: {
    basePrice: number;
    discount: number;
    tax: number;
    finalPrice: number;
    currency?: string;
    discountApplied?: number;
    taxAmount?: number;
    totalAmount?: number;
  };
  installation: {
    scheduled: boolean;
    scheduledDate?: string;
    completed: boolean;
    completedDate?: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };
  usage: {
    currentMonth: {
      dataUsed: number;
      lastUpdated: string;
    };
  };
  serviceHistory: Array<{
    date: string;
    type: string;
    description: string;
    performedBy: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Usage Analytics Types
export interface UsageAnalytics {
  _id: string;
  user: string;
  subscription: string;
  date: string;
  metrics: {
    dataUsed: number;
    speedTests: Array<{
      timestamp: string;
      downloadSpeed: number;
      uploadSpeed: number;
      latency: number;
      location: string;
      server: string;
    }>;
    sessionMetrics: {
      totalSessions: number;
      avgSessionDuration: number;
      peakUsageHours: Array<{
        hour: number;
        dataUsed: number;
      }>;
    };
    qualityMetrics: {
      uptime: number;
      packetLoss: number;
      jitter: number;
      dns_resolution_time: number;
    };
  };
  applicationUsage: Array<{
    application: string;
    dataUsed: number;
    duration: number;
    qualityScore: number;
  }>;
  networkConditions: {
    timeOfDay: string;
    dayOfWeek: string;
    networkCongestion: string;
  };
}

// Recommendation Types
export interface Recommendation {
  _id: string;
  user: string;
  plan: Plan;
  score: number;
  reasons: string[];
  category: string;
  validUntil: string;
  feedback?: {
    helpful: boolean;
    reason?: string;
  };
  createdAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  role?: 'customer' | 'admin';
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// Dashboard Analytics Types
export interface DashboardStats {
  totalUsers: number;
  totalCustomers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  newUsersThisMonth: number;
  userGrowthRate: number;
  expiringSoon: number;
  averageUsage: number;
  planPopularity: Array<{
    planName: string;
    subscriptions: number;
    percentage: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
  }>;
  userGrowth: Array<{
    month: string;
    users: number;
  }>;
  topPlans: Array<{
    plan: Plan;
    subscriptions: number;
    revenue: number;
  }>;
}

// Form Types
export interface SubscriptionCreateRequest {
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  installationAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface PlanCreateRequest {
  name: string;
  description: string;
  category: 'residential' | 'business';
  pricing: {
    monthly: number;
    yearly: number;
    setupFee: number;
    currency: string;
  };
  features: {
    speed: {
      download: number;
      upload: number;
      unit: string;
    };
    dataLimit: {
      amount?: number;
      unit?: string;
      unlimited: boolean;
    };
    features: Array<{
      name: string;
      description: string;
      included: boolean;
    }>;
  };
  availability: {
    regions: string[];
    cities: string[];
  };
  technicalSpecs: {
    technology: string;
    latency: number;
    reliability: number;
    installation: {
      required: boolean;
      fee: number;
      timeframe: string;
    };
  };
  targetAudience: string;
  contractTerms: {
    minimumTerm: number;
    earlyTerminationFee: number;
    autoRenewal: boolean;
  };
}

// Filter and Search Types
export interface PlanFilters {
  category?: 'residential' | 'business';
  priceRange?: {
    min: number;
    max: number;
  };
  speedRange?: {
    min: number;
    max: number;
  };
  regions?: string[];
  technology?: string;
  unlimited?: boolean;
}

export interface UserFilters {
  role?: 'customer' | 'admin';
  status?: 'active' | 'inactive' | 'suspended';
  dateRange?: {
    start: string;
    end: string;
  };
}

// Chart Data Types
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  category?: string;
}
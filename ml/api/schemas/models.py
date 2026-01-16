"""
BroadbandX ML Service - Pydantic Schemas
Request and response models for API endpoints.
"""
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime


# =============================================================================
# BASE SCHEMAS
# =============================================================================

class CustomerFeatures(BaseModel):
    """Customer features for ML predictions."""
    # Usage features
    usage_change_30d: float = Field(default=0, description="Usage change in last 30 days (%)")
    days_since_login: int = Field(default=0, ge=0, description="Days since last login")
    avg_monthly_usage_gb: float = Field(default=100, ge=0, description="Average monthly data usage in GB")
    session_count_30d: int = Field(default=30, ge=0, description="Number of sessions in last 30 days")
    avg_speed_mbps: float = Field(default=50, ge=0, description="Average connection speed in Mbps")
    
    # Payment features
    payment_failures_90d: int = Field(default=0, ge=0, description="Payment failures in last 90 days")
    late_payments_count: int = Field(default=0, ge=0, description="Total late payments")
    
    # Engagement features
    support_tickets: int = Field(default=0, ge=0, description="Total support tickets")
    complaints_count: int = Field(default=0, ge=0, description="Total complaints")
    
    # Subscription features
    contract_age_months: int = Field(default=12, ge=0, description="Months since subscription started")
    plan_price: float = Field(default=799, ge=0, description="Current plan price")
    total_revenue: float = Field(default=10000, ge=0, description="Total revenue from customer")
    
    # Satisfaction features
    nps_score: int = Field(default=5, ge=0, le=10, description="Net Promoter Score (0-10)")
    
    # Binary features (optional)
    billing_cycle_monthly: int = Field(default=1, ge=0, le=1, description="1 if monthly billing")
    account_type_business: int = Field(default=0, ge=0, le=1, description="1 if business account")
    
    class Config:
        json_schema_extra = {
            "example": {
                "usage_change_30d": -5.5,
                "days_since_login": 3,
                "avg_monthly_usage_gb": 250.5,
                "session_count_30d": 45,
                "avg_speed_mbps": 95.5,
                "payment_failures_90d": 0,
                "late_payments_count": 1,
                "support_tickets": 2,
                "complaints_count": 0,
                "contract_age_months": 18,
                "plan_price": 999,
                "total_revenue": 18000,
                "nps_score": 7,
                "billing_cycle_monthly": 1,
                "account_type_business": 0
            }
        }


# =============================================================================
# CHURN PREDICTION SCHEMAS
# =============================================================================

class ChurnPredictionRequest(BaseModel):
    """Request for churn prediction."""
    customer_id: Optional[str] = Field(default=None, description="Customer ID (optional)")
    features: CustomerFeatures
    
    class Config:
        json_schema_extra = {
            "example": {
                "customer_id": "CUST_000123",
                "features": {
                    "usage_change_30d": -15.0,
                    "days_since_login": 10,
                    "payment_failures_90d": 1,
                    "support_tickets": 3,
                    "nps_score": 4
                }
            }
        }


class ChurnPredictionResponse(BaseModel):
    """Response for churn prediction."""
    customer_id: Optional[str] = None
    churn_probability: float = Field(ge=0, le=1, description="Probability of churn (0-1)")
    churn_prediction: int = Field(ge=0, le=1, description="Binary prediction (0 or 1)")
    risk_level: str = Field(description="Risk level: low, medium, or high")
    recommendation: str = Field(description="Retention recommendation")
    timestamp: datetime = Field(default_factory=datetime.now)


class BatchChurnRequest(BaseModel):
    """Request for batch churn predictions."""
    customers: List[ChurnPredictionRequest]


class BatchChurnResponse(BaseModel):
    """Response for batch churn predictions."""
    predictions: List[ChurnPredictionResponse]
    summary: Dict[str, Any]


# =============================================================================
# SEGMENTATION SCHEMAS
# =============================================================================

class SegmentationRequest(BaseModel):
    """Request for customer segmentation."""
    customer_id: Optional[str] = Field(default=None, description="Customer ID (optional)")
    features: CustomerFeatures


class SegmentationResponse(BaseModel):
    """Response for customer segmentation."""
    customer_id: Optional[str] = None
    segment_id: int = Field(description="Cluster ID (0-4)")
    segment_name: str = Field(description="Segment name")
    price_elasticity: float = Field(description="Price sensitivity coefficient")
    pricing_strategy: str = Field(description="Recommended pricing strategy")
    confidence: float = Field(ge=0, le=1, description="Confidence score")
    timestamp: datetime = Field(default_factory=datetime.now)


# =============================================================================
# PRICING SCHEMAS
# =============================================================================

class DynamicPricingRequest(BaseModel):
    """Request for dynamic pricing calculation."""
    customer_id: Optional[str] = Field(default=None, description="Customer ID (optional)")
    base_price: float = Field(gt=0, description="Base plan price")
    features: CustomerFeatures
    timestamp: Optional[datetime] = Field(default=None, description="Time for demand calculation")
    
    class Config:
        json_schema_extra = {
            "example": {
                "customer_id": "CUST_000123",
                "base_price": 999,
                "features": {
                    "avg_monthly_usage_gb": 200,
                    "plan_price": 999,
                    "nps_score": 7
                }
            }
        }


class PricingFactors(BaseModel):
    """Breakdown of pricing factors."""
    demand_factor: float
    elasticity: float
    elasticity_factor: float
    churn_risk: float


class DynamicPricingResponse(BaseModel):
    """Response for dynamic pricing calculation."""
    customer_id: Optional[str] = None
    base_price: float
    dynamic_price: float
    price_change: float
    price_change_percent: float
    factors: PricingFactors
    adjustment: float
    recommendation: str
    timestamp: datetime = Field(default_factory=datetime.now)


class PricingSimulationRequest(BaseModel):
    """Request for pricing scenario simulation."""
    base_price: float = Field(gt=0, description="Base plan price")
    features: CustomerFeatures
    scenarios: Optional[List[str]] = Field(
        default=None,
        description="Scenarios to simulate. Default: all scenarios"
    )


# =============================================================================
# CUSTOMER ANALYSIS SCHEMAS
# =============================================================================

class CustomerAnalysisRequest(BaseModel):
    """Request for comprehensive customer analysis."""
    customer_id: Optional[str] = Field(default=None, description="Customer ID (optional)")
    base_price: float = Field(gt=0, description="Base plan price")
    features: CustomerFeatures


class CustomerAnalysisResponse(BaseModel):
    """Comprehensive customer analysis response."""
    customer_id: Optional[str] = None
    
    # Churn analysis
    churn_probability: float
    churn_prediction: int
    risk_level: str
    
    # Segmentation
    segment_id: int
    segment_name: str
    price_elasticity: float
    
    # Pricing
    base_price: float
    recommended_price: float
    price_adjustment_percent: float
    
    # Recommendations
    overall_recommendation: str
    action_items: List[str]
    
    timestamp: datetime = Field(default_factory=datetime.now)


# =============================================================================
# MODEL STATS SCHEMAS
# =============================================================================

class ModelStats(BaseModel):
    """Model performance statistics."""
    model_name: str
    is_loaded: bool
    metrics: Optional[Dict[str, float]] = None
    last_trained: Optional[str] = None


class AllModelStats(BaseModel):
    """Statistics for all models."""
    churn_model: ModelStats
    segmentation_model: ModelStats
    pricing_engine: ModelStats
    api_version: str
    timestamp: datetime = Field(default_factory=datetime.now)


# =============================================================================
# HEALTH CHECK SCHEMA
# =============================================================================

class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field(description="API status: healthy or unhealthy")
    models_loaded: Dict[str, bool]
    version: str
    timestamp: datetime = Field(default_factory=datetime.now)

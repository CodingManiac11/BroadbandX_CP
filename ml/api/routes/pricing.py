"""
BroadbandX ML Service - Dynamic Pricing Routes
API endpoints for dynamic pricing calculations.
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
import sys
from pathlib import Path
from datetime import datetime

# Add paths for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from api.schemas.models import (
    DynamicPricingRequest, DynamicPricingResponse,
    PricingSimulationRequest, PricingFactors,
    CustomerAnalysisRequest, CustomerAnalysisResponse,
    CustomerFeatures
)
from models.pricing_model import DynamicPricingEngine
from models.churn_model import ChurnPredictor
from models.segmentation_model import CustomerSegmentation

router = APIRouter(prefix="/pricing", tags=["Dynamic Pricing"])

# Model instances (loaded on startup)
pricing_engine: DynamicPricingEngine = None
churn_model: ChurnPredictor = None
segmentation_model: CustomerSegmentation = None


def set_models(
    pricing: DynamicPricingEngine,
    churn: ChurnPredictor = None,
    segmentation: CustomerSegmentation = None
):
    """Set model instances."""
    global pricing_engine, churn_model, segmentation_model
    pricing_engine = pricing
    churn_model = churn
    segmentation_model = segmentation
    
    if pricing_engine:
        pricing_engine.set_models(churn_model, segmentation_model)


def get_engine() -> DynamicPricingEngine:
    """Get the pricing engine instance."""
    if pricing_engine is None:
        raise HTTPException(
            status_code=503,
            detail="Pricing engine not initialized."
        )
    return pricing_engine


def features_to_dict(features: CustomerFeatures) -> dict:
    """Convert CustomerFeatures to dictionary."""
    return features.model_dump()


@router.post("/calculate", response_model=DynamicPricingResponse)
async def calculate_dynamic_price(request: DynamicPricingRequest):
    """
    Calculate dynamic price for a customer.
    
    Uses the formula: P_dynamic = P_base × (1 + α·D_t + β·E_c + γ·R_c)
    
    Returns:
    - dynamic_price: Calculated optimal price
    - price_change: Difference from base price
    - price_change_percent: Percentage change
    - factors: Breakdown of pricing factors
    - recommendation: Pricing recommendation
    """
    engine = get_engine()
    
    # Convert features to dict
    features_dict = features_to_dict(request.features)
    
    # Calculate price
    result = engine.calculate_dynamic_price(
        request.base_price,
        features_dict,
        request.timestamp
    )
    
    return DynamicPricingResponse(
        customer_id=request.customer_id,
        base_price=result["base_price"],
        dynamic_price=result["dynamic_price"],
        price_change=result["price_change"],
        price_change_percent=result["price_change_percent"],
        factors=PricingFactors(
            demand_factor=result["factors"]["demand_factor"],
            elasticity=result["factors"]["elasticity"],
            elasticity_factor=result["factors"]["elasticity_factor"],
            churn_risk=result["factors"]["churn_risk"]
        ),
        adjustment=result["adjustment"],
        recommendation=result["recommendation"],
        timestamp=datetime.now()
    )


@router.post("/simulate")
async def simulate_pricing_scenarios(request: PricingSimulationRequest):
    """
    Simulate pricing under different scenarios.
    
    Scenarios include:
    - peak_weekday: Weekday evening peak hours
    - offpeak_weekday: Weekday off-peak hours
    - peak_weekend: Weekend peak hours
    - offpeak_weekend: Weekend off-peak hours
    """
    engine = get_engine()
    
    features_dict = features_to_dict(request.features)
    
    scenarios = engine.simulate_pricing_scenarios(
        request.base_price,
        features_dict,
        request.scenarios
    )
    
    # Format response
    formatted_scenarios = {}
    for name, result in scenarios.items():
        formatted_scenarios[name] = {
            "base_price": result["base_price"],
            "dynamic_price": result["dynamic_price"],
            "price_change": result["price_change"],
            "price_change_percent": result["price_change_percent"],
            "factors": result["factors"]
        }
    
    return {
        "base_price": request.base_price,
        "scenarios": formatted_scenarios,
        "comparison": {
            "min_price": min(s["dynamic_price"] for s in formatted_scenarios.values()),
            "max_price": max(s["dynamic_price"] for s in formatted_scenarios.values()),
            "avg_price": sum(s["dynamic_price"] for s in formatted_scenarios.values()) / len(formatted_scenarios)
        }
    }


@router.post("/batch")
async def calculate_batch_pricing(customers: List[DynamicPricingRequest]):
    """
    Calculate dynamic prices for multiple customers.
    """
    engine = get_engine()
    
    results = []
    total_base = 0
    total_dynamic = 0
    
    for customer in customers:
        features_dict = features_to_dict(customer.features)
        result = engine.calculate_dynamic_price(
            customer.base_price,
            features_dict,
            customer.timestamp
        )
        
        results.append({
            "customer_id": customer.customer_id,
            "base_price": result["base_price"],
            "dynamic_price": result["dynamic_price"],
            "price_change_percent": result["price_change_percent"],
            "churn_risk": result["factors"]["churn_risk"]
        })
        
        total_base += result["base_price"]
        total_dynamic += result["dynamic_price"]
    
    return {
        "results": results,
        "summary": {
            "total_customers": len(results),
            "total_base_revenue": round(total_base, 2),
            "total_dynamic_revenue": round(total_dynamic, 2),
            "revenue_change": round(total_dynamic - total_base, 2),
            "revenue_change_percent": round((total_dynamic - total_base) / total_base * 100, 2) if total_base > 0 else 0
        }
    }


@router.post("/customer-analysis", response_model=CustomerAnalysisResponse)
async def analyze_customer(request: CustomerAnalysisRequest):
    """
    Comprehensive customer analysis combining churn prediction,
    segmentation, and dynamic pricing.
    """
    engine = get_engine()
    features_dict = features_to_dict(request.features)
    
    # Pricing analysis
    pricing_result = engine.calculate_dynamic_price(
        request.base_price,
        features_dict
    )
    
    # Churn analysis
    churn_result = {
        "churn_probability": pricing_result["factors"]["churn_risk"],
        "churn_prediction": 1 if pricing_result["factors"]["churn_risk"] >= 0.5 else 0,
        "risk_level": "high" if pricing_result["factors"]["churn_risk"] >= 0.6 else ("medium" if pricing_result["factors"]["churn_risk"] >= 0.3 else "low")
    }
    
    # Segmentation (estimate from elasticity)
    elasticity = pricing_result["factors"]["elasticity"]
    if elasticity > -0.5:
        segment_name = "Premium Power Users"
        segment_id = 0
    elif elasticity > -1.0:
        segment_name = "Casual Premium"
        segment_id = 4
    elif elasticity > -1.5:
        segment_name = "Value-Seekers"
        segment_id = 2
    elif elasticity > -1.9:
        segment_name = "Price-Conscious"
        segment_id = 1
    else:
        segment_name = "Budget Users"
        segment_id = 3
    
    # Generate action items
    action_items = []
    if churn_result["risk_level"] == "high":
        action_items.append("URGENT: Initiate proactive retention outreach")
        action_items.append("Apply retention discount immediately")
    elif churn_result["risk_level"] == "medium":
        action_items.append("Schedule customer success check-in")
        action_items.append("Consider loyalty rewards program")
    
    if pricing_result["factors"]["churn_risk"] > 0.3:
        action_items.append("Review and resolve any pending support tickets")
    
    if features_dict.get("payment_failures_90d", 0) > 0:
        action_items.append("Address payment issues with customer")
    
    if not action_items:
        action_items.append("Maintain current engagement level")
        action_items.append("Consider upsell opportunities")
    
    # Overall recommendation
    overall = pricing_result["recommendation"]
    
    return CustomerAnalysisResponse(
        customer_id=request.customer_id,
        churn_probability=churn_result["churn_probability"],
        churn_prediction=churn_result["churn_prediction"],
        risk_level=churn_result["risk_level"],
        segment_id=segment_id,
        segment_name=segment_name,
        price_elasticity=elasticity,
        base_price=request.base_price,
        recommended_price=pricing_result["dynamic_price"],
        price_adjustment_percent=pricing_result["price_change_percent"],
        overall_recommendation=overall,
        action_items=action_items,
        timestamp=datetime.now()
    )


@router.post("/roi-projection")
async def calculate_roi(
    customers_saved: int = 700,
    avg_revenue_per_user: float = 500,
    avg_lifetime_months: int = 24,
    implementation_cost: float = 1000000
):
    """
    Calculate projected ROI for dynamic pricing implementation.
    """
    engine = get_engine()
    
    return engine.calculate_roi_projection(
        customers_saved,
        avg_revenue_per_user,
        avg_lifetime_months,
        implementation_cost
    )


@router.get("/config")
async def get_pricing_config():
    """
    Get current pricing engine configuration.
    """
    engine = get_engine()
    
    return {
        "weights": engine.weights,
        "constraints": engine.constraints,
        "demand_factors": engine.demand_factors,
        "formula": "P_dynamic = P_base × (1 + α·D_t + β·E_c + γ·R_c)"
    }


@router.put("/weights")
async def update_weights(
    alpha: Optional[float] = None,
    beta: Optional[float] = None,
    gamma: Optional[float] = None
):
    """
    Update pricing weight parameters.
    """
    engine = get_engine()
    engine.update_weights(alpha, beta, gamma)
    
    return {
        "message": "Weights updated successfully",
        "new_weights": engine.weights
    }

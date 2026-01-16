"""
BroadbandX ML Service - Churn Prediction Routes
API endpoints for churn prediction.
"""
from fastapi import APIRouter, HTTPException
from typing import List
import sys
from pathlib import Path
from datetime import datetime

# Add paths for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from api.schemas.models import (
    ChurnPredictionRequest, ChurnPredictionResponse,
    BatchChurnRequest, BatchChurnResponse,
    CustomerFeatures
)
from models.churn_model import ChurnPredictor
from config import FEATURE_CONFIG

router = APIRouter(prefix="/churn", tags=["Churn Prediction"])

# Model instance (loaded on startup)
churn_model: ChurnPredictor = None


def set_model(model: ChurnPredictor):
    """Set the churn model instance."""
    global churn_model
    churn_model = model


def get_model() -> ChurnPredictor:
    """Get the churn model instance."""
    if churn_model is None or not churn_model.is_fitted:
        raise HTTPException(
            status_code=503,
            detail="Churn model not loaded. Please ensure models are trained."
        )
    return churn_model


def features_to_dict(features: CustomerFeatures) -> dict:
    """Convert CustomerFeatures to dictionary."""
    return features.model_dump()


@router.post("/predict", response_model=ChurnPredictionResponse)
async def predict_churn(request: ChurnPredictionRequest):
    """
    Predict churn probability for a single customer.
    
    Returns:
    - churn_probability: Float between 0 and 1
    - churn_prediction: 0 (not churning) or 1 (churning)
    - risk_level: "low", "medium", or "high"
    - recommendation: Retention recommendation
    """
    model = get_model()
    
    # Convert features to dict
    features_dict = features_to_dict(request.features)
    
    # Get prediction
    result = model.predict_single(features_dict)
    
    return ChurnPredictionResponse(
        customer_id=request.customer_id,
        churn_probability=result["churn_probability"],
        churn_prediction=result["churn_prediction"],
        risk_level=result["risk_level"],
        recommendation=result["recommendation"],
        timestamp=datetime.now()
    )


@router.post("/predict/batch", response_model=BatchChurnResponse)
async def predict_churn_batch(request: BatchChurnRequest):
    """
    Predict churn for multiple customers in batch.
    
    Returns predictions for each customer plus summary statistics.
    """
    model = get_model()
    
    predictions = []
    high_risk_count = 0
    medium_risk_count = 0
    low_risk_count = 0
    
    for customer_request in request.customers:
        features_dict = features_to_dict(customer_request.features)
        result = model.predict_single(features_dict)
        
        prediction = ChurnPredictionResponse(
            customer_id=customer_request.customer_id,
            churn_probability=result["churn_probability"],
            churn_prediction=result["churn_prediction"],
            risk_level=result["risk_level"],
            recommendation=result["recommendation"],
            timestamp=datetime.now()
        )
        predictions.append(prediction)
        
        if result["risk_level"] == "high":
            high_risk_count += 1
        elif result["risk_level"] == "medium":
            medium_risk_count += 1
        else:
            low_risk_count += 1
    
    total = len(predictions)
    avg_probability = sum(p.churn_probability for p in predictions) / total if total > 0 else 0
    
    summary = {
        "total_customers": total,
        "high_risk": high_risk_count,
        "medium_risk": medium_risk_count,
        "low_risk": low_risk_count,
        "avg_churn_probability": round(avg_probability, 4),
        "predicted_churners": sum(1 for p in predictions if p.churn_prediction == 1)
    }
    
    return BatchChurnResponse(predictions=predictions, summary=summary)


@router.get("/feature-importance")
async def get_feature_importance():
    """
    Get feature importance scores from the trained model.
    
    Returns features sorted by importance.
    """
    model = get_model()
    
    importances = model.get_feature_importances()
    top_features = model.get_top_features(10)
    
    return {
        "all_features": importances,
        "top_10_features": [
            {"feature": f, "importance": round(i, 4)} 
            for f, i in top_features
        ],
        "total_features": len(importances)
    }


@router.get("/metrics")
async def get_model_metrics():
    """
    Get performance metrics from the trained model.
    """
    model = get_model()
    
    return {
        "metrics": model.metrics,
        "cv_scores": model.cv_scores,
        "targets": {
            "accuracy": 0.89,
            "precision": 0.86,
            "recall": 0.83,
            "f1_score": 0.84,
            "auc_roc": 0.91
        }
    }

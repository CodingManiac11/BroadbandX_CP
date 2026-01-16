"""
BroadbandX ML Service - Customer Segmentation Routes
API endpoints for customer segmentation.
"""
from fastapi import APIRouter, HTTPException
from typing import List
import sys
from pathlib import Path
from datetime import datetime

# Add paths for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from api.schemas.models import (
    SegmentationRequest, SegmentationResponse,
    CustomerFeatures
)
from models.segmentation_model import CustomerSegmentation

router = APIRouter(prefix="/segmentation", tags=["Customer Segmentation"])

# Model instance (loaded on startup)
segmentation_model: CustomerSegmentation = None


def set_model(model: CustomerSegmentation):
    """Set the segmentation model instance."""
    global segmentation_model
    segmentation_model = model


def get_model() -> CustomerSegmentation:
    """Get the segmentation model instance."""
    if segmentation_model is None or not segmentation_model.is_fitted:
        raise HTTPException(
            status_code=503,
            detail="Segmentation model not loaded. Please ensure models are trained."
        )
    return segmentation_model


def features_to_dict(features: CustomerFeatures) -> dict:
    """Convert CustomerFeatures to dictionary."""
    return features.model_dump()


@router.post("/predict", response_model=SegmentationResponse)
async def predict_segment(request: SegmentationRequest):
    """
    Predict customer segment.
    
    Returns:
    - segment_id: Cluster ID (0-4)
    - segment_name: Human-readable segment name
    - price_elasticity: Price sensitivity coefficient
    - pricing_strategy: Recommended pricing approach
    - confidence: Confidence score for the prediction
    """
    model = get_model()
    
    # Convert features to dict
    features_dict = features_to_dict(request.features)
    
    # Get prediction
    result = model.predict_single(features_dict)
    
    return SegmentationResponse(
        customer_id=request.customer_id,
        segment_id=result["segment_id"],
        segment_name=result["segment_name"],
        price_elasticity=result["price_elasticity"],
        pricing_strategy=result["pricing_strategy"],
        confidence=result["confidence"],
        timestamp=datetime.now()
    )


@router.post("/predict/batch")
async def predict_segment_batch(customers: List[SegmentationRequest]):
    """
    Predict segments for multiple customers in batch.
    
    Returns predictions for each customer plus segment distribution.
    """
    model = get_model()
    
    predictions = []
    segment_counts = {}
    
    for customer_request in customers:
        features_dict = features_to_dict(customer_request.features)
        result = model.predict_single(features_dict)
        
        prediction = SegmentationResponse(
            customer_id=customer_request.customer_id,
            segment_id=result["segment_id"],
            segment_name=result["segment_name"],
            price_elasticity=result["price_elasticity"],
            pricing_strategy=result["pricing_strategy"],
            confidence=result["confidence"],
            timestamp=datetime.now()
        )
        predictions.append(prediction)
        
        # Count segments
        seg_name = result["segment_name"]
        segment_counts[seg_name] = segment_counts.get(seg_name, 0) + 1
    
    total = len(predictions)
    
    return {
        "predictions": [p.model_dump() for p in predictions],
        "summary": {
            "total_customers": total,
            "segment_distribution": segment_counts,
            "avg_confidence": round(sum(p.confidence for p in predictions) / total, 4) if total > 0 else 0
        }
    }


@router.get("/profiles")
async def get_segment_profiles():
    """
    Get detailed profiles for all customer segments.
    
    Returns characteristics and pricing strategy for each segment.
    """
    model = get_model()
    
    profiles = {}
    for seg_id, profile in model.segment_profiles.items():
        profiles[seg_id] = {
            "name": profile["name"],
            "population": profile["population"],
            "population_count": profile["population_count"],
            "price_elasticity": profile["price_elasticity"],
            "characteristics": profile["characteristics"],
            "pricing_strategy": profile["pricing_strategy"]
        }
    
    return {
        "segments": profiles,
        "total_segments": len(profiles)
    }


@router.get("/segment/{segment_id}")
async def get_segment_info(segment_id: int):
    """
    Get information about a specific segment.
    """
    model = get_model()
    
    if segment_id not in model.segment_profiles:
        raise HTTPException(
            status_code=404,
            detail=f"Segment {segment_id} not found. Valid IDs: 0-{model.n_clusters-1}"
        )
    
    return model.get_segment_info(segment_id)


@router.get("/metrics")
async def get_clustering_metrics():
    """
    Get clustering quality metrics.
    """
    model = get_model()
    
    return {
        "metrics": model.metrics,
        "n_clusters": model.n_clusters,
        "feature_count": len(model.feature_names),
        "features_used": model.feature_names
    }

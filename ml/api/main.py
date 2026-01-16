"""
BroadbandX ML Service - FastAPI Application
Main entry point for the ML API service.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import sys
from pathlib import Path
from datetime import datetime
import logging

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.routes import churn, segmentation, pricing
from api.schemas.models import HealthResponse, AllModelStats, ModelStats
from models.churn_model import ChurnPredictor
from models.segmentation_model import CustomerSegmentation
from models.pricing_model import DynamicPricingEngine
from config import API_CONFIG, MODELS_DIR

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global model instances
churn_model: ChurnPredictor = None
segmentation_model: CustomerSegmentation = None
pricing_engine: DynamicPricingEngine = None
models_loaded: dict = {"churn": False, "segmentation": False, "pricing": False}


def load_models():
    """Load all ML models on startup."""
    global churn_model, segmentation_model, pricing_engine, models_loaded
    
    logger.info("Loading ML models...")
    
    # Load Churn Model
    try:
        churn_model = ChurnPredictor()
        churn_model.load()
        models_loaded["churn"] = True
        churn.set_model(churn_model)
        logger.info("✅ Churn model loaded successfully")
    except FileNotFoundError as e:
        logger.warning(f"⚠️ Churn model not found: {e}")
        churn_model = ChurnPredictor()  # Empty model
    except Exception as e:
        logger.error(f"❌ Error loading churn model: {e}")
        churn_model = ChurnPredictor()
    
    # Load Segmentation Model
    try:
        segmentation_model = CustomerSegmentation()
        segmentation_model.load()
        models_loaded["segmentation"] = True
        segmentation.set_model(segmentation_model)
        logger.info("✅ Segmentation model loaded successfully")
    except FileNotFoundError as e:
        logger.warning(f"⚠️ Segmentation model not found: {e}")
        segmentation_model = CustomerSegmentation()
    except Exception as e:
        logger.error(f"❌ Error loading segmentation model: {e}")
        segmentation_model = CustomerSegmentation()
    
    # Initialize Pricing Engine
    try:
        pricing_engine = DynamicPricingEngine()
        pricing_engine.load()
        models_loaded["pricing"] = True
        logger.info("✅ Pricing engine loaded successfully")
    except FileNotFoundError:
        # Pricing engine works without saved weights
        pricing_engine = DynamicPricingEngine()
        models_loaded["pricing"] = True
        logger.info("✅ Pricing engine initialized with default weights")
    except Exception as e:
        logger.error(f"❌ Error loading pricing engine: {e}")
        pricing_engine = DynamicPricingEngine()
        models_loaded["pricing"] = True
    
    # Connect models to pricing engine
    pricing_engine.set_models(
        churn_model if models_loaded["churn"] else None,
        segmentation_model if models_loaded["segmentation"] else None
    )
    
    # Set models in pricing routes
    pricing.set_models(pricing_engine, churn_model, segmentation_model)
    
    logger.info(f"Model loading complete. Status: {models_loaded}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting BroadbandX ML Service...")
    load_models()
    yield
    # Shutdown
    logger.info("Shutting down BroadbandX ML Service...")


# Create FastAPI app
app = FastAPI(
    title=API_CONFIG["title"],
    description=API_CONFIG["description"],
    version=API_CONFIG["version"],
    docs_url=API_CONFIG["docs_url"],
    redoc_url=API_CONFIG["redoc_url"],
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(churn.router, prefix="/api/ml")
app.include_router(segmentation.router, prefix="/api/ml")
app.include_router(pricing.router, prefix="/api/ml")


# =============================================================================
# ROOT ENDPOINTS
# =============================================================================

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "service": "BroadbandX ML Service",
        "version": API_CONFIG["version"],
        "description": "Machine Learning API for dynamic pricing, churn prediction, and customer segmentation",
        "documentation": "/docs",
        "health": "/health"
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint.
    
    Returns API status and model loading status.
    """
    all_loaded = all(models_loaded.values())
    
    return HealthResponse(
        status="healthy" if all_loaded else "degraded",
        models_loaded=models_loaded,
        version=API_CONFIG["version"],
        timestamp=datetime.now()
    )


@app.get("/api/ml/model-stats", response_model=AllModelStats, tags=["Model Info"])
async def get_model_stats():
    """
    Get statistics for all loaded models.
    """
    churn_stats = ModelStats(
        model_name="ChurnPredictor",
        is_loaded=models_loaded["churn"],
        metrics=churn_model.metrics if churn_model and churn_model.is_fitted else None
    )
    
    segmentation_stats = ModelStats(
        model_name="CustomerSegmentation",
        is_loaded=models_loaded["segmentation"],
        metrics=segmentation_model.metrics if segmentation_model and segmentation_model.is_fitted else None
    )
    
    pricing_stats = ModelStats(
        model_name="DynamicPricingEngine",
        is_loaded=models_loaded["pricing"],
        metrics={"weights": pricing_engine.weights} if pricing_engine else None
    )
    
    return AllModelStats(
        churn_model=churn_stats,
        segmentation_model=segmentation_stats,
        pricing_engine=pricing_stats,
        api_version=API_CONFIG["version"],
        timestamp=datetime.now()
    )


@app.post("/api/ml/reload-models", tags=["Model Info"])
async def reload_models():
    """
    Reload all ML models from disk.
    
    Useful after retraining models.
    """
    load_models()
    
    return {
        "message": "Models reloaded",
        "status": models_loaded,
        "timestamp": datetime.now().isoformat()
    }


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=API_CONFIG["host"],
        port=API_CONFIG["port"],
        reload=True,
        log_level="info"
    )

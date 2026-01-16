"""
BroadbandX ML Service - Configuration
Centralized configuration for paths, hyperparameters, and settings.
"""
import os
from pathlib import Path

# =============================================================================
# PATH CONFIGURATION
# =============================================================================

# Base paths
BASE_DIR = Path(__file__).parent.absolute()
PROJECT_ROOT = BASE_DIR.parent

# Data paths
DATA_DIR = BASE_DIR / "data"
RAW_DATA_PATH = PROJECT_ROOT / "SubscriptionUseCase_Dataset.xlsx"
SYNTHETIC_DATA_PATH = DATA_DIR / "synthetic_dataset.csv"
PROCESSED_DATA_PATH = DATA_DIR / "processed_dataset.csv"

# Artifacts paths
ARTIFACTS_DIR = BASE_DIR / "artifacts"
MODELS_DIR = ARTIFACTS_DIR / "models"
VISUALIZATIONS_DIR = ARTIFACTS_DIR / "visualizations"
REPORTS_DIR = ARTIFACTS_DIR / "reports"

# Ensure directories exist
for directory in [DATA_DIR, MODELS_DIR, VISUALIZATIONS_DIR, REPORTS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# =============================================================================
# DATA GENERATION CONFIGURATION
# =============================================================================

DATA_CONFIG = {
    "n_samples": 10000,
    "random_seed": 42,
    "churn_rate": 0.25,  # 25% baseline churn rate as per research paper
    "date_range": {
        "start": "2023-01-01",
        "end": "2024-12-31"
    }
}

# =============================================================================
# FEATURE CONFIGURATION
# =============================================================================

FEATURE_CONFIG = {
    # Features for churn prediction (ordered by importance from research paper)
    "churn_features": [
        "usage_change_30d",      # 0.23 importance
        "days_since_login",      # 0.18 importance
        "payment_failures_90d",  # 0.15 importance
        "support_tickets",       # 0.12 importance
        "contract_age_months",   # 0.10 importance
        "avg_monthly_usage_gb",
        "plan_price",
        "late_payments_count",
        "nps_score",
        "complaints_count",
        "session_count_30d",
        "avg_speed_mbps",
        "billing_cycle_monthly",
        "account_type_business"
    ],
    
    # Features for segmentation
    "segmentation_features": [
        "avg_monthly_usage_gb",
        "plan_price",
        "total_revenue",
        "contract_age_months",
        "nps_score",
        "support_tickets",
        "session_count_30d",
        "usage_change_30d"
    ],
    
    # Target column
    "target_column": "churned"
}

# =============================================================================
# MODEL HYPERPARAMETERS
# =============================================================================

# XGBoost Churn Model Configuration
CHURN_MODEL_CONFIG = {
    "model_params": {
        "n_estimators": 200,
        "max_depth": 6,
        "learning_rate": 0.1,
        "min_child_weight": 1,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "gamma": 0,
        "reg_alpha": 0.1,
        "reg_lambda": 1.0,
        "scale_pos_weight": 3,  # Handle class imbalance
        "random_state": 42,
        "n_jobs": -1,
        "eval_metric": "auc"
    },
    "test_size": 0.2,
    "cv_folds": 5,
    # Target metrics from research paper
    "target_metrics": {
        "accuracy": 0.89,
        "precision": 0.86,
        "recall": 0.83,
        "f1_score": 0.84,
        "auc_roc": 0.91
    }
}

# K-Means Segmentation Configuration
SEGMENTATION_CONFIG = {
    "n_clusters": 5,
    "random_state": 42,
    "max_iter": 300,
    "n_init": 10,
    # Segment definitions from research paper
    "segment_definitions": {
        0: {"name": "Premium Power Users", "population": 0.15, "elasticity": -0.3},
        1: {"name": "Price-Conscious", "population": 0.25, "elasticity": -1.8},
        2: {"name": "Value-Seekers", "population": 0.30, "elasticity": -1.2},
        3: {"name": "Budget Users", "population": 0.20, "elasticity": -2.0},
        4: {"name": "Casual Premium", "population": 0.10, "elasticity": -0.5}
    }
}

# Dynamic Pricing Configuration
PRICING_CONFIG = {
    # Weight parameters for pricing formula: P = P_base × (1 + α·D + β·E + γ·R)
    "weights": {
        "alpha": 0.15,  # Demand factor weight
        "beta": 0.10,   # Elasticity weight
        "gamma": 0.20   # Churn risk weight
    },
    # Price constraints
    "constraints": {
        "min_discount": -0.30,  # Maximum 30% discount
        "max_premium": 0.20,    # Maximum 20% premium
        "churn_threshold": 0.70  # Maximum acceptable churn probability
    },
    # Demand factors by time
    "demand_factors": {
        "peak_hours": (18, 22),     # 6 PM - 10 PM
        "peak_multiplier": 0.15,
        "offpeak_multiplier": -0.10,
        "weekend_multiplier": 0.05
    }
}

# =============================================================================
# API CONFIGURATION
# =============================================================================

API_CONFIG = {
    "host": "0.0.0.0",
    "port": 8000,
    "title": "BroadbandX ML Service",
    "description": "Machine Learning API for dynamic pricing, churn prediction, and customer segmentation",
    "version": "1.0.0",
    "docs_url": "/docs",
    "redoc_url": "/redoc"
}

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================

LOGGING_CONFIG = {
    "level": "INFO",
    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    "date_format": "%Y-%m-%d %H:%M:%S"
}

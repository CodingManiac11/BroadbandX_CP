"""
BroadbandX ML Service - Feature Engineering
Creates derived features and transformations for ML models.
"""
import numpy as np
import pandas as pd
from typing import List, Optional
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import FEATURE_CONFIG


class FeatureEngineer:
    """
    Creates derived features for improved model performance.
    
    Features engineered:
    - Engagement score (composite metric)
    - Usage trend indicators
    - Risk score (pre-churn indicator)
    - Customer lifetime value proxy
    - Behavioral segments
    """
    
    def __init__(self):
        """Initialize the feature engineer."""
        self.engineered_features: List[str] = []
    
    def create_engagement_score(self, df: pd.DataFrame) -> pd.Series:
        """
        Create composite engagement score from multiple metrics.
        Higher score = more engaged customer.
        
        Args:
            df: DataFrame with engagement features
            
        Returns:
            Engagement score series (0-100)
        """
        # Normalize each component to 0-1
        def normalize(x):
            x_min, x_max = x.min(), x.max()
            if x_max == x_min:
                return pd.Series(0.5, index=x.index)
            return (x - x_min) / (x_max - x_min)
        
        # Components (weighted)
        login_score = 1 - normalize(df["days_since_login"])  # Less days = better
        session_score = normalize(df["session_count_30d"])
        usage_score = normalize(df["avg_monthly_usage_gb"])
        app_score = normalize(df["app_usage_hours"]) if "app_usage_hours" in df.columns else 0.5
        
        # Weighted combination
        engagement = (
            0.35 * login_score +
            0.30 * session_score +
            0.20 * usage_score +
            0.15 * app_score
        ) * 100
        
        return engagement.round(2)
    
    def create_usage_trend_indicator(self, df: pd.DataFrame) -> pd.Series:
        """
        Create usage trend indicator from 30/60/90 day changes.
        Negative = declining usage (churn risk)
        
        Args:
            df: DataFrame with usage change features
            
        Returns:
            Trend indicator series
        """
        # Weight recent changes more heavily
        trend = (
            0.50 * df["usage_change_30d"] +
            0.30 * df["usage_change_60d"] +
            0.20 * df["usage_change_90d"]
        )
        
        return trend.round(2)
    
    def create_payment_risk_score(self, df: pd.DataFrame) -> pd.Series:
        """
        Create payment risk score based on payment history.
        Higher score = higher risk.
        
        Args:
            df: DataFrame with payment features
            
        Returns:
            Payment risk score series (0-100)
        """
        # Normalize components
        def normalize(x):
            x_min, x_max = x.min(), x.max()
            if x_max == x_min:
                return pd.Series(0, index=x.index)
            return (x - x_min) / (x_max - x_min)
        
        failure_score = normalize(df["payment_failures_90d"])
        late_score = normalize(df["late_payments_count"])
        
        risk = (0.6 * failure_score + 0.4 * late_score) * 100
        
        return risk.round(2)
    
    def create_satisfaction_index(self, df: pd.DataFrame) -> pd.Series:
        """
        Create satisfaction index from NPS and feedback.
        Higher = more satisfied.
        
        Args:
            df: DataFrame with satisfaction features
            
        Returns:
            Satisfaction index series (0-100)
        """
        # NPS is 0-10, convert to 0-100
        nps_normalized = df["nps_score"] * 10
        
        # Feedback is 1-5, convert to 0-100
        feedback_normalized = (df["last_feedback_rating"] - 1) * 25
        
        # Reduce score for complaints
        complaint_penalty = df["complaints_count"] * 5
        
        satisfaction = (0.5 * nps_normalized + 0.5 * feedback_normalized) - complaint_penalty
        satisfaction = satisfaction.clip(0, 100)
        
        return satisfaction.round(2)
    
    def create_customer_value_score(self, df: pd.DataFrame) -> pd.Series:
        """
        Create customer lifetime value proxy score.
        
        Args:
            df: DataFrame with revenue and contract features
            
        Returns:
            Value score series
        """
        def normalize(x):
            x_min, x_max = x.min(), x.max()
            if x_max == x_min:
                return pd.Series(0.5, index=x.index)
            return (x - x_min) / (x_max - x_min)
        
        revenue_score = normalize(df["total_revenue"])
        tenure_score = normalize(df["contract_age_months"])
        price_score = normalize(df["plan_price"])
        
        value = (0.5 * revenue_score + 0.3 * tenure_score + 0.2 * price_score) * 100
        
        return value.round(2)
    
    def create_churn_risk_composite(self, df: pd.DataFrame) -> pd.Series:
        """
        Create composite churn risk indicator combining multiple signals.
        This mimics the churn prediction without using the actual model.
        
        Args:
            df: DataFrame with all features
            
        Returns:
            Churn risk score (0-1)
        """
        def normalize(x):
            x_min, x_max = x.min(), x.max()
            if x_max == x_min:
                return pd.Series(0.5, index=x.index)
            return (x - x_min) / (x_max - x_min)
        
        # Risk factors (higher = more risk)
        usage_decline_risk = normalize(-df["usage_change_30d"])
        login_risk = normalize(df["days_since_login"])
        payment_risk = normalize(df["payment_failures_90d"])
        support_risk = normalize(df["support_tickets"])
        satisfaction_risk = 1 - normalize(df["nps_score"])
        
        # Combine with research paper weights
        risk = (
            0.25 * usage_decline_risk +
            0.20 * login_risk +
            0.20 * payment_risk +
            0.15 * support_risk +
            0.20 * satisfaction_risk
        )
        
        return risk.round(4)
    
    def engineer_all_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Apply all feature engineering transformations.
        
        Args:
            df: Input DataFrame
            
        Returns:
            DataFrame with engineered features added
        """
        df = df.copy()
        
        # Create all engineered features
        df["engagement_score"] = self.create_engagement_score(df)
        df["usage_trend"] = self.create_usage_trend_indicator(df)
        df["payment_risk"] = self.create_payment_risk_score(df)
        df["satisfaction_index"] = self.create_satisfaction_index(df)
        df["customer_value"] = self.create_customer_value_score(df)
        df["churn_risk_composite"] = self.create_churn_risk_composite(df)
        
        # Store list of engineered features
        self.engineered_features = [
            "engagement_score",
            "usage_trend",
            "payment_risk",
            "satisfaction_index",
            "customer_value",
            "churn_risk_composite"
        ]
        
        print(f"Created {len(self.engineered_features)} engineered features")
        
        return df
    
    def get_feature_importance_order(self) -> List[str]:
        """
        Get features ordered by importance (from research paper).
        
        Returns:
            List of feature names ordered by importance
        """
        return [
            ("usage_change_30d", 0.23),
            ("days_since_login", 0.18),
            ("payment_failures_90d", 0.15),
            ("support_tickets", 0.12),
            ("contract_age_months", 0.10),
            ("nps_score", 0.08),
            ("complaints_count", 0.07),
            ("late_payments_count", 0.07)
        ]

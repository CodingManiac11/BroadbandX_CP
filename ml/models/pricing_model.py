"""
BroadbandX ML Service - Dynamic Pricing Engine
Multi-factor pricing optimization with churn risk integration.
"""
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, Optional, Any, Tuple, List
import joblib
import json
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import PRICING_CONFIG, MODELS_DIR, REPORTS_DIR


class DynamicPricingEngine:
    """
    Dynamic pricing engine implementing the formula from research paper:
    
    P_dynamic = P_base × (1 + α·D_t + β·E_c + γ·R_c)
    
    Where:
    - P_base = Base plan price
    - D_t = Demand factor at time t
    - E_c = Customer price elasticity coefficient
    - R_c = Churn risk factor
    - α, β, γ = Weight parameters
    """
    
    def __init__(self):
        """Initialize the pricing engine."""
        self.weights = PRICING_CONFIG["weights"].copy()
        self.constraints = PRICING_CONFIG["constraints"].copy()
        self.demand_factors = PRICING_CONFIG["demand_factors"].copy()
        self.churn_model = None
        self.segmentation_model = None
        self.pricing_history: List[Dict] = []
        self.is_initialized = True
    
    def set_models(
        self,
        churn_model: Any = None,
        segmentation_model: Any = None
    ) -> None:
        """
        Set the ML models for pricing calculations.
        
        Args:
            churn_model: Trained ChurnPredictor instance
            segmentation_model: Trained CustomerSegmentation instance
        """
        self.churn_model = churn_model
        self.segmentation_model = segmentation_model
        print("ML models attached to pricing engine")
    
    def calculate_demand_factor(
        self,
        timestamp: Optional[datetime] = None
    ) -> float:
        """
        Calculate demand factor based on time of day and day of week.
        
        Args:
            timestamp: Time for calculation. Uses current time if None.
            
        Returns:
            Demand factor D_t (-0.1 to 0.15)
        """
        if timestamp is None:
            timestamp = datetime.now()
        
        hour = timestamp.hour
        is_weekend = timestamp.weekday() >= 5
        
        # Peak hours (typically 6 PM - 10 PM)
        peak_start, peak_end = self.demand_factors["peak_hours"]
        
        if peak_start <= hour <= peak_end:
            demand = self.demand_factors["peak_multiplier"]
        else:
            demand = self.demand_factors["offpeak_multiplier"]
        
        # Add weekend adjustment
        if is_weekend:
            demand += self.demand_factors["weekend_multiplier"]
        
        return round(demand, 4)
    
    def estimate_price_elasticity(
        self,
        customer_features: Dict[str, float],
        segment_id: Optional[int] = None
    ) -> float:
        """
        Estimate price elasticity for a customer.
        
        Uses segmentation model if available, otherwise estimates from features.
        
        Args:
            customer_features: Customer feature dictionary
            segment_id: Known segment ID (optional)
            
        Returns:
            Price elasticity coefficient E_c
        """
        # If segmentation model is available, use it
        if self.segmentation_model is not None and self.segmentation_model.is_fitted:
            result = self.segmentation_model.predict_single(customer_features)
            return result["price_elasticity"]
        
        # Otherwise, estimate from features
        # High-value, high-satisfaction customers are less price sensitive
        nps = customer_features.get("nps_score", 5)
        plan_price = customer_features.get("plan_price", 1000)
        usage = customer_features.get("avg_monthly_usage_gb", 200)
        
        # Normalize to 0-1 scale
        nps_factor = nps / 10
        price_factor = min(plan_price / 2000, 1)
        usage_factor = min(usage / 500, 1)
        
        # High NPS + high price + high usage = low elasticity (less sensitive)
        # Low scores = high elasticity (more price sensitive)
        elasticity = -2.0 + (nps_factor * 0.7) + (price_factor * 0.5) + (usage_factor * 0.3)
        
        # Clamp to reasonable range
        elasticity = max(-2.5, min(-0.2, elasticity))
        
        return round(elasticity, 2)
    
    def calculate_churn_risk(
        self,
        customer_features: Dict[str, float]
    ) -> float:
        """
        Calculate churn risk factor for pricing.
        
        Uses churn model if available, otherwise estimates from features.
        
        Args:
            customer_features: Customer feature dictionary
            
        Returns:
            Churn risk factor R_c (0 to 1)
        """
        # If churn model is available, use it
        if self.churn_model is not None and self.churn_model.is_fitted:
            result = self.churn_model.predict_single(customer_features)
            return result["churn_probability"]
        
        # Otherwise, estimate from features
        # Normalize key risk indicators
        def normalize(val, min_val, max_val):
            return max(0, min(1, (val - min_val) / (max_val - min_val)))
        
        usage_decline = -customer_features.get("usage_change_30d", 0)
        days_inactive = customer_features.get("days_since_login", 0)
        payment_issues = customer_features.get("payment_failures_90d", 0)
        support_tickets = customer_features.get("support_tickets", 0)
        nps = customer_features.get("nps_score", 5)
        
        risk = (
            0.25 * normalize(usage_decline, 0, 30) +
            0.20 * normalize(days_inactive, 0, 30) +
            0.20 * normalize(payment_issues, 0, 3) +
            0.15 * normalize(support_tickets, 0, 5) +
            0.20 * (1 - nps / 10)
        )
        
        return round(risk, 4)
    
    def calculate_dynamic_price(
        self,
        base_price: float,
        customer_features: Dict[str, float],
        timestamp: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Calculate dynamic price using the multi-factor formula.
        
        P_dynamic = P_base × (1 + α·D_t + β·E_c + γ·R_c)
        
        Args:
            base_price: Base plan price (P_base)
            customer_features: Customer feature dictionary
            timestamp: Time for demand calculation
            
        Returns:
            Pricing result with breakdown
        """
        # Calculate each factor
        demand_factor = self.calculate_demand_factor(timestamp)
        elasticity = self.estimate_price_elasticity(customer_features)
        churn_risk = self.calculate_churn_risk(customer_features)
        
        # Get weights
        alpha = self.weights["alpha"]
        beta = self.weights["beta"]
        gamma = self.weights["gamma"]
        
        # Calculate adjustment factor
        # Note: For elasticity, more negative = more sensitive = should give discount
        # We normalize elasticity to a 0-1 scale where higher means more discount
        elasticity_factor = max(0, min(1, (-elasticity - 0.2) / 2.3))
        
        # For churn risk, higher risk = should give discount to retain
        # We invert it so high risk leads to discount
        churn_discount = churn_risk * gamma
        
        # Combined adjustment
        adjustment = (
            alpha * demand_factor +
            beta * (-elasticity_factor) +  # Negative because high elasticity = discount
            (-churn_discount)  # Negative for retention discount
        )
        
        # Apply constraints
        adjustment = max(
            self.constraints["min_discount"],
            min(self.constraints["max_premium"], adjustment)
        )
        
        # Calculate final price
        dynamic_price = base_price * (1 + adjustment)
        
        # Ensure price is positive
        dynamic_price = max(base_price * 0.5, dynamic_price)
        
        # Calculate discount/premium percentage
        price_change_pct = ((dynamic_price - base_price) / base_price) * 100
        
        result = {
            "base_price": base_price,
            "dynamic_price": round(dynamic_price, 2),
            "price_change": round(dynamic_price - base_price, 2),
            "price_change_percent": round(price_change_pct, 2),
            "factors": {
                "demand_factor": demand_factor,
                "elasticity": elasticity,
                "elasticity_factor": round(elasticity_factor, 4),
                "churn_risk": churn_risk
            },
            "weights": self.weights,
            "adjustment": round(adjustment, 4),
            "timestamp": timestamp.isoformat() if timestamp else datetime.now().isoformat()
        }
        
        # Add recommendation
        result["recommendation"] = self._generate_recommendation(result)
        
        # Store in history
        self.pricing_history.append(result)
        
        return result
    
    def _generate_recommendation(self, pricing_result: Dict) -> str:
        """Generate pricing recommendation based on calculation."""
        change_pct = pricing_result["price_change_percent"]
        churn_risk = pricing_result["factors"]["churn_risk"]
        
        if change_pct < -20:
            return "High retention risk. Apply maximum discount with loyalty offer."
        elif change_pct < -10:
            return "Moderate retention risk. Offer promotional discount."
        elif change_pct < 0:
            return "Slight concern. Consider small incentive to maintain engagement."
        elif change_pct <= 10:
            return "Customer is stable. Standard pricing applies."
        else:
            return "High-value customer. Premium pricing acceptable."
    
    def optimize_revenue(
        self,
        customers: List[Dict[str, Any]],
        base_prices: List[float]
    ) -> Dict[str, Any]:
        """
        Optimize total revenue across multiple customers.
        
        Args:
            customers: List of customer feature dictionaries
            base_prices: List of base prices for each customer
            
        Returns:
            Revenue optimization results
        """
        results = []
        total_base_revenue = 0
        total_dynamic_revenue = 0
        
        for features, base_price in zip(customers, base_prices):
            pricing = self.calculate_dynamic_price(base_price, features)
            results.append(pricing)
            total_base_revenue += base_price
            total_dynamic_revenue += pricing["dynamic_price"]
        
        revenue_change = total_dynamic_revenue - total_base_revenue
        revenue_change_pct = (revenue_change / total_base_revenue) * 100
        
        return {
            "total_base_revenue": round(total_base_revenue, 2),
            "total_dynamic_revenue": round(total_dynamic_revenue, 2),
            "revenue_change": round(revenue_change, 2),
            "revenue_change_percent": round(revenue_change_pct, 2),
            "customers_processed": len(customers),
            "avg_price_change_pct": round(
                sum(r["price_change_percent"] for r in results) / len(results), 2
            ),
            "individual_results": results
        }
    
    def simulate_pricing_scenarios(
        self,
        base_price: float,
        customer_features: Dict[str, float],
        scenarios: List[str] = None
    ) -> Dict[str, Dict]:
        """
        Simulate pricing under different scenarios.
        
        Args:
            base_price: Base plan price
            customer_features: Customer feature dictionary
            scenarios: List of scenario names
            
        Returns:
            Dictionary of scenario results
        """
        if scenarios is None:
            scenarios = ["peak_weekday", "offpeak_weekday", "peak_weekend", "offpeak_weekend"]
        
        results = {}
        
        for scenario in scenarios:
            # Create appropriate timestamp for scenario
            if scenario == "peak_weekday":
                ts = datetime(2024, 1, 15, 20, 0)  # Monday 8 PM
            elif scenario == "offpeak_weekday":
                ts = datetime(2024, 1, 15, 10, 0)  # Monday 10 AM
            elif scenario == "peak_weekend":
                ts = datetime(2024, 1, 20, 20, 0)  # Saturday 8 PM
            elif scenario == "offpeak_weekend":
                ts = datetime(2024, 1, 20, 10, 0)  # Saturday 10 AM
            else:
                ts = datetime.now()
            
            results[scenario] = self.calculate_dynamic_price(base_price, customer_features, ts)
        
        return results
    
    def update_weights(
        self,
        alpha: Optional[float] = None,
        beta: Optional[float] = None,
        gamma: Optional[float] = None
    ) -> None:
        """
        Update pricing weights.
        
        Args:
            alpha: Demand weight
            beta: Elasticity weight
            gamma: Churn risk weight
        """
        if alpha is not None:
            self.weights["alpha"] = alpha
        if beta is not None:
            self.weights["beta"] = beta
        if gamma is not None:
            self.weights["gamma"] = gamma
        
        print(f"Updated weights: α={self.weights['alpha']}, β={self.weights['beta']}, γ={self.weights['gamma']}")
    
    def get_pricing_history(self, limit: int = 100) -> List[Dict]:
        """Get recent pricing calculations."""
        return self.pricing_history[-limit:]
    
    def calculate_roi_projection(
        self,
        customers_saved: int,
        avg_revenue_per_user: float,
        avg_lifetime_months: int,
        implementation_cost: float
    ) -> Dict[str, float]:
        """
        Calculate ROI projection as per research paper formula.
        
        ROI = [(Churn Reduction × Customers × ARPU × Avg Lifetime) - Cost] / Cost
        
        Args:
            customers_saved: Number of customers saved from churning
            avg_revenue_per_user: Average monthly revenue per user
            avg_lifetime_months: Average customer lifetime in months
            implementation_cost: Total implementation cost
            
        Returns:
            ROI metrics
        """
        revenue_saved = customers_saved * avg_revenue_per_user * avg_lifetime_months
        net_benefit = revenue_saved - implementation_cost
        roi = (net_benefit / implementation_cost) * 100
        
        return {
            "customers_saved": customers_saved,
            "revenue_saved": round(revenue_saved, 2),
            "implementation_cost": implementation_cost,
            "net_benefit": round(net_benefit, 2),
            "roi_percent": round(roi, 2),
            "payback_months": round(implementation_cost / (revenue_saved / avg_lifetime_months), 1)
        }
    
    def save(self, filepath: Optional[Path] = None) -> None:
        """Save the pricing engine configuration."""
        if filepath is None:
            filepath = MODELS_DIR / "pricing_model.joblib"
        
        engine_data = {
            "weights": self.weights,
            "constraints": self.constraints,
            "demand_factors": self.demand_factors
        }
        
        joblib.dump(engine_data, filepath)
        print(f"Pricing engine saved to: {filepath}")
        
        # Save configuration as JSON
        config_path = REPORTS_DIR / "pricing_config.json"
        with open(config_path, "w") as f:
            json.dump(engine_data, f, indent=2)
        print(f"Pricing config saved to: {config_path}")
    
    def load(self, filepath: Optional[Path] = None) -> None:
        """Load pricing engine configuration."""
        if filepath is None:
            filepath = MODELS_DIR / "pricing_model.joblib"
        
        if not Path(filepath).exists():
            raise FileNotFoundError(f"Pricing engine file not found: {filepath}")
        
        engine_data = joblib.load(filepath)
        
        self.weights = engine_data["weights"]
        self.constraints = engine_data["constraints"]
        self.demand_factors = engine_data["demand_factors"]
        
        print(f"Pricing engine loaded from: {filepath}")

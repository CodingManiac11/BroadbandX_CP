"""
BroadbandX ML Service - Synthetic Data Generator
Generates realistic customer data for ML model training.
"""
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import DATA_CONFIG, SYNTHETIC_DATA_PATH


class DataGenerator:
    """
    Generates synthetic broadband customer data with realistic distributions.
    
    Features generated:
    - Demographics (age, location, account type)
    - Subscription details (plan, price, billing cycle)
    - Usage patterns (data usage, speed, sessions)
    - Payment history (failures, late payments)
    - Engagement metrics (login frequency, support tickets)
    - Satisfaction scores (NPS, feedback ratings)
    - Churn labels with realistic probability based on features
    """
    
    def __init__(self, n_samples: int = 10000, random_seed: int = 42):
        """
        Initialize the data generator.
        
        Args:
            n_samples: Number of customer records to generate
            random_seed: Random seed for reproducibility
        """
        self.n_samples = n_samples
        self.random_seed = random_seed
        np.random.seed(random_seed)
        
        # Plan configurations (matching existing Plan model)
        self.plans = {
            "Basic": {"price": 499, "speed": 50, "data_limit": 500},
            "Standard": {"price": 799, "speed": 100, "data_limit": 1000},
            "Premium": {"price": 1299, "speed": 200, "data_limit": None},  # Unlimited
            "Ultra": {"price": 1999, "speed": 500, "data_limit": None},
            "Business": {"price": 2999, "speed": 1000, "data_limit": None}
        }
        
        # Locations (matching availability regions)
        self.locations = [
            "Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad",
            "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow"
        ]
    
    def _generate_customer_id(self) -> np.ndarray:
        """Generate unique customer IDs."""
        return np.array([f"CUST_{i:06d}" for i in range(1, self.n_samples + 1)])
    
    def _generate_demographics(self) -> dict:
        """Generate demographic features."""
        return {
            "age": np.random.normal(35, 12, self.n_samples).clip(18, 75).astype(int),
            "location": np.random.choice(self.locations, self.n_samples),
            "account_type": np.random.choice(
                ["residential", "business"],
                self.n_samples,
                p=[0.85, 0.15]
            )
        }
    
    def _generate_subscription_data(self) -> dict:
        """Generate subscription-related features."""
        plan_names = list(self.plans.keys())
        plan_probs = [0.20, 0.30, 0.25, 0.15, 0.10]  # Distribution matching segments
        
        selected_plans = np.random.choice(plan_names, self.n_samples, p=plan_probs)
        
        return {
            "plan_name": selected_plans,
            "plan_price": np.array([self.plans[p]["price"] for p in selected_plans]),
            "plan_speed_mbps": np.array([self.plans[p]["speed"] for p in selected_plans]),
            "billing_cycle": np.random.choice(
                ["monthly", "yearly"],
                self.n_samples,
                p=[0.70, 0.30]
            ),
            "contract_age_months": np.random.exponential(18, self.n_samples).clip(1, 60).astype(int)
        }
    
    def _generate_usage_data(self, plan_data: dict) -> dict:
        """Generate usage pattern features based on plan type."""
        base_usage = plan_data["plan_speed_mbps"] * 3  # Base GB usage proportional to speed
        
        # Add noise and variation
        avg_monthly_usage_gb = (base_usage + np.random.normal(0, 50, self.n_samples)).clip(10, 2000)
        
        # Generate usage trends (negative indicates decline)
        usage_change_30d = np.random.normal(-2, 15, self.n_samples).clip(-50, 30)
        usage_change_60d = np.random.normal(-3, 20, self.n_samples).clip(-60, 40)
        usage_change_90d = np.random.normal(-5, 25, self.n_samples).clip(-70, 50)
        
        return {
            "avg_monthly_usage_gb": avg_monthly_usage_gb.round(2),
            "avg_speed_mbps": (plan_data["plan_speed_mbps"] * 
                             np.random.uniform(0.7, 0.95, self.n_samples)).round(1),
            "session_count_30d": np.random.poisson(45, self.n_samples).clip(5, 150),
            "usage_change_30d": usage_change_30d.round(2),
            "usage_change_60d": usage_change_60d.round(2),
            "usage_change_90d": usage_change_90d.round(2)
        }
    
    def _generate_payment_data(self) -> dict:
        """Generate payment history features."""
        return {
            "payment_failures_90d": np.random.poisson(0.3, self.n_samples).clip(0, 5),
            "late_payments_count": np.random.poisson(0.5, self.n_samples).clip(0, 8),
            "total_revenue": np.random.uniform(1000, 50000, self.n_samples).round(2)
        }
    
    def _generate_engagement_data(self) -> dict:
        """Generate customer engagement features."""
        return {
            "days_since_login": np.random.exponential(7, self.n_samples).clip(0, 90).astype(int),
            "support_tickets": np.random.poisson(1.2, self.n_samples).clip(0, 15),
            "complaints_count": np.random.poisson(0.4, self.n_samples).clip(0, 8),
            "app_usage_hours": np.random.exponential(5, self.n_samples).clip(0, 50).round(1)
        }
    
    def _generate_satisfaction_data(self) -> dict:
        """Generate customer satisfaction features."""
        return {
            "nps_score": np.random.choice(
                range(0, 11),
                self.n_samples,
                p=[0.02, 0.02, 0.03, 0.05, 0.08, 0.15, 0.15, 0.18, 0.15, 0.10, 0.07]
            ),
            "last_feedback_rating": np.random.choice(
                [1, 2, 3, 4, 5],
                self.n_samples,
                p=[0.05, 0.10, 0.25, 0.35, 0.25]
            )
        }
    
    def _calculate_churn_probability(self, features: pd.DataFrame) -> np.ndarray:
        """
        Calculate churn probability based on feature weights.
        Uses logistic function with feature importance weights from research paper.
        """
        # Normalize features to 0-1 range for calculation
        def normalize(x):
            return (x - x.min()) / (x.max() - x.min() + 1e-10)
        
        # Feature weights from research paper (Table II)
        churn_score = (
            0.23 * normalize(-features["usage_change_30d"]) +  # Negative change increases churn
            0.18 * normalize(features["days_since_login"]) +
            0.15 * normalize(features["payment_failures_90d"]) +
            0.12 * normalize(features["support_tickets"]) +
            0.10 * normalize(-features["contract_age_months"]) +  # Newer customers more likely to churn
            0.08 * normalize(-features["nps_score"]) +
            0.07 * normalize(features["complaints_count"]) +
            0.07 * normalize(features["late_payments_count"])
        )
        
        # Apply logistic function to get probability
        churn_probability = 1 / (1 + np.exp(-(churn_score * 8 - 3)))
        
        # Add noise for realism
        churn_probability += np.random.normal(0, 0.05, self.n_samples)
        churn_probability = np.clip(churn_probability, 0, 1)
        
        return churn_probability
    
    def _generate_churn_labels(self, churn_probability: np.ndarray) -> dict:
        """Generate churn labels based on probability."""
        # Target ~25% churn rate as per research paper
        threshold = np.percentile(churn_probability, 75)
        churned = (churn_probability >= threshold).astype(int)
        
        # Adjust to hit target churn rate
        current_rate = churned.mean()
        target_rate = DATA_CONFIG["churn_rate"]
        
        if current_rate < target_rate:
            # Need more churners
            non_churned_idx = np.where(churned == 0)[0]
            n_to_flip = int((target_rate - current_rate) * self.n_samples)
            flip_idx = np.random.choice(non_churned_idx, min(n_to_flip, len(non_churned_idx)), replace=False)
            churned[flip_idx] = 1
        elif current_rate > target_rate:
            # Need fewer churners
            churned_idx = np.where(churned == 1)[0]
            n_to_flip = int((current_rate - target_rate) * self.n_samples)
            flip_idx = np.random.choice(churned_idx, min(n_to_flip, len(churned_idx)), replace=False)
            churned[flip_idx] = 0
        
        return {
            "churned": churned,
            "churn_probability": churn_probability.round(4)
        }
    
    def _generate_timestamps(self, churn_labels: np.ndarray) -> dict:
        """Generate timestamp features."""
        base_date = datetime(2023, 1, 1)
        
        # Customer since dates
        customer_since = [
            base_date + timedelta(days=np.random.randint(0, 365))
            for _ in range(self.n_samples)
        ]
        
        # Churn dates (only for churned customers)
        churn_dates = []
        for i, is_churned in enumerate(churn_labels):
            if is_churned:
                # Churn happened after customer since date
                days_after = np.random.randint(30, 365)
                churn_dates.append(customer_since[i] + timedelta(days=days_after))
            else:
                churn_dates.append(None)
        
        return {
            "customer_since": customer_since,
            "churn_date": churn_dates,
            "last_activity_date": [
                datetime(2024, 12, 31) - timedelta(days=np.random.randint(0, 30))
                for _ in range(self.n_samples)
            ]
        }
    
    def generate(self, save: bool = True) -> pd.DataFrame:
        """
        Generate complete synthetic dataset.
        
        Args:
            save: Whether to save the dataset to CSV
            
        Returns:
            DataFrame with all generated features
        """
        print(f"Generating {self.n_samples} synthetic customer records...")
        
        # Generate all feature groups
        demographics = self._generate_demographics()
        subscription = self._generate_subscription_data()
        usage = self._generate_usage_data(subscription)
        payment = self._generate_payment_data()
        engagement = self._generate_engagement_data()
        satisfaction = self._generate_satisfaction_data()
        
        # Combine into DataFrame
        df = pd.DataFrame({
            "customer_id": self._generate_customer_id(),
            **demographics,
            **subscription,
            **usage,
            **payment,
            **engagement,
            **satisfaction
        })
        
        # Calculate churn probability and generate labels
        churn_prob = self._calculate_churn_probability(df)
        churn_data = self._generate_churn_labels(churn_prob)
        df["churned"] = churn_data["churned"]
        df["churn_probability_true"] = churn_data["churn_probability"]
        
        # Add timestamps
        timestamps = self._generate_timestamps(df["churned"].values)
        df["customer_since"] = timestamps["customer_since"]
        df["churn_date"] = timestamps["churn_date"]
        df["last_activity_date"] = timestamps["last_activity_date"]
        
        # Create binary features for categorical variables
        df["billing_cycle_monthly"] = (df["billing_cycle"] == "monthly").astype(int)
        df["account_type_business"] = (df["account_type"] == "business").astype(int)
        
        # Reorder columns logically
        column_order = [
            # ID
            "customer_id",
            # Demographics
            "age", "location", "account_type", "account_type_business",
            # Subscription
            "plan_name", "plan_price", "plan_speed_mbps", "billing_cycle", 
            "billing_cycle_monthly", "contract_age_months",
            # Usage
            "avg_monthly_usage_gb", "avg_speed_mbps", "session_count_30d",
            "usage_change_30d", "usage_change_60d", "usage_change_90d",
            # Payment
            "payment_failures_90d", "late_payments_count", "total_revenue",
            # Engagement
            "days_since_login", "support_tickets", "complaints_count", "app_usage_hours",
            # Satisfaction
            "nps_score", "last_feedback_rating",
            # Timestamps
            "customer_since", "last_activity_date", "churn_date",
            # Target
            "churn_probability_true", "churned"
        ]
        df = df[column_order]
        
        # Save to CSV
        if save:
            df.to_csv(SYNTHETIC_DATA_PATH, index=False)
            print(f"Dataset saved to: {SYNTHETIC_DATA_PATH}")
        
        # Print summary statistics
        print("\n" + "="*60)
        print("DATASET SUMMARY")
        print("="*60)
        print(f"Total records: {len(df)}")
        print(f"Churn rate: {df['churned'].mean()*100:.1f}%")
        print(f"Features: {len(df.columns)}")
        print(f"\nPlan distribution:")
        print(df["plan_name"].value_counts())
        print(f"\nAccount type distribution:")
        print(df["account_type"].value_counts())
        print("="*60)
        
        return df


def main():
    """Main function to generate synthetic data."""
    generator = DataGenerator(
        n_samples=DATA_CONFIG["n_samples"],
        random_seed=DATA_CONFIG["random_seed"]
    )
    df = generator.generate(save=True)
    
    print("\n✅ Synthetic data generation complete!")
    print(f"Shape: {df.shape}")
    print(f"\nFirst 5 rows:")
    print(df.head())
    
    return df


if __name__ == "__main__":
    main()

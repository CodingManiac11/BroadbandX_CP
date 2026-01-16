"""
BroadbandX ML Service - Customer Segmentation Model
K-Means clustering for customer segmentation with price elasticity estimation.
"""
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score, calinski_harabasz_score, davies_bouldin_score
from typing import Dict, List, Optional, Any, Tuple
import joblib
import json
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import SEGMENTATION_CONFIG, MODELS_DIR, REPORTS_DIR, FEATURE_CONFIG


class CustomerSegmentation:
    """
    K-Means clustering for customer segmentation.
    
    Segments from research paper:
    - Premium Power Users (15%): elasticity -0.3
    - Price-Conscious (25%): elasticity -1.8
    - Value-Seekers (30%): elasticity -1.2
    - Budget Users (20%): elasticity -2.0
    - Casual Premium (10%): elasticity -0.5
    """
    
    def __init__(self, n_clusters: int = 5):
        """
        Initialize the segmentation model.
        
        Args:
            n_clusters: Number of customer segments
        """
        self.n_clusters = n_clusters
        self.model = KMeans(
            n_clusters=n_clusters,
            random_state=SEGMENTATION_CONFIG["random_state"],
            max_iter=SEGMENTATION_CONFIG["max_iter"],
            n_init=SEGMENTATION_CONFIG["n_init"]
        )
        self.scaler = StandardScaler()
        self.pca = PCA(n_components=2)
        self.is_fitted = False
        self.feature_names: List[str] = []
        self.segment_profiles: Dict[int, Dict] = {}
        self.cluster_centers_original: np.ndarray = None
        self.metrics: Dict[str, float] = {}
    
    def prepare_features(
        self,
        df: pd.DataFrame,
        feature_list: Optional[List[str]] = None,
        fit: bool = True
    ) -> np.ndarray:
        """
        Prepare features for clustering.
        
        Args:
            df: Input DataFrame
            feature_list: List of features to use
            fit: Whether to fit the scaler
            
        Returns:
            Scaled feature matrix
        """
        if feature_list is None:
            feature_list = FEATURE_CONFIG["segmentation_features"]
        
        self.feature_names = feature_list
        X = df[feature_list].values.astype(np.float64)
        
        # Handle NaN values
        X = np.nan_to_num(X, nan=0.0)
        
        if fit:
            X_scaled = self.scaler.fit_transform(X)
        else:
            X_scaled = self.scaler.transform(X)
        
        return X_scaled
    
    def train(
        self,
        X: np.ndarray,
        df: Optional[pd.DataFrame] = None
    ) -> np.ndarray:
        """
        Train the clustering model.
        
        Args:
            X: Scaled feature matrix
            df: Original DataFrame for profile creation
            
        Returns:
            Cluster labels
        """
        print("\n" + "="*60)
        print("TRAINING CUSTOMER SEGMENTATION MODEL")
        print("="*60)
        
        print(f"\nFitting K-Means with {self.n_clusters} clusters...")
        
        # Fit the model
        labels = self.model.fit_predict(X)
        self.is_fitted = True
        
        # Store cluster centers in original scale
        self.cluster_centers_original = self.scaler.inverse_transform(self.model.cluster_centers_)
        
        # Fit PCA for visualization
        self.pca.fit(X)
        
        # Calculate clustering metrics
        self._calculate_metrics(X, labels)
        
        # Create segment profiles
        if df is not None:
            self._create_segment_profiles(df, labels)
        
        print("\nClustering complete!")
        return labels
    
    def _calculate_metrics(self, X: np.ndarray, labels: np.ndarray) -> None:
        """Calculate clustering quality metrics."""
        self.metrics = {
            "silhouette_score": float(silhouette_score(X, labels)),
            "calinski_harabasz_score": float(calinski_harabasz_score(X, labels)),
            "davies_bouldin_score": float(davies_bouldin_score(X, labels)),
            "inertia": float(self.model.inertia_)
        }
        
        print("\nClustering Metrics:")
        print(f"  Silhouette Score: {self.metrics['silhouette_score']:.4f} (higher is better)")
        print(f"  Calinski-Harabasz: {self.metrics['calinski_harabasz_score']:.2f} (higher is better)")
        print(f"  Davies-Bouldin: {self.metrics['davies_bouldin_score']:.4f} (lower is better)")
        print(f"  Inertia: {self.metrics['inertia']:.2f}")
    
    def _create_segment_profiles(
        self,
        df: pd.DataFrame,
        labels: np.ndarray
    ) -> None:
        """
        Create detailed profiles for each segment.
        
        Args:
            df: Original DataFrame
            labels: Cluster labels
        """
        print("\n" + "-"*60)
        print("SEGMENT PROFILES")
        print("-"*60)
        
        df_with_labels = df.copy()
        df_with_labels["segment"] = labels
        
        segment_defs = SEGMENTATION_CONFIG["segment_definitions"]
        
        for cluster_id in range(self.n_clusters):
            segment_df = df_with_labels[df_with_labels["segment"] == cluster_id]
            
            # Calculate segment statistics
            population = len(segment_df) / len(df)
            
            # Get segment definition (map by characteristics)
            segment_def = self._match_segment_definition(segment_df, segment_defs)
            
            profile = {
                "name": segment_def["name"],
                "population": round(population, 4),
                "population_count": len(segment_df),
                "price_elasticity": segment_def["elasticity"],
                "characteristics": {
                    "avg_plan_price": round(segment_df["plan_price"].mean(), 2),
                    "avg_monthly_usage_gb": round(segment_df["avg_monthly_usage_gb"].mean(), 2),
                    "avg_revenue": round(segment_df["total_revenue"].mean(), 2),
                    "avg_contract_age_months": round(segment_df["contract_age_months"].mean(), 1),
                    "avg_nps_score": round(segment_df["nps_score"].mean(), 2),
                    "avg_support_tickets": round(segment_df["support_tickets"].mean(), 2),
                    "churn_rate": round(segment_df["churned"].mean(), 4) if "churned" in segment_df.columns else None
                },
                "pricing_strategy": self._get_pricing_strategy(segment_def)
            }
            
            self.segment_profiles[cluster_id] = profile
            
            print(f"\nSegment {cluster_id}: {profile['name']}")
            print(f"  Population: {profile['population']*100:.1f}% ({profile['population_count']} customers)")
            print(f"  Price Elasticity: {profile['price_elasticity']}")
            print(f"  Avg Plan Price: ₹{profile['characteristics']['avg_plan_price']}")
            print(f"  Avg Monthly Usage: {profile['characteristics']['avg_monthly_usage_gb']} GB")
            print(f"  Avg NPS Score: {profile['characteristics']['avg_nps_score']}")
            print(f"  Strategy: {profile['pricing_strategy']}")
    
    def _match_segment_definition(
        self,
        segment_df: pd.DataFrame,
        segment_defs: Dict
    ) -> Dict:
        """Match segment to predefined definitions based on characteristics."""
        avg_price = segment_df["plan_price"].mean()
        avg_usage = segment_df["avg_monthly_usage_gb"].mean()
        avg_nps = segment_df["nps_score"].mean()
        
        # Classification logic based on characteristics
        if avg_price > 1500 and avg_usage > 400 and avg_nps > 7:
            return segment_defs[0]  # Premium Power Users
        elif avg_price < 700 and avg_nps < 6:
            return segment_defs[3]  # Budget Users
        elif avg_price > 1200 and avg_usage < 200:
            return segment_defs[4]  # Casual Premium
        elif avg_nps < 5:
            return segment_defs[1]  # Price-Conscious
        else:
            return segment_defs[2]  # Value-Seekers
    
    def _get_pricing_strategy(self, segment_def: Dict) -> str:
        """Get pricing strategy recommendation for segment."""
        strategies = {
            "Premium Power Users": "Focus on loyalty rewards and exclusive features. Low price sensitivity.",
            "Price-Conscious": "Offer dynamic discounts and promotional pricing. High price sensitivity.",
            "Value-Seekers": "Emphasize value-for-money with tiered pricing options.",
            "Budget Users": "Off-peak offers and basic plans with flexibility.",
            "Casual Premium": "Convenience pricing with simple premium options."
        }
        return strategies.get(segment_def["name"], "Standard pricing strategy")
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Predict segment labels for new data.
        
        Args:
            X: Scaled feature matrix
            
        Returns:
            Cluster labels
        """
        if not self.is_fitted:
            raise ValueError("Model not fitted. Call train() first.")
        
        return self.model.predict(X)
    
    def get_segment_info(self, segment_id: int) -> Dict[str, Any]:
        """
        Get information about a specific segment.
        
        Args:
            segment_id: Cluster ID
            
        Returns:
            Segment profile dictionary
        """
        if segment_id not in self.segment_profiles:
            raise ValueError(f"Unknown segment ID: {segment_id}")
        
        return self.segment_profiles[segment_id]
    
    def get_pca_coordinates(self, X: np.ndarray) -> np.ndarray:
        """
        Get 2D PCA coordinates for visualization.
        
        Args:
            X: Scaled feature matrix
            
        Returns:
            2D coordinates
        """
        return self.pca.transform(X)
    
    def get_cluster_centers_pca(self) -> np.ndarray:
        """Get cluster centers in PCA space."""
        return self.pca.transform(self.model.cluster_centers_)
    
    def predict_single(self, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Predict segment for a single customer.
        
        Args:
            features: Dictionary of feature name -> value
            
        Returns:
            Segment prediction with details
        """
        if not self.is_fitted:
            raise ValueError("Model not fitted. Call train() or load() first.")
        
        # Build feature vector
        X = np.array([[features.get(f, 0) for f in self.feature_names]])
        
        # Scale features
        X_scaled = self.scaler.transform(X)
        
        # Predict segment
        segment_id = int(self.model.predict(X_scaled)[0])
        segment_info = self.segment_profiles.get(segment_id, {})
        
        # Calculate distance to cluster centers
        distances = np.linalg.norm(X_scaled - self.model.cluster_centers_, axis=1)
        confidence = 1 - (distances[segment_id] / distances.sum())
        
        return {
            "segment_id": segment_id,
            "segment_name": segment_info.get("name", "Unknown"),
            "price_elasticity": segment_info.get("price_elasticity", -1.0),
            "pricing_strategy": segment_info.get("pricing_strategy", ""),
            "confidence": round(float(confidence), 4)
        }
    
    def find_optimal_clusters(
        self,
        X: np.ndarray,
        min_k: int = 2,
        max_k: int = 10
    ) -> Dict[str, List[float]]:
        """
        Find optimal number of clusters using elbow method.
        
        Args:
            X: Scaled feature matrix
            min_k: Minimum number of clusters
            max_k: Maximum number of clusters
            
        Returns:
            Dictionary with inertia and silhouette scores for each k
        """
        inertias = []
        silhouettes = []
        
        for k in range(min_k, max_k + 1):
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            labels = kmeans.fit_predict(X)
            inertias.append(kmeans.inertia_)
            silhouettes.append(silhouette_score(X, labels))
        
        return {
            "k_values": list(range(min_k, max_k + 1)),
            "inertias": inertias,
            "silhouettes": silhouettes
        }
    
    def save(self, filepath: Optional[Path] = None) -> None:
        """Save the trained model."""
        if not self.is_fitted:
            raise ValueError("Model not fitted. Cannot save.")
        
        if filepath is None:
            filepath = MODELS_DIR / "segmentation_model.joblib"
        
        model_data = {
            "model": self.model,
            "scaler": self.scaler,
            "pca": self.pca,
            "feature_names": self.feature_names,
            "segment_profiles": self.segment_profiles,
            "cluster_centers_original": self.cluster_centers_original,
            "metrics": self.metrics,
            "n_clusters": self.n_clusters
        }
        
        joblib.dump(model_data, filepath)
        print(f"Model saved to: {filepath}")
        
        # Save segment profiles as JSON
        profiles_path = REPORTS_DIR / "segment_profiles.json"
        with open(profiles_path, "w") as f:
            json.dump({
                "segments": self.segment_profiles,
                "metrics": self.metrics
            }, f, indent=2, default=str)
        print(f"Segment profiles saved to: {profiles_path}")
    
    def load(self, filepath: Optional[Path] = None) -> None:
        """Load a trained model."""
        if filepath is None:
            filepath = MODELS_DIR / "segmentation_model.joblib"
        
        if not Path(filepath).exists():
            raise FileNotFoundError(f"Model file not found: {filepath}")
        
        model_data = joblib.load(filepath)
        
        self.model = model_data["model"]
        self.scaler = model_data["scaler"]
        self.pca = model_data["pca"]
        self.feature_names = model_data["feature_names"]
        self.segment_profiles = model_data["segment_profiles"]
        self.cluster_centers_original = model_data["cluster_centers_original"]
        self.metrics = model_data["metrics"]
        self.n_clusters = model_data["n_clusters"]
        self.is_fitted = True
        
        print(f"Model loaded from: {filepath}")

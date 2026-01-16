"""
BroadbandX ML Service - Visualization Utilities
Functions for creating model performance and analysis visualizations.
"""
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import roc_curve, precision_recall_curve, confusion_matrix
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import VISUALIZATIONS_DIR

# Set style
plt.style.use('seaborn-v0_8-whitegrid')
sns.set_palette("husl")


class Visualizer:
    """
    Visualization utilities for ML models and analysis.
    """
    
    def __init__(self, save_dir: Optional[Path] = None):
        """
        Initialize visualizer.
        
        Args:
            save_dir: Directory to save visualizations
        """
        self.save_dir = save_dir or VISUALIZATIONS_DIR
        self.save_dir.mkdir(parents=True, exist_ok=True)
    
    def plot_roc_curve(
        self,
        y_true: np.ndarray,
        y_proba: np.ndarray,
        title: str = "ROC Curve - Churn Prediction",
        save_name: str = "roc_curve.png"
    ) -> None:
        """
        Plot ROC curve with AUC score.
        
        Args:
            y_true: True labels
            y_proba: Prediction probabilities
            title: Plot title
            save_name: Filename to save
        """
        from sklearn.metrics import roc_auc_score
        
        fpr, tpr, thresholds = roc_curve(y_true, y_proba)
        auc = roc_auc_score(y_true, y_proba)
        
        fig, ax = plt.subplots(figsize=(10, 8))
        
        # Plot ROC curve
        ax.plot(fpr, tpr, 'b-', linewidth=2, label=f'ROC Curve (AUC = {auc:.3f})')
        ax.plot([0, 1], [0, 1], 'k--', linewidth=1, label='Random Classifier')
        
        # Fill area under curve
        ax.fill_between(fpr, tpr, alpha=0.3)
        
        # Add target line
        ax.axhline(y=0.91, color='g', linestyle='--', alpha=0.7, label='Target AUC = 0.91')
        
        ax.set_xlabel('False Positive Rate', fontsize=12)
        ax.set_ylabel('True Positive Rate', fontsize=12)
        ax.set_title(title, fontsize=14, fontweight='bold')
        ax.legend(loc='lower right', fontsize=10)
        ax.set_xlim([0, 1])
        ax.set_ylim([0, 1.05])
        
        plt.tight_layout()
        
        save_path = self.save_dir / save_name
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        print(f"ROC curve saved to: {save_path}")
    
    def plot_confusion_matrix(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        title: str = "Confusion Matrix - Churn Prediction",
        save_name: str = "confusion_matrix.png"
    ) -> None:
        """
        Plot confusion matrix heatmap.
        
        Args:
            y_true: True labels
            y_pred: Predicted labels
            title: Plot title
            save_name: Filename to save
        """
        cm = confusion_matrix(y_true, y_pred)
        
        fig, ax = plt.subplots(figsize=(8, 6))
        
        sns.heatmap(
            cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=['Not Churned', 'Churned'],
            yticklabels=['Not Churned', 'Churned'],
            ax=ax
        )
        
        ax.set_xlabel('Predicted', fontsize=12)
        ax.set_ylabel('Actual', fontsize=12)
        ax.set_title(title, fontsize=14, fontweight='bold')
        
        plt.tight_layout()
        
        save_path = self.save_dir / save_name
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        print(f"Confusion matrix saved to: {save_path}")
    
    def plot_feature_importance(
        self,
        feature_importances: Dict[str, float],
        title: str = "Feature Importance - Churn Prediction",
        save_name: str = "feature_importance.png",
        top_n: int = 10
    ) -> None:
        """
        Plot feature importance bar chart.
        
        Args:
            feature_importances: Dictionary of feature name -> importance
            title: Plot title
            save_name: Filename to save
            top_n: Number of top features to show
        """
        # Sort and get top N
        sorted_features = sorted(feature_importances.items(), key=lambda x: x[1], reverse=True)[:top_n]
        features, importances = zip(*sorted_features)
        
        fig, ax = plt.subplots(figsize=(12, 8))
        
        # Horizontal bar chart
        y_pos = np.arange(len(features))
        bars = ax.barh(y_pos, importances, color=sns.color_palette("viridis", len(features)))
        
        ax.set_yticks(y_pos)
        ax.set_yticklabels(features)
        ax.invert_yaxis()
        
        ax.set_xlabel('Importance Score', fontsize=12)
        ax.set_title(title, fontsize=14, fontweight='bold')
        
        # Add value labels
        for i, (bar, imp) in enumerate(zip(bars, importances)):
            ax.text(bar.get_width() + 0.01, bar.get_y() + bar.get_height()/2,
                   f'{imp:.3f}', va='center', fontsize=10)
        
        plt.tight_layout()
        
        save_path = self.save_dir / save_name
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        print(f"Feature importance chart saved to: {save_path}")
    
    def plot_cluster_visualization(
        self,
        X_pca: np.ndarray,
        labels: np.ndarray,
        centers_pca: Optional[np.ndarray] = None,
        segment_names: Optional[Dict[int, str]] = None,
        title: str = "Customer Segments (PCA)",
        save_name: str = "cluster_visualization.png"
    ) -> None:
        """
        Plot customer segments in 2D PCA space.
        
        Args:
            X_pca: PCA-transformed features (n_samples, 2)
            labels: Cluster labels
            centers_pca: Cluster centers in PCA space (optional)
            segment_names: Mapping of cluster ID to segment name
            title: Plot title
            save_name: Filename to save
        """
        fig, ax = plt.subplots(figsize=(12, 10))
        
        unique_labels = np.unique(labels)
        colors = sns.color_palette("husl", len(unique_labels))
        
        for i, label in enumerate(unique_labels):
            mask = labels == label
            name = segment_names.get(label, f"Segment {label}") if segment_names else f"Segment {label}"
            
            ax.scatter(
                X_pca[mask, 0], X_pca[mask, 1],
                c=[colors[i]], label=name,
                alpha=0.6, s=50, edgecolors='white', linewidths=0.5
            )
        
        # Plot cluster centers
        if centers_pca is not None:
            ax.scatter(
                centers_pca[:, 0], centers_pca[:, 1],
                c='black', marker='X', s=200, label='Cluster Centers',
                edgecolors='white', linewidths=2
            )
        
        ax.set_xlabel('Principal Component 1', fontsize=12)
        ax.set_ylabel('Principal Component 2', fontsize=12)
        ax.set_title(title, fontsize=14, fontweight='bold')
        ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
        
        plt.tight_layout()
        
        save_path = self.save_dir / save_name
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        print(f"Cluster visualization saved to: {save_path}")
    
    def plot_segment_distribution(
        self,
        segment_profiles: Dict[int, Dict],
        title: str = "Customer Segment Distribution",
        save_name: str = "segment_distribution.png"
    ) -> None:
        """
        Plot segment distribution pie chart.
        
        Args:
            segment_profiles: Dictionary of segment profiles
            title: Plot title
            save_name: Filename to save
        """
        labels = [p["name"] for p in segment_profiles.values()]
        sizes = [p["population"] * 100 for p in segment_profiles.values()]
        colors = sns.color_palette("husl", len(labels))
        
        fig, ax = plt.subplots(figsize=(10, 8))
        
        wedges, texts, autotexts = ax.pie(
            sizes, labels=labels, colors=colors,
            autopct='%1.1f%%', startangle=90,
            explode=[0.02] * len(sizes)
        )
        
        ax.set_title(title, fontsize=14, fontweight='bold')
        
        # Enhance text
        for text in texts:
            text.set_fontsize(10)
        for autotext in autotexts:
            autotext.set_fontsize(9)
            autotext.set_fontweight('bold')
        
        plt.tight_layout()
        
        save_path = self.save_dir / save_name
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        print(f"Segment distribution saved to: {save_path}")
    
    def plot_pricing_simulation(
        self,
        scenarios: Dict[str, Dict],
        title: str = "Dynamic Pricing Simulation",
        save_name: str = "pricing_simulation.png"
    ) -> None:
        """
        Plot pricing simulation results.
        
        Args:
            scenarios: Dictionary of scenario results
            title: Plot title
            save_name: Filename to save
        """
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
        
        # Extract data
        scenario_names = list(scenarios.keys())
        base_prices = [s["base_price"] for s in scenarios.values()]
        dynamic_prices = [s["dynamic_price"] for s in scenarios.values()]
        changes = [s["price_change_percent"] for s in scenarios.values()]
        
        x = np.arange(len(scenario_names))
        width = 0.35
        
        # Price comparison
        bars1 = ax1.bar(x - width/2, base_prices, width, label='Base Price', color='steelblue')
        bars2 = ax1.bar(x + width/2, dynamic_prices, width, label='Dynamic Price', color='coral')
        
        ax1.set_xlabel('Scenario', fontsize=12)
        ax1.set_ylabel('Price (₹)', fontsize=12)
        ax1.set_title('Base vs Dynamic Pricing', fontsize=12, fontweight='bold')
        ax1.set_xticks(x)
        ax1.set_xticklabels(scenario_names, rotation=45, ha='right')
        ax1.legend()
        
        # Price change percentage
        colors = ['green' if c >= 0 else 'red' for c in changes]
        bars3 = ax2.bar(scenario_names, changes, color=colors)
        
        ax2.axhline(y=0, color='black', linestyle='-', linewidth=0.5)
        ax2.set_xlabel('Scenario', fontsize=12)
        ax2.set_ylabel('Price Change (%)', fontsize=12)
        ax2.set_title('Price Change by Scenario', fontsize=12, fontweight='bold')
        plt.setp(ax2.xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        # Add value labels
        for bar, val in zip(bars3, changes):
            height = bar.get_height()
            ax2.text(bar.get_x() + bar.get_width()/2., height,
                    f'{val:.1f}%', ha='center', va='bottom' if height >= 0 else 'top',
                    fontsize=9)
        
        fig.suptitle(title, fontsize=14, fontweight='bold')
        plt.tight_layout()
        
        save_path = self.save_dir / save_name
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        print(f"Pricing simulation saved to: {save_path}")
    
    def plot_metrics_comparison(
        self,
        metrics: Dict[str, float],
        targets: Dict[str, float],
        title: str = "Model Performance vs Targets",
        save_name: str = "metrics_comparison.png"
    ) -> None:
        """
        Plot actual metrics compared to targets.
        
        Args:
            metrics: Actual metric values
            targets: Target values
            title: Plot title
            save_name: Filename to save
        """
        # Get common metrics
        common_keys = [k for k in metrics.keys() if k in targets]
        
        x = np.arange(len(common_keys))
        width = 0.35
        
        actual_values = [metrics[k] for k in common_keys]
        target_values = [targets[k] for k in common_keys]
        
        fig, ax = plt.subplots(figsize=(12, 6))
        
        bars1 = ax.bar(x - width/2, target_values, width, label='Target', color='lightblue', edgecolor='blue')
        bars2 = ax.bar(x + width/2, actual_values, width, label='Actual', color='coral', edgecolor='red')
        
        ax.set_xlabel('Metric', fontsize=12)
        ax.set_ylabel('Value', fontsize=12)
        ax.set_title(title, fontsize=14, fontweight='bold')
        ax.set_xticks(x)
        ax.set_xticklabels([k.replace('_', ' ').title() for k in common_keys])
        ax.legend()
        ax.set_ylim([0, 1.1])
        
        # Add value labels
        for bar, val in zip(bars1, target_values):
            ax.text(bar.get_x() + bar.get_width()/2., bar.get_height() + 0.02,
                   f'{val:.2f}', ha='center', va='bottom', fontsize=9)
        for bar, val in zip(bars2, actual_values):
            ax.text(bar.get_x() + bar.get_width()/2., bar.get_height() + 0.02,
                   f'{val:.2f}', ha='center', va='bottom', fontsize=9, fontweight='bold')
        
        plt.tight_layout()
        
        save_path = self.save_dir / save_name
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        print(f"Metrics comparison saved to: {save_path}")
    
    def plot_churn_rate_by_segment(
        self,
        segment_profiles: Dict[int, Dict],
        title: str = "Churn Rate by Customer Segment",
        save_name: str = "churn_by_segment.png"
    ) -> None:
        """
        Plot churn rate comparison across segments.
        """
        segments = []
        churn_rates = []
        
        for seg_id, profile in segment_profiles.items():
            segments.append(profile["name"])
            churn_rate = profile["characteristics"].get("churn_rate", 0)
            if churn_rate is not None:
                churn_rates.append(churn_rate * 100)
            else:
                churn_rates.append(0)
        
        fig, ax = plt.subplots(figsize=(12, 6))
        
        colors = sns.color_palette("RdYlGn_r", len(segments))
        bars = ax.bar(segments, churn_rates, color=colors)
        
        ax.axhline(y=25, color='red', linestyle='--', label='Baseline (25%)')
        
        ax.set_xlabel('Customer Segment', fontsize=12)
        ax.set_ylabel('Churn Rate (%)', fontsize=12)
        ax.set_title(title, fontsize=14, fontweight='bold')
        ax.legend()
        
        # Rotate labels
        plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        # Add value labels
        for bar, val in zip(bars, churn_rates):
            ax.text(bar.get_x() + bar.get_width()/2., bar.get_height() + 0.5,
                   f'{val:.1f}%', ha='center', va='bottom', fontsize=10)
        
        plt.tight_layout()
        
        save_path = self.save_dir / save_name
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        print(f"Churn by segment saved to: {save_path}")
    
    def generate_all_visualizations(
        self,
        churn_model: Any,
        segmentation_model: Any,
        pricing_engine: Any,
        X_test: np.ndarray,
        y_test: np.ndarray,
        X_pca: np.ndarray,
        labels: np.ndarray
    ) -> List[str]:
        """
        Generate all visualizations for the models.
        
        Returns:
            List of saved file paths
        """
        saved_files = []
        
        print("\n" + "="*60)
        print("GENERATING VISUALIZATIONS")
        print("="*60)
        
        # 1. ROC Curve
        if churn_model.is_fitted:
            y_proba = churn_model.predict_proba(X_test)
            y_pred = churn_model.predict(X_test)
            
            self.plot_roc_curve(y_test, y_proba)
            saved_files.append("roc_curve.png")
            
            # 2. Confusion Matrix
            self.plot_confusion_matrix(y_test, y_pred)
            saved_files.append("confusion_matrix.png")
            
            # 3. Feature Importance
            self.plot_feature_importance(churn_model.get_feature_importances())
            saved_files.append("feature_importance.png")
            
            # 4. Metrics Comparison
            from config import CHURN_MODEL_CONFIG
            self.plot_metrics_comparison(
                churn_model.metrics,
                CHURN_MODEL_CONFIG["target_metrics"]
            )
            saved_files.append("metrics_comparison.png")
        
        # 5. Cluster Visualization
        if segmentation_model.is_fitted:
            segment_names = {k: v["name"] for k, v in segmentation_model.segment_profiles.items()}
            centers_pca = segmentation_model.get_cluster_centers_pca()
            
            self.plot_cluster_visualization(
                X_pca, labels, centers_pca, segment_names
            )
            saved_files.append("cluster_visualization.png")
            
            # 6. Segment Distribution
            self.plot_segment_distribution(segmentation_model.segment_profiles)
            saved_files.append("segment_distribution.png")
            
            # 7. Churn by Segment
            self.plot_churn_rate_by_segment(segmentation_model.segment_profiles)
            saved_files.append("churn_by_segment.png")
        
        # 8. Pricing Simulation
        sample_features = {
            "avg_monthly_usage_gb": 200,
            "plan_price": 999,
            "total_revenue": 15000,
            "contract_age_months": 12,
            "nps_score": 6,
            "support_tickets": 2,
            "session_count_30d": 30,
            "usage_change_30d": -5,
            "days_since_login": 3,
            "payment_failures_90d": 0
        }
        scenarios = pricing_engine.simulate_pricing_scenarios(999, sample_features)
        self.plot_pricing_simulation(scenarios)
        saved_files.append("pricing_simulation.png")
        
        print(f"\n✅ Generated {len(saved_files)} visualizations")
        return saved_files

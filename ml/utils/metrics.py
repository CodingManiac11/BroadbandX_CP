"""
BroadbandX ML Service - Model Metrics
Utility functions for calculating and reporting model performance metrics.
"""
import numpy as np
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report,
    mean_squared_error, mean_absolute_error, r2_score,
    silhouette_score, calinski_harabasz_score
)
from typing import Dict, Any, List, Optional
import json
from pathlib import Path


class ModelMetrics:
    """
    Utility class for model performance metrics.
    """
    
    @staticmethod
    def classification_metrics(
        y_true: np.ndarray,
        y_pred: np.ndarray,
        y_proba: Optional[np.ndarray] = None
    ) -> Dict[str, float]:
        """
        Calculate classification metrics.
        
        Args:
            y_true: True labels
            y_pred: Predicted labels
            y_proba: Prediction probabilities (optional)
            
        Returns:
            Dictionary of metrics
        """
        metrics = {
            "accuracy": float(accuracy_score(y_true, y_pred)),
            "precision": float(precision_score(y_true, y_pred, zero_division=0)),
            "recall": float(recall_score(y_true, y_pred, zero_division=0)),
            "f1_score": float(f1_score(y_true, y_pred, zero_division=0))
        }
        
        if y_proba is not None:
            metrics["auc_roc"] = float(roc_auc_score(y_true, y_proba))
        
        return metrics
    
    @staticmethod
    def confusion_matrix_dict(
        y_true: np.ndarray,
        y_pred: np.ndarray
    ) -> Dict[str, int]:
        """
        Get confusion matrix as dictionary.
        
        Args:
            y_true: True labels
            y_pred: Predicted labels
            
        Returns:
            Dictionary with TN, FP, FN, TP
        """
        cm = confusion_matrix(y_true, y_pred)
        
        if cm.shape == (2, 2):
            return {
                "true_negative": int(cm[0, 0]),
                "false_positive": int(cm[0, 1]),
                "false_negative": int(cm[1, 0]),
                "true_positive": int(cm[1, 1])
            }
        else:
            return {"confusion_matrix": cm.tolist()}
    
    @staticmethod
    def regression_metrics(
        y_true: np.ndarray,
        y_pred: np.ndarray
    ) -> Dict[str, float]:
        """
        Calculate regression metrics.
        
        Args:
            y_true: True values
            y_pred: Predicted values
            
        Returns:
            Dictionary of metrics
        """
        return {
            "mse": float(mean_squared_error(y_true, y_pred)),
            "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
            "mae": float(mean_absolute_error(y_true, y_pred)),
            "r2": float(r2_score(y_true, y_pred))
        }
    
    @staticmethod
    def clustering_metrics(
        X: np.ndarray,
        labels: np.ndarray
    ) -> Dict[str, float]:
        """
        Calculate clustering metrics.
        
        Args:
            X: Feature matrix
            labels: Cluster labels
            
        Returns:
            Dictionary of metrics
        """
        n_clusters = len(np.unique(labels))
        
        metrics = {
            "n_clusters": n_clusters
        }
        
        if n_clusters > 1:
            metrics["silhouette_score"] = float(silhouette_score(X, labels))
            metrics["calinski_harabasz_score"] = float(calinski_harabasz_score(X, labels))
        
        return metrics
    
    @staticmethod
    def compare_to_targets(
        metrics: Dict[str, float],
        targets: Dict[str, float],
        tolerance: float = 0.05
    ) -> Dict[str, Dict[str, Any]]:
        """
        Compare metrics to target values.
        
        Args:
            metrics: Calculated metrics
            targets: Target values
            tolerance: Allowed tolerance (default 5%)
            
        Returns:
            Comparison results
        """
        results = {}
        
        for metric_name, target in targets.items():
            if metric_name in metrics:
                actual = metrics[metric_name]
                diff = actual - target
                pct_diff = (diff / target) * 100 if target != 0 else 0
                achieved = actual >= target * (1 - tolerance)
                
                results[metric_name] = {
                    "target": target,
                    "actual": round(actual, 4),
                    "difference": round(diff, 4),
                    "percent_diff": round(pct_diff, 2),
                    "achieved": achieved,
                    "status": "✅" if achieved else "⚠️"
                }
        
        return results
    
    @staticmethod
    def save_metrics(
        metrics: Dict[str, Any],
        filepath: Path,
        model_name: str = "model"
    ) -> None:
        """
        Save metrics to JSON file.
        
        Args:
            metrics: Metrics dictionary
            filepath: Path to save file
            model_name: Name of the model
        """
        from datetime import datetime
        
        output = {
            "model_name": model_name,
            "timestamp": datetime.now().isoformat(),
            "metrics": metrics
        }
        
        with open(filepath, "w") as f:
            json.dump(output, f, indent=2, default=str)
        
        print(f"Metrics saved to: {filepath}")
    
    @staticmethod
    def format_metrics_report(
        metrics: Dict[str, float],
        title: str = "Model Metrics"
    ) -> str:
        """
        Format metrics as a readable report.
        
        Args:
            metrics: Metrics dictionary
            title: Report title
            
        Returns:
            Formatted string report
        """
        lines = [
            "=" * 50,
            f" {title}",
            "=" * 50,
            ""
        ]
        
        for name, value in metrics.items():
            if isinstance(value, float):
                lines.append(f"  {name}: {value:.4f}")
            else:
                lines.append(f"  {name}: {value}")
        
        lines.append("")
        lines.append("=" * 50)
        
        return "\n".join(lines)

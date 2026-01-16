"""
BroadbandX ML Service - Churn Prediction Model
XGBoost-based classifier for customer churn prediction.
"""
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report,
    roc_curve, precision_recall_curve
)
from sklearn.model_selection import cross_val_score, StratifiedKFold
from imblearn.over_sampling import SMOTE
from typing import Dict, Tuple, Optional, List, Any
import joblib
import json
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import CHURN_MODEL_CONFIG, MODELS_DIR, REPORTS_DIR, FEATURE_CONFIG


class ChurnPredictor:
    """
    XGBoost-based churn prediction model.
    
    Targets from research paper:
    - Accuracy: 89%
    - Precision: 86%
    - Recall: 83%
    - F1-Score: 84%
    - AUC-ROC: 0.91
    """
    
    def __init__(self):
        """Initialize the churn predictor."""
        self.model = XGBClassifier(**CHURN_MODEL_CONFIG["model_params"])
        self.is_fitted = False
        self.feature_names: List[str] = []
        self.feature_importances: Dict[str, float] = {}
        self.metrics: Dict[str, float] = {}
        self.cv_scores: Dict[str, List[float]] = {}
    
    def apply_smote(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        random_state: int = 42
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Apply SMOTE to handle class imbalance.
        
        Args:
            X_train: Training features
            y_train: Training labels
            random_state: Random seed
            
        Returns:
            Resampled (X_train, y_train)
        """
        original_ratio = y_train.mean()
        
        smote = SMOTE(random_state=random_state, sampling_strategy=0.5)
        X_resampled, y_resampled = smote.fit_resample(X_train, y_train)
        
        new_ratio = y_resampled.mean()
        print(f"SMOTE applied: {original_ratio:.2%} -> {new_ratio:.2%} positive class")
        print(f"Training samples: {len(X_train)} -> {len(X_resampled)}")
        
        return X_resampled, y_resampled
    
    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        feature_names: Optional[List[str]] = None,
        use_smote: bool = True,
        eval_set: Optional[Tuple[np.ndarray, np.ndarray]] = None
    ) -> None:
        """
        Train the churn prediction model.
        
        Args:
            X_train: Training features
            y_train: Training labels
            feature_names: List of feature names
            use_smote: Whether to apply SMOTE for class balancing
            eval_set: Optional (X_val, y_val) for early stopping
        """
        print("\n" + "="*60)
        print("TRAINING CHURN PREDICTION MODEL")
        print("="*60)
        
        # Store feature names
        if feature_names:
            self.feature_names = feature_names
        else:
            self.feature_names = FEATURE_CONFIG["churn_features"]
        
        # Apply SMOTE if requested
        if use_smote:
            X_train, y_train = self.apply_smote(X_train, y_train)
        
        # Train model
        print("\nTraining XGBoost classifier...")
        
        if eval_set:
            self.model.fit(
                X_train, y_train,
                eval_set=[eval_set],
                verbose=False
            )
        else:
            self.model.fit(X_train, y_train)
        
        self.is_fitted = True
        
        # Extract feature importances
        self._extract_feature_importances()
        
        print("Model training complete!")
    
    def _extract_feature_importances(self) -> None:
        """Extract and store feature importances."""
        importances = self.model.feature_importances_
        
        # Match with feature names
        for i, name in enumerate(self.feature_names):
            if i < len(importances):
                self.feature_importances[name] = float(importances[i])
        
        # Sort by importance
        self.feature_importances = dict(
            sorted(self.feature_importances.items(), key=lambda x: x[1], reverse=True)
        )
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Predict churn labels.
        
        Args:
            X: Feature matrix
            
        Returns:
            Binary predictions (0/1)
        """
        if not self.is_fitted:
            raise ValueError("Model not fitted. Call train() first.")
        
        return self.model.predict(X)
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """
        Predict churn probabilities.
        
        Args:
            X: Feature matrix
            
        Returns:
            Probability array (probability of churn)
        """
        if not self.is_fitted:
            raise ValueError("Model not fitted. Call train() first.")
        
        probas = self.model.predict_proba(X)
        return probas[:, 1]  # Return probability of positive class (churn)
    
    def evaluate(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray
    ) -> Dict[str, float]:
        """
        Evaluate model performance on test set.
        
        Args:
            X_test: Test features
            y_test: Test labels
            
        Returns:
            Dictionary of metrics
        """
        print("\n" + "-"*60)
        print("MODEL EVALUATION")
        print("-"*60)
        
        # Predictions
        y_pred = self.predict(X_test)
        y_proba = self.predict_proba(X_test)
        
        # Calculate metrics
        self.metrics = {
            "accuracy": accuracy_score(y_test, y_pred),
            "precision": precision_score(y_test, y_pred),
            "recall": recall_score(y_test, y_pred),
            "f1_score": f1_score(y_test, y_pred),
            "auc_roc": roc_auc_score(y_test, y_proba)
        }
        
        # Print metrics
        print("\nPerformance Metrics:")
        print(f"  Accuracy:  {self.metrics['accuracy']:.4f} (target: {CHURN_MODEL_CONFIG['target_metrics']['accuracy']})")
        print(f"  Precision: {self.metrics['precision']:.4f} (target: {CHURN_MODEL_CONFIG['target_metrics']['precision']})")
        print(f"  Recall:    {self.metrics['recall']:.4f} (target: {CHURN_MODEL_CONFIG['target_metrics']['recall']})")
        print(f"  F1-Score:  {self.metrics['f1_score']:.4f} (target: {CHURN_MODEL_CONFIG['target_metrics']['f1_score']})")
        print(f"  AUC-ROC:   {self.metrics['auc_roc']:.4f} (target: {CHURN_MODEL_CONFIG['target_metrics']['auc_roc']})")
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        print(f"\nConfusion Matrix:")
        print(f"  TN: {cm[0,0]:5d}  FP: {cm[0,1]:5d}")
        print(f"  FN: {cm[1,0]:5d}  TP: {cm[1,1]:5d}")
        
        # Classification report
        print(f"\nClassification Report:")
        print(classification_report(y_test, y_pred, target_names=["Not Churned", "Churned"]))
        
        # Check if targets are met
        print("\nTarget Achievement:")
        for metric, value in self.metrics.items():
            target = CHURN_MODEL_CONFIG["target_metrics"].get(metric, 0)
            status = "✅" if value >= target * 0.95 else "⚠️"  # Allow 5% tolerance
            print(f"  {status} {metric}: {value:.4f} vs target {target}")
        
        return self.metrics
    
    def cross_validate(
        self,
        X: np.ndarray,
        y: np.ndarray,
        cv: int = 5
    ) -> Dict[str, Any]:
        """
        Perform cross-validation.
        
        Args:
            X: Feature matrix
            y: Labels
            cv: Number of folds
            
        Returns:
            Cross-validation results
        """
        print(f"\nPerforming {cv}-fold cross-validation...")
        
        skf = StratifiedKFold(n_splits=cv, shuffle=True, random_state=42)
        
        # Metrics to evaluate
        scoring = ["accuracy", "precision", "recall", "f1", "roc_auc"]
        
        results = {}
        for score_name in scoring:
            scores = cross_val_score(
                self.model, X, y,
                cv=skf,
                scoring=score_name
            )
            results[score_name] = {
                "mean": float(scores.mean()),
                "std": float(scores.std()),
                "scores": scores.tolist()
            }
            print(f"  {score_name}: {scores.mean():.4f} (+/- {scores.std()*2:.4f})")
        
        self.cv_scores = results
        return results
    
    def get_feature_importances(self) -> Dict[str, float]:
        """Get feature importances sorted by value."""
        return self.feature_importances
    
    def get_top_features(self, n: int = 10) -> List[Tuple[str, float]]:
        """Get top N most important features."""
        items = list(self.feature_importances.items())
        return items[:n]
    
    def get_roc_curve_data(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray
    ) -> Dict[str, List[float]]:
        """
        Get ROC curve data for plotting.
        
        Args:
            X_test: Test features
            y_test: Test labels
            
        Returns:
            Dictionary with fpr, tpr, thresholds
        """
        y_proba = self.predict_proba(X_test)
        fpr, tpr, thresholds = roc_curve(y_test, y_proba)
        
        return {
            "fpr": fpr.tolist(),
            "tpr": tpr.tolist(),
            "thresholds": thresholds.tolist()
        }
    
    def get_precision_recall_curve_data(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray
    ) -> Dict[str, List[float]]:
        """
        Get precision-recall curve data for plotting.
        
        Args:
            X_test: Test features
            y_test: Test labels
            
        Returns:
            Dictionary with precision, recall, thresholds
        """
        y_proba = self.predict_proba(X_test)
        precision, recall, thresholds = precision_recall_curve(y_test, y_proba)
        
        return {
            "precision": precision.tolist(),
            "recall": recall.tolist(),
            "thresholds": thresholds.tolist()
        }
    
    def save(self, filepath: Optional[Path] = None) -> None:
        """
        Save the trained model and metadata.
        
        Args:
            filepath: Path to save model. Uses default if None.
        """
        if not self.is_fitted:
            raise ValueError("Model not fitted. Cannot save.")
        
        if filepath is None:
            filepath = MODELS_DIR / "churn_model.joblib"
        
        model_data = {
            "model": self.model,
            "feature_names": self.feature_names,
            "feature_importances": self.feature_importances,
            "metrics": self.metrics,
            "cv_scores": self.cv_scores,
            "config": CHURN_MODEL_CONFIG
        }
        
        joblib.dump(model_data, filepath)
        print(f"Model saved to: {filepath}")
        
        # Also save metrics as JSON for easy reading
        metrics_path = REPORTS_DIR / "churn_model_metrics.json"
        with open(metrics_path, "w") as f:
            json.dump({
                "metrics": self.metrics,
                "feature_importances": self.feature_importances,
                "cv_scores": self.cv_scores
            }, f, indent=2)
        print(f"Metrics saved to: {metrics_path}")
    
    def load(self, filepath: Optional[Path] = None) -> None:
        """
        Load a trained model.
        
        Args:
            filepath: Path to model file. Uses default if None.
        """
        if filepath is None:
            filepath = MODELS_DIR / "churn_model.joblib"
        
        if not Path(filepath).exists():
            raise FileNotFoundError(f"Model file not found: {filepath}")
        
        model_data = joblib.load(filepath)
        
        self.model = model_data["model"]
        self.feature_names = model_data["feature_names"]
        self.feature_importances = model_data["feature_importances"]
        self.metrics = model_data["metrics"]
        self.cv_scores = model_data.get("cv_scores", {})
        self.is_fitted = True
        
        print(f"Model loaded from: {filepath}")
    
    def predict_single(self, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Predict churn for a single customer.
        
        Args:
            features: Dictionary of feature name -> value
            
        Returns:
            Prediction result with probability and risk level
        """
        if not self.is_fitted:
            raise ValueError("Model not fitted. Call train() or load() first.")
        
        # Build feature vector in correct order
        X = np.array([[features.get(f, 0) for f in self.feature_names]])
        
        # Predict
        probability = float(self.predict_proba(X)[0])
        prediction = int(probability >= 0.5)
        
        # Determine risk level
        if probability < 0.3:
            risk_level = "low"
        elif probability < 0.6:
            risk_level = "medium"
        else:
            risk_level = "high"
        
        return {
            "churn_probability": round(probability, 4),
            "churn_prediction": prediction,
            "risk_level": risk_level,
            "recommendation": self._get_recommendation(probability, features)
        }
    
    def _get_recommendation(
        self,
        probability: float,
        features: Dict[str, float]
    ) -> str:
        """Generate retention recommendation based on probability and features."""
        if probability < 0.3:
            return "Customer is stable. Continue standard engagement."
        
        # Identify top risk factors
        risk_factors = []
        
        if features.get("usage_change_30d", 0) < -10:
            risk_factors.append("declining usage")
        if features.get("days_since_login", 0) > 14:
            risk_factors.append("low engagement")
        if features.get("payment_failures_90d", 0) > 0:
            risk_factors.append("payment issues")
        if features.get("support_tickets", 0) > 3:
            risk_factors.append("frequent support requests")
        if features.get("nps_score", 5) < 5:
            risk_factors.append("low satisfaction")
        
        if probability >= 0.6:
            action = "URGENT: Immediate intervention required"
        else:
            action = "Consider proactive outreach"
        
        if risk_factors:
            return f"{action}. Key risk factors: {', '.join(risk_factors)}."
        else:
            return f"{action}. Monitor customer engagement closely."

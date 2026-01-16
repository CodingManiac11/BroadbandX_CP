"""
BroadbandX ML Service - Churn Model Training Script
Complete training pipeline for the churn prediction model.
"""
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from data.generator import DataGenerator
from data.preprocessor import DataPreprocessor
from data.feature_engineering import FeatureEngineer
from models.churn_model import ChurnPredictor
from utils.visualization import Visualizer
from config import DATA_CONFIG, FEATURE_CONFIG, CHURN_MODEL_CONFIG, SYNTHETIC_DATA_PATH


def train_churn_model():
    """
    Complete training pipeline for churn prediction model.
    """
    print("\n" + "="*70)
    print(" CHURN PREDICTION MODEL - TRAINING PIPELINE")
    print("="*70)
    
    # Step 1: Generate or load data
    print("\n[STEP 1] Loading/Generating Data")
    print("-" * 50)
    
    if not SYNTHETIC_DATA_PATH.exists():
        print("Synthetic data not found. Generating...")
        generator = DataGenerator(
            n_samples=DATA_CONFIG["n_samples"],
            random_seed=DATA_CONFIG["random_seed"]
        )
        df = generator.generate(save=True)
    else:
        print(f"Loading existing data from: {SYNTHETIC_DATA_PATH}")
        preprocessor = DataPreprocessor()
        df = preprocessor.load_data()
    
    print(f"Total records: {len(df)}")
    print(f"Churn rate: {df['churned'].mean()*100:.1f}%")
    
    # Step 2: Feature Engineering
    print("\n[STEP 2] Feature Engineering")
    print("-" * 50)
    
    feature_engineer = FeatureEngineer()
    df = feature_engineer.engineer_all_features(df)
    
    # Step 3: Data Preprocessing
    print("\n[STEP 3] Data Preprocessing")
    print("-" * 50)
    
    preprocessor = DataPreprocessor()
    
    # Validate data
    preprocessor.validate_data(df)
    
    # Handle missing values
    df = preprocessor.handle_missing_values(df)
    
    # Prepare features
    feature_list = FEATURE_CONFIG["churn_features"]
    X = preprocessor.prepare_features(df, feature_list, fit_scaler=True)
    y = preprocessor.prepare_target(df)
    
    # Split data
    X_train, X_test, y_train, y_test = preprocessor.split_data(
        X, y,
        test_size=CHURN_MODEL_CONFIG["test_size"]
    )
    
    # Save scaler
    preprocessor.save_scaler()
    
    # Step 4: Model Training
    print("\n[STEP 4] Model Training")
    print("-" * 50)
    
    model = ChurnPredictor()
    model.train(
        X_train, y_train,
        feature_names=feature_list,
        use_smote=True,
        eval_set=(X_test, y_test)
    )
    
    # Step 5: Model Evaluation
    print("\n[STEP 5] Model Evaluation")
    print("-" * 50)
    
    metrics = model.evaluate(X_test, y_test)
    
    # Step 6: Cross-Validation
    print("\n[STEP 6] Cross-Validation")
    print("-" * 50)
    
    cv_results = model.cross_validate(X, y, cv=CHURN_MODEL_CONFIG["cv_folds"])
    
    # Step 7: Feature Importance
    print("\n[STEP 7] Feature Importance")
    print("-" * 50)
    
    print("\nTop 10 Features:")
    for i, (feature, importance) in enumerate(model.get_top_features(10), 1):
        print(f"  {i}. {feature}: {importance:.4f}")
    
    # Step 8: Save Model
    print("\n[STEP 8] Save Model")
    print("-" * 50)
    
    model.save()
    
    # Step 9: Generate Visualizations
    print("\n[STEP 9] Generate Visualizations")
    print("-" * 50)
    
    visualizer = Visualizer()
    
    # Get predictions for visualization
    y_proba = model.predict_proba(X_test)
    y_pred = model.predict(X_test)
    
    visualizer.plot_roc_curve(y_test, y_proba)
    visualizer.plot_confusion_matrix(y_test, y_pred)
    visualizer.plot_feature_importance(model.get_feature_importances())
    visualizer.plot_metrics_comparison(metrics, CHURN_MODEL_CONFIG["target_metrics"])
    
    # Step 10: Summary
    print("\n" + "="*70)
    print(" TRAINING COMPLETE")
    print("="*70)
    
    print("\n📊 Model Performance Summary:")
    print(f"  • Accuracy:  {metrics['accuracy']:.4f}")
    print(f"  • Precision: {metrics['precision']:.4f}")
    print(f"  • Recall:    {metrics['recall']:.4f}")
    print(f"  • F1-Score:  {metrics['f1_score']:.4f}")
    print(f"  • AUC-ROC:   {metrics['auc_roc']:.4f}")
    
    # Check targets
    targets_met = sum(
        1 for k, v in metrics.items()
        if k in CHURN_MODEL_CONFIG["target_metrics"]
        and v >= CHURN_MODEL_CONFIG["target_metrics"][k] * 0.95
    )
    total_targets = len(CHURN_MODEL_CONFIG["target_metrics"])
    
    print(f"\n🎯 Targets Met: {targets_met}/{total_targets}")
    
    print("\n📁 Saved Artifacts:")
    print("  • Model: ml/artifacts/models/churn_model.joblib")
    print("  • Scaler: ml/artifacts/models/feature_scaler.joblib")
    print("  • Metrics: ml/artifacts/reports/churn_model_metrics.json")
    print("  • Visualizations: ml/artifacts/visualizations/")
    
    return model, metrics


if __name__ == "__main__":
    model, metrics = train_churn_model()

"""
BroadbandX ML Service - Master Training Script
Train all models in sequence with comprehensive output.
"""
import sys
from pathlib import Path
import json
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from training.train_churn import train_churn_model
from training.train_segmentation import train_segmentation_model
from training.train_pricing import train_pricing_model
from config import REPORTS_DIR


def train_all():
    """
    Train all ML models in sequence.
    
    Order:
    1. Churn Prediction Model (XGBoost)
    2. Customer Segmentation Model (K-Means)
    3. Dynamic Pricing Engine
    
    Each model saves its artifacts to ml/artifacts/
    """
    print("\n" + "="*80)
    print(" BROADBANDX ML PIPELINE - COMPLETE TRAINING")
    print("="*80)
    print(f"\nStarted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = {
        "started_at": datetime.now().isoformat(),
        "models": {}
    }
    
    # Step 1: Train Churn Model
    print("\n" + "="*80)
    print(" PHASE 1: CHURN PREDICTION MODEL")
    print("="*80)
    
    try:
        churn_model, churn_metrics = train_churn_model()
        results["models"]["churn"] = {
            "status": "success",
            "metrics": churn_metrics
        }
        print("\n✅ Churn model training COMPLETE")
    except Exception as e:
        print(f"\n❌ Churn model training FAILED: {e}")
        results["models"]["churn"] = {
            "status": "failed",
            "error": str(e)
        }
    
    # Step 2: Train Segmentation Model
    print("\n" + "="*80)
    print(" PHASE 2: CUSTOMER SEGMENTATION MODEL")
    print("="*80)
    
    try:
        segmentation_model, labels = train_segmentation_model()
        results["models"]["segmentation"] = {
            "status": "success",
            "metrics": segmentation_model.metrics,
            "n_segments": segmentation_model.n_clusters
        }
        print("\n✅ Segmentation model training COMPLETE")
    except Exception as e:
        print(f"\n❌ Segmentation model training FAILED: {e}")
        results["models"]["segmentation"] = {
            "status": "failed",
            "error": str(e)
        }
    
    # Step 3: Train Pricing Engine
    print("\n" + "="*80)
    print(" PHASE 3: DYNAMIC PRICING ENGINE")
    print("="*80)
    
    try:
        pricing_engine = train_pricing_model()
        results["models"]["pricing"] = {
            "status": "success",
            "weights": pricing_engine.weights
        }
        print("\n✅ Pricing engine training COMPLETE")
    except Exception as e:
        print(f"\n❌ Pricing engine training FAILED: {e}")
        results["models"]["pricing"] = {
            "status": "failed",
            "error": str(e)
        }
    
    # Save overall results
    results["completed_at"] = datetime.now().isoformat()
    results["duration_seconds"] = (
        datetime.fromisoformat(results["completed_at"]) - 
        datetime.fromisoformat(results["started_at"])
    ).total_seconds()
    
    results_path = REPORTS_DIR / "training_results.json"
    with open(results_path, "w") as f:
        json.dump(results, f, indent=2, default=str)
    
    # Final Summary
    print("\n" + "="*80)
    print(" TRAINING COMPLETE - SUMMARY")
    print("="*80)
    
    successful = sum(1 for m in results["models"].values() if m["status"] == "success")
    total = len(results["models"])
    
    print(f"\n📊 Models Trained: {successful}/{total}")
    
    for model_name, model_result in results["models"].items():
        status = "✅" if model_result["status"] == "success" else "❌"
        print(f"  {status} {model_name.upper()}: {model_result['status']}")
    
    print(f"\n⏱️  Duration: {results['duration_seconds']:.1f} seconds")
    
    print("\n📁 Artifacts saved to:")
    print("  • Models: ml/artifacts/models/")
    print("  • Reports: ml/artifacts/reports/")
    print("  • Visualizations: ml/artifacts/visualizations/")
    
    print("\n🚀 Next steps:")
    print("  1. Start the ML API: python -m api.main")
    print("  2. Access docs at: http://localhost:8000/docs")
    print("  3. Integrate with Node.js backend")
    
    print("\n" + "="*80)
    
    return results


if __name__ == "__main__":
    results = train_all()

"""
BroadbandX ML Service - Segmentation Model Training Script
Complete training pipeline for the customer segmentation model.
"""
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from data.generator import DataGenerator
from data.preprocessor import DataPreprocessor
from models.segmentation_model import CustomerSegmentation
from utils.visualization import Visualizer
from config import DATA_CONFIG, FEATURE_CONFIG, SEGMENTATION_CONFIG, SYNTHETIC_DATA_PATH


def train_segmentation_model():
    """
    Complete training pipeline for customer segmentation model.
    """
    print("\n" + "="*70)
    print(" CUSTOMER SEGMENTATION MODEL - TRAINING PIPELINE")
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
    
    # Step 2: Prepare Features for Clustering
    print("\n[STEP 2] Preparing Features")
    print("-" * 50)
    
    segmentation = CustomerSegmentation(n_clusters=SEGMENTATION_CONFIG["n_clusters"])
    
    feature_list = FEATURE_CONFIG["segmentation_features"]
    print(f"Using {len(feature_list)} features for segmentation:")
    for f in feature_list:
        print(f"  • {f}")
    
    X_scaled = segmentation.prepare_features(df, feature_list, fit=True)
    print(f"\nFeature matrix shape: {X_scaled.shape}")
    
    # Step 3: Find Optimal Clusters (optional validation)
    print("\n[STEP 3] Optimal Cluster Analysis")
    print("-" * 50)
    
    cluster_analysis = segmentation.find_optimal_clusters(X_scaled, min_k=2, max_k=8)
    
    print("\nCluster Analysis:")
    print(f"{'K':>3} | {'Inertia':>12} | {'Silhouette':>10}")
    print("-" * 30)
    for i, k in enumerate(cluster_analysis["k_values"]):
        print(f"{k:>3} | {cluster_analysis['inertias'][i]:>12.2f} | {cluster_analysis['silhouettes'][i]:>10.4f}")
    
    # Step 4: Train Model
    print("\n[STEP 4] Model Training")
    print("-" * 50)
    
    labels = segmentation.train(X_scaled, df)
    
    # Step 5: Analyze Results
    print("\n[STEP 5] Segment Analysis")
    print("-" * 50)
    
    # Segment distribution
    print("\nSegment Distribution:")
    for seg_id, profile in segmentation.segment_profiles.items():
        print(f"\n  Segment {seg_id}: {profile['name']}")
        print(f"    Population: {profile['population']*100:.1f}%")
        print(f"    Price Elasticity: {profile['price_elasticity']}")
        print(f"    Avg Plan Price: ₹{profile['characteristics']['avg_plan_price']}")
        print(f"    Avg Monthly Usage: {profile['characteristics']['avg_monthly_usage_gb']} GB")
        print(f"    Avg NPS: {profile['characteristics']['avg_nps_score']}")
        if profile['characteristics']['churn_rate'] is not None:
            print(f"    Churn Rate: {profile['characteristics']['churn_rate']*100:.1f}%")
    
    # Step 6: Save Model
    print("\n[STEP 6] Save Model")
    print("-" * 50)
    
    segmentation.save()
    
    # Step 7: Generate Visualizations
    print("\n[STEP 7] Generate Visualizations")
    print("-" * 50)
    
    visualizer = Visualizer()
    
    # Get PCA coordinates for visualization
    X_pca = segmentation.get_pca_coordinates(X_scaled)
    centers_pca = segmentation.get_cluster_centers_pca()
    segment_names = {k: v["name"] for k, v in segmentation.segment_profiles.items()}
    
    visualizer.plot_cluster_visualization(X_pca, labels, centers_pca, segment_names)
    visualizer.plot_segment_distribution(segmentation.segment_profiles)
    visualizer.plot_churn_rate_by_segment(segmentation.segment_profiles)
    
    # Step 8: Summary
    print("\n" + "="*70)
    print(" TRAINING COMPLETE")
    print("="*70)
    
    print("\n📊 Clustering Metrics:")
    print(f"  • Silhouette Score: {segmentation.metrics['silhouette_score']:.4f}")
    print(f"  • Calinski-Harabasz: {segmentation.metrics['calinski_harabasz_score']:.2f}")
    print(f"  • Davies-Bouldin: {segmentation.metrics['davies_bouldin_score']:.4f}")
    print(f"  • Inertia: {segmentation.metrics['inertia']:.2f}")
    
    print("\n🎯 Segments Identified:")
    for seg_id, profile in segmentation.segment_profiles.items():
        print(f"  {seg_id}. {profile['name']} ({profile['population']*100:.1f}%)")
    
    print("\n📁 Saved Artifacts:")
    print("  • Model: ml/artifacts/models/segmentation_model.joblib")
    print("  • Profiles: ml/artifacts/reports/segment_profiles.json")
    print("  • Visualizations: ml/artifacts/visualizations/")
    
    return segmentation, labels


if __name__ == "__main__":
    segmentation, labels = train_segmentation_model()

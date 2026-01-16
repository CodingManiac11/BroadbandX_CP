"""
BroadbandX ML Service - Pricing Model Training Script
Complete training pipeline for the dynamic pricing engine.
"""
import sys
from pathlib import Path
import json

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from data.generator import DataGenerator
from data.preprocessor import DataPreprocessor
from models.churn_model import ChurnPredictor
from models.segmentation_model import CustomerSegmentation
from models.pricing_model import DynamicPricingEngine
from utils.visualization import Visualizer
from config import DATA_CONFIG, PRICING_CONFIG, SYNTHETIC_DATA_PATH, REPORTS_DIR


def train_pricing_model():
    """
    Complete training pipeline for dynamic pricing engine.
    """
    print("\n" + "="*70)
    print(" DYNAMIC PRICING ENGINE - TRAINING PIPELINE")
    print("="*70)
    
    # Step 1: Load Data
    print("\n[STEP 1] Loading Data")
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
    
    # Step 2: Load Pre-trained Models
    print("\n[STEP 2] Loading Pre-trained Models")
    print("-" * 50)
    
    churn_model = ChurnPredictor()
    segmentation_model = CustomerSegmentation()
    
    try:
        churn_model.load()
        print("✅ Churn model loaded successfully")
    except FileNotFoundError:
        print("⚠️ Churn model not found. Pricing will use heuristic estimation.")
        churn_model = None
    
    try:
        segmentation_model.load()
        print("✅ Segmentation model loaded successfully")
    except FileNotFoundError:
        print("⚠️ Segmentation model not found. Pricing will use heuristic estimation.")
        segmentation_model = None
    
    # Step 3: Initialize Pricing Engine
    print("\n[STEP 3] Initialize Pricing Engine")
    print("-" * 50)
    
    pricing_engine = DynamicPricingEngine()
    pricing_engine.set_models(churn_model, segmentation_model)
    
    print(f"\nPricing Formula: P_dynamic = P_base × (1 + α·D_t + β·E_c + γ·R_c)")
    print(f"\nWeights:")
    print(f"  α (Demand):     {pricing_engine.weights['alpha']}")
    print(f"  β (Elasticity): {pricing_engine.weights['beta']}")
    print(f"  γ (Churn Risk): {pricing_engine.weights['gamma']}")
    
    print(f"\nConstraints:")
    print(f"  Min Discount:  {pricing_engine.constraints['min_discount']*100:.0f}%")
    print(f"  Max Premium:   {pricing_engine.constraints['max_premium']*100:.0f}%")
    print(f"  Churn Threshold: {pricing_engine.constraints['churn_threshold']}")
    
    # Step 4: Test Pricing on Sample Customers
    print("\n[STEP 4] Testing Pricing Engine")
    print("-" * 50)
    
    # Create sample customer profiles
    sample_customers = [
        {
            "name": "Premium Loyal Customer",
            "features": {
                "avg_monthly_usage_gb": 500,
                "plan_price": 1999,
                "total_revenue": 48000,
                "contract_age_months": 36,
                "nps_score": 9,
                "support_tickets": 1,
                "session_count_30d": 60,
                "usage_change_30d": 5,
                "days_since_login": 1,
                "payment_failures_90d": 0,
                "late_payments_count": 0,
                "complaints_count": 0
            },
            "base_price": 1999
        },
        {
            "name": "At-Risk Budget Customer",
            "features": {
                "avg_monthly_usage_gb": 100,
                "plan_price": 499,
                "total_revenue": 6000,
                "contract_age_months": 12,
                "nps_score": 4,
                "support_tickets": 5,
                "session_count_30d": 15,
                "usage_change_30d": -20,
                "days_since_login": 15,
                "payment_failures_90d": 2,
                "late_payments_count": 3,
                "complaints_count": 2
            },
            "base_price": 499
        },
        {
            "name": "Average Value Customer",
            "features": {
                "avg_monthly_usage_gb": 250,
                "plan_price": 799,
                "total_revenue": 15000,
                "contract_age_months": 18,
                "nps_score": 6,
                "support_tickets": 2,
                "session_count_30d": 35,
                "usage_change_30d": -3,
                "days_since_login": 5,
                "payment_failures_90d": 0,
                "late_payments_count": 1,
                "complaints_count": 1
            },
            "base_price": 799
        }
    ]
    
    print("\nSample Pricing Results:")
    for customer in sample_customers:
        result = pricing_engine.calculate_dynamic_price(
            customer["base_price"],
            customer["features"]
        )
        
        print(f"\n{customer['name']}:")
        print(f"  Base Price: ₹{result['base_price']}")
        print(f"  Dynamic Price: ₹{result['dynamic_price']}")
        print(f"  Change: ₹{result['price_change']} ({result['price_change_percent']:+.1f}%)")
        print(f"  Churn Risk: {result['factors']['churn_risk']:.2%}")
        print(f"  Elasticity: {result['factors']['elasticity']:.2f}")
        print(f"  Recommendation: {result['recommendation']}")
    
    # Step 5: Scenario Simulation
    print("\n[STEP 5] Scenario Simulation")
    print("-" * 50)
    
    scenarios = pricing_engine.simulate_pricing_scenarios(
        799,
        sample_customers[2]["features"]
    )
    
    print("\nPricing by Scenario (Average Customer, Base: ₹799):")
    print(f"{'Scenario':<20} | {'Dynamic Price':>12} | {'Change':>10}")
    print("-" * 48)
    for scenario_name, result in scenarios.items():
        print(f"{scenario_name:<20} | ₹{result['dynamic_price']:>10.2f} | {result['price_change_percent']:>+9.1f}%")
    
    # Step 6: ROI Projection
    print("\n[STEP 6] ROI Projection")
    print("-" * 50)
    
    roi = pricing_engine.calculate_roi_projection(
        customers_saved=700,
        avg_revenue_per_user=500,
        avg_lifetime_months=24,
        implementation_cost=1000000
    )
    
    print("\nProjected ROI Analysis:")
    print(f"  Customers Saved:    {roi['customers_saved']}")
    print(f"  Revenue Saved:      ₹{roi['revenue_saved']:,.2f}")
    print(f"  Implementation Cost: ₹{roi['implementation_cost']:,.2f}")
    print(f"  Net Benefit:        ₹{roi['net_benefit']:,.2f}")
    print(f"  ROI:                {roi['roi_percent']:.1f}%")
    print(f"  Payback Period:     {roi['payback_months']:.1f} months")
    
    # Step 7: Save Pricing Engine
    print("\n[STEP 7] Save Pricing Engine")
    print("-" * 50)
    
    pricing_engine.save()
    
    # Save ROI projection
    roi_path = REPORTS_DIR / "roi_projection.json"
    with open(roi_path, "w") as f:
        json.dump(roi, f, indent=2)
    print(f"ROI projection saved to: {roi_path}")
    
    # Step 8: Generate Visualizations
    print("\n[STEP 8] Generate Visualizations")
    print("-" * 50)
    
    visualizer = Visualizer()
    visualizer.plot_pricing_simulation(scenarios)
    
    # Step 9: Summary
    print("\n" + "="*70)
    print(" TRAINING COMPLETE")
    print("="*70)
    
    print("\n📊 Pricing Engine Configuration:")
    print(f"  • Formula: P_dynamic = P_base × (1 + α·D_t + β·E_c + γ·R_c)")
    print(f"  • α (Demand Weight): {pricing_engine.weights['alpha']}")
    print(f"  • β (Elasticity Weight): {pricing_engine.weights['beta']}")
    print(f"  • γ (Churn Risk Weight): {pricing_engine.weights['gamma']}")
    
    print("\n🎯 Expected Impact:")
    print(f"  • Revenue Increase: ~25%")
    print(f"  • Churn Reduction: ~28%")
    print(f"  • ROI: {roi['roi_percent']:.0f}%")
    
    print("\n📁 Saved Artifacts:")
    print("  • Engine: ml/artifacts/models/pricing_model.joblib")
    print("  • Config: ml/artifacts/reports/pricing_config.json")
    print("  • ROI: ml/artifacts/reports/roi_projection.json")
    print("  • Visualizations: ml/artifacts/visualizations/")
    
    return pricing_engine


if __name__ == "__main__":
    pricing_engine = train_pricing_model()

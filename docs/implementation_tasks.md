# BroadbandX Implementation Task List

## Current Status: Phase 1 Complete ✅ | Phase 2 Pending 🔄

---

## PHASE 2: ML Integration (6 Weeks)

### 🎯 Phase 2 Features Overview

This phase implements **3 core ML features** that directly solve the research paper's problem statement:

---

### 🔴 FEATURE 1: Churn Prediction Model

**Problem Solved:** Customer churn rates exceeding 20-25% annually

**What It Does:**
- Analyzes customer behavior to predict who will cancel
- Assigns **risk score (0-100%)** to each customer
- Triggers alerts for high-risk customers BEFORE they churn

**Input Features → Output:**
```
┌─────────────────────────────────────────────────────────────┐
│                  CHURN PREDICTION MODEL                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  INPUT FEATURES:                                            │
│  ├── Usage decline (30 days)      → 23% importance         │
│  ├── Days since last login        → 18% importance         │
│  ├── Payment failure count        → 15% importance         │
│  ├── Support tickets count        → 12% importance         │
│  └── Contract age (months)        → 10% importance         │
│                                                             │
│  ML MODEL: XGBoost Classifier (89% accuracy)                │
│                                                             │
│  OUTPUT:                                                    │
│  └── Churn probability: 0% to 100%                          │
│      ├── < 40%  → 🟢 Low Risk (monitor)                     │
│      ├── 40-70% → 🟡 Medium Risk (outreach)                 │
│      └── > 70%  → 🔴 High Risk (immediate action)           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Where It Shows in App:**
- Admin Dashboard → User list shows risk badge
- WebSocket alerts when customer crosses 70%
- Email triggers for retention campaigns

---

### 🔴 FEATURE 2: Dynamic Pricing Engine

**Problem Solved:** Static pricing that doesn't adapt to market conditions

**What It Does:**
- Calculates **personalized price** for each customer
- Adjusts based on demand, sensitivity, and churn risk
- Maximizes revenue while retaining customers

**The Formula:**
```
┌─────────────────────────────────────────────────────────────┐
│              DYNAMIC PRICING FORMULA                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   P_dynamic = P_base × (1 + α·D + β·E + γ·R)                │
│                                                             │
│   WHERE:                                                    │
│   ├── P_base = Base plan price (₹500)                       │
│   ├── D = Demand factor (0 to 1)                            │
│   │       → Peak hours/season = higher price                │
│   ├── E = Price elasticity (-1 to 1)                        │
│   │       → Sensitive customer = offer discount             │
│   ├── R = Churn risk (0 to 1)                               │
│   │       → High risk = offer discount to retain            │
│   └── α, β, γ = Weight parameters (learned from data)       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Example Calculations:**
| Customer | Demand (D) | Elasticity (E) | Churn (R) | Final Price |
|----------|:----------:|:--------------:|:---------:|:-----------:|
| Loyal, Peak hour | 0.3 | -0.3 | 0.1 | ₹525 (+5%) |
| Price-sensitive | 0.0 | -0.8 | 0.2 | ₹450 (-10%) |
| High churn risk | 0.0 | -0.5 | 0.8 | ₹425 (-15%) |
| New customer | 0.0 | -0.6 | 0.3 | ₹465 (-7%) |

**Where It Shows in App:**
- Subscription page → Personalized prices
- Admin → Can set min/max bounds (₹400-₹600)
- Dashboard → Static vs Dynamic revenue comparison

---

### 🔴 FEATURE 3: Customer Segmentation

**Problem Solved:** Lack of personalization - one-size-fits-all approach

**What It Does:**
- Clusters customers into **5 distinct segments**
- Each segment has different price sensitivity
- Enables targeted pricing and marketing

**The 5 Customer Segments:**
```
┌─────────────────────────────────────────────────────────────┐
│                  CUSTOMER SEGMENTS                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🏆 PREMIUM POWER USERS (15% of customers)                  │
│     Usage: 150+ GB/month | Elasticity: -0.3 (insensitive)   │
│     Strategy: Loyalty rewards, premium features             │
│                                                             │
│  💰 PRICE-CONSCIOUS POWER (25% of customers)                │
│     Usage: 100+ GB/month | Elasticity: -1.8 (very sensitive)│
│     Strategy: Dynamic discounts, bundle deals               │
│                                                             │
│  ⚖️ VALUE-SEEKERS (30% of customers)                        │
│     Usage: 30-60 GB/month | Elasticity: -1.2 (moderate)     │
│     Strategy: Tiered pricing, usage-based offers            │
│                                                             │
│  📉 BUDGET USERS (20% of customers)                         │
│     Usage: 50-80 GB/month | Elasticity: -2.0 (most sensitive)│
│     Strategy: Off-peak discounts, limited-time offers       │
│                                                             │
│  ✨ CASUAL PREMIUM (10% of customers)                       │
│     Usage: <30 GB/month | Elasticity: -0.5 (insensitive)    │
│     Strategy: Convenience pricing, auto-pay benefits        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**ML Model:** K-Means Clustering (k=5)

**Where It Shows in App:**
- User profile → Segment badge
- Admin dashboard → Segment distribution pie chart
- Dynamic pricing uses segment's elasticity value

---

### 🔗 How All 3 Features Connect

```
Customer requests price
        │
        ▼
┌───────────────────┐
│ 1. SEGMENTATION   │─── Identify customer segment
│    (K-Means)      │    → Get elasticity value (E)
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ 2. CHURN MODEL    │─── Predict churn probability
│    (XGBoost)      │    → Get risk value (R)
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ 3. DEMAND CHECK   │─── Is it peak hour/season?
│    (Time-based)   │    → Get demand value (D)
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ 4. DYNAMIC PRICE  │─── Apply formula
│    P = P_base ×   │    P = 500 × (1 + αD + βE + γR)
│    (1 + αD+βE+γR) │    → Return personalized price
└─────────┬─────────┘
          │
          ▼
    Show price to customer
```

---

### 📈 Expected Results (From Research Paper)

| Metric | Before (Static) | After (Dynamic) | Improvement |
|--------|:---------------:|:---------------:|:-----------:|
| Monthly Revenue | ₹10,00,000 | ₹12,50,000 | **+25%** |
| Churn Rate | 25% | 18% | **-28%** |
| ARPU | ₹500 | ₹625 | **+25%** |
| Customer Satisfaction | 3.2/5 | 3.8/5 | **+19%** |

---

## Phase 2 Weekly Tasks

### Week 1: ML Environment Setup
- [ ] **1.1** Create `ml_service/` directory in project root
- [ ] **1.2** Set up Python virtual environment
- [ ] **1.3** Install dependencies: FastAPI, XGBoost, pandas, numpy, scikit-learn
- [ ] **1.4** Create FastAPI server (`ml_service/main.py`)
- [ ] **1.5** Configure CORS for Node.js backend communication
- [ ] **1.6** Test ML service runs on port 5002

### Week 1-2: Data Pipeline
- [ ] **2.1** Create MongoDB export script (`ml_service/scripts/export_data.py`)
- [ ] **2.2** Export UsageLogs collection to CSV
- [ ] **2.3** Export Subscriptions collection to CSV
- [ ] **2.4** Export Payments collection to CSV
- [ ] **2.5** Export Users collection (anonymized) to CSV
- [ ] **2.6** Create data preprocessing pipeline (`ml_service/data/preprocessor.py`)
- [ ] **2.7** Handle missing values and outliers
- [ ] **2.8** Create feature engineering module (`ml_service/data/features.py`)

### Week 2-3: Churn Prediction Model
- [ ] **3.1** Create churn label from historical data (churned = cancelled subscription)
- [ ] **3.2** Engineer features:
  - [ ] Usage decline (30-day percentage)
  - [ ] Days since last login
  - [ ] Payment failure count
  - [ ] Support ticket count
  - [ ] Contract age in months
- [ ] **3.3** Split data: 70% train, 15% validation, 15% test
- [ ] **3.4** Train XGBoost classifier
- [ ] **3.5** Tune hyperparameters (max_depth, learning_rate, n_estimators)
- [ ] **3.6** Evaluate model (target: F1-score > 0.80)
- [ ] **3.7** Save trained model (`ml_service/models/churn_model.pkl`)
- [ ] **3.8** Create prediction API endpoint (`POST /api/ml/churn/predict`)

### Week 3-4: Dynamic Pricing Engine
- [ ] **4.1** Create pricing service (`ml_service/services/pricing_service.py`)
- [ ] **4.2** Implement demand factor calculation (time-based analysis)
- [ ] **4.3** Implement price elasticity estimation from historical data
- [ ] **4.4** Integrate churn risk score from churn model
- [ ] **4.5** Implement Formula 1: `P = P_base × (1 + αD + βE + γR)`
- [ ] **4.6** Add constraint handling (min/max price bounds)
- [ ] **4.7** Create pricing API endpoint (`POST /api/ml/pricing/calculate`)
- [ ] **4.8** Add A/B testing flag for comparing static vs dynamic

### Week 4-5: Customer Segmentation
- [ ] **5.1** Create segmentation service (`ml_service/services/segmentation.py`)
- [ ] **5.2** Extract segmentation features (usage, payments, engagement)
- [ ] **5.3** Apply K-means clustering (k=5 segments)
- [ ] **5.4** Label segments: Premium, Price-Conscious, Value-Seekers, Budget, Casual
- [ ] **5.5** Save segment model (`ml_service/models/segmentation_model.pkl`)
- [ ] **5.6** Create segment API endpoint (`GET /api/ml/segment/{userId}`)
- [ ] **5.7** Assign elasticity coefficient per segment

### Week 5: Backend Integration
- [ ] **6.1** Create ML proxy routes in Node.js (`server/routes/ml.js`)
- [ ] **6.2** Add ML service health check endpoint
- [ ] **6.3** Modify plan pricing API to fetch dynamic prices
- [ ] **6.4** Add churn risk to user profile API response
- [ ] **6.5** Create admin endpoint for ML model metrics
- [ ] **6.6** Add WebSocket events for real-time churn alerts
- [ ] **6.7** Store pricing decisions in new `PricingLog` collection

### Week 5-6: Frontend Integration
- [ ] **7.1** Create ML Analytics dashboard component
- [ ] **7.2** Add churn risk indicator to admin user list
- [ ] **7.3** Display personalized prices on customer subscription page
- [ ] **7.4** Add segment badge to customer profiles
- [ ] **7.5** Create churn risk chart (high/medium/low distribution)
- [ ] **7.6** Add pricing comparison view (static vs dynamic)
- [ ] **7.7** Create admin ML settings panel

### Week 6: Testing & Documentation
- [ ] **8.1** Test churn prediction accuracy on held-out data
- [ ] **8.2** Test dynamic pricing end-to-end flow
- [ ] **8.3** Verify price constraints are enforced
- [ ] **8.4** Load test ML service (target: <100ms response)
- [ ] **8.5** Document ML API endpoints
- [ ] **8.6** Create model retraining guide
- [ ] **8.7** Update README with ML features

---

## QUICK START: First 5 Tasks

```bash
# Task 1.1-1.3: Setup ML Environment
mkdir ml_service
cd ml_service
python -m venv venv
venv\Scripts\activate  # Windows
pip install fastapi uvicorn pandas numpy scikit-learn xgboost pymongo python-dotenv

# Task 1.4: Create main.py
# (I will create this file for you)

# Task 2.1: Create export script
# (I will create this file for you)
```

---

## FILE STRUCTURE TO CREATE

```
Quest/
├── ml_service/                 # NEW FOLDER
│   ├── main.py                 # FastAPI entry point
│   ├── requirements.txt        # Python dependencies
│   ├── .env                    # ML service config
│   ├── api/
│   │   ├── routes/
│   │   │   ├── pricing.py      # Dynamic pricing endpoints
│   │   │   ├── churn.py        # Churn prediction endpoints
│   │   │   └── segment.py      # Segmentation endpoints
│   ├── services/
│   │   ├── pricing_service.py  # Pricing logic
│   │   ├── churn_service.py    # Churn prediction logic
│   │   └── segment_service.py  # Segmentation logic
│   ├── models/
│   │   ├── churn_model.pkl     # Trained churn model
│   │   └── segment_model.pkl   # Trained segmentation model
│   ├── data/
│   │   ├── preprocessor.py     # Data cleaning
│   │   └── features.py         # Feature engineering
│   └── scripts/
│       └── export_data.py      # MongoDB export
├── server/
│   └── routes/
│       └── ml.js               # NEW: ML proxy routes
└── client/
    └── src/
        └── components/
            └── MLAnalytics.tsx # NEW: ML dashboard
```

---

## MAPS TO RESEARCH PAPER SECTIONS

| Task Group | Research Paper Section | Equations Used |
|------------|----------------------|----------------|
| Week 2-3: Churn Model | IV.C Churn Prediction | Equation 3 |
| Week 3-4: Pricing | IV.A Dynamic Pricing | Equation 1, 2 |
| Week 4-5: Segmentation | IV.E Customer Segmentation | Table III |
| Week 5: Integration | V. Implementation | Fig. 2 |
| Week 6: Testing | VI. Experimental Results | Table IV, V |

---

## SUCCESS CRITERIA

| Metric | Target | Validation Method |
|--------|--------|-------------------|
| Churn Model F1-Score | > 0.80 | Cross-validation |
| Pricing API Latency | < 100ms | Load testing |
| Revenue Improvement | +20% | A/B test simulation |
| Churn Reduction | -25% | Historical comparison |

---

## PHASE 3: Advanced Features (Weeks 7-10)

### Week 7: Demand Forecasting with Deep Learning

**Goal:** Predict future bandwidth demand for infrastructure planning and pricing

- [ ] **9.1** Install TensorFlow/PyTorch for deep learning
- [ ] **9.2** Prepare time-series data (daily/hourly usage patterns)
- [ ] **9.3** Create LSTM model for demand forecasting
  ```python
  # Architecture: 
  # Input → LSTM(128) → Dropout(0.2) → LSTM(64) → Dense(32) → Output
  ```
- [ ] **9.4** Train on 6+ months historical data
- [ ] **9.5** Predict 7-day and 30-day demand forecasts
- [ ] **9.6** Create forecast API endpoint (`GET /api/ml/forecast`)
- [ ] **9.7** Visualize forecasts on admin dashboard
- [ ] **9.8** Use forecasts to adjust dynamic pricing D_t factor

**Features Enabled:**
- Peak hour pricing adjustments
- Infrastructure capacity planning
- Proactive bandwidth allocation

---

### Week 7-8: Plan Recommendation Engine

**Goal:** Suggest optimal plans based on user behavior

- [ ] **10.1** Create recommendation service (`ml_service/services/recommender.py`)
- [ ] **10.2** Build user-plan interaction matrix
- [ ] **10.3** Implement collaborative filtering algorithm
- [ ] **10.4** Implement content-based filtering (usage patterns → plan features)
- [ ] **10.5** Create hybrid recommendation model
- [ ] **10.6** Add recommendation API endpoint (`GET /api/ml/recommend/{userId}`)
- [ ] **10.7** Display "Recommended for You" section on customer dashboard
- [ ] **10.8** Track recommendation click-through rates
- [ ] **10.9** A/B test recommendations vs no recommendations

**Recommendation Logic:**
```
IF user_usage > current_plan_limit * 0.9:
    Recommend upgrade (next tier plan)
ELIF user_usage < current_plan_limit * 0.3:
    Recommend downgrade (save money, reduce churn)
ELSE:
    Recommend add-ons (speed boost, OTT bundles)
```

---

### Week 8-9: Retention Campaign Automation

**Goal:** Automated interventions for at-risk customers

- [ ] **11.1** Create retention service (`server/services/retentionService.js`)
- [ ] **11.2** Define intervention triggers:
  - [ ] Churn risk > 70% → Immediate action
  - [ ] Churn risk 50-70% → Scheduled outreach
  - [ ] Churn risk 40-50% → Automated email
- [ ] **11.3** Create discount offer generator based on customer CLV
- [ ] **11.4** Implement automated email campaigns:
  - [ ] "We miss you" for inactive users
  - [ ] "Special offer" for high-risk users
  - [ ] "Loyalty reward" for long-term users
- [ ] **11.5** Create retention dashboard for admin
- [ ] **11.6** Track intervention success rates
- [ ] **11.7** Add WebSocket alerts for high-priority interventions
- [ ] **11.8** Generate retention reports (weekly/monthly)

**Automated Actions:**
| Churn Risk | Customer CLV | Action |
|:----------:|:------------:|--------|
| > 80% | High | Personal call + 30% discount |
| > 80% | Medium | Email + 20% discount |
| > 80% | Low | Email + 10% discount |
| 50-80% | Any | Automated email campaign |
| < 50% | High | Loyalty rewards |

---

### Week 9: Network Usage Analytics & Anomaly Detection

**Goal:** Detect unusual usage patterns and potential fraud

- [ ] **12.1** Create anomaly detection service (`ml_service/services/anomaly.py`)
- [ ] **12.2** Implement Isolation Forest algorithm for outlier detection
- [ ] **12.3** Define anomaly types:
  - [ ] Sudden usage spike (possible account sharing)
  - [ ] Usage from multiple locations (potential fraud)
  - [ ] Abnormal peak hour patterns
  - [ ] Data consumption 10x above plan limit
- [ ] **12.4** Create real-time anomaly detection pipeline
- [ ] **12.5** Generate alerts for security team
- [ ] **12.6** Create anomaly API endpoint (`GET /api/ml/anomalies`)
- [ ] **12.7** Add anomaly dashboard for admin
- [ ] **12.8** Log anomalies to AuditLog collection

**Anomaly Scoring:**
```python
anomaly_score = isolation_forest.predict(user_features)
# -1 = Anomaly, 1 = Normal

threshold_actions = {
    'critical': 'Block account + Alert security',
    'high': 'Flag for review + Email user',
    'medium': 'Log for monitoring',
    'low': 'Normal behavior'
}
```

---

### Week 9-10: Customer Lifetime Value (CLV) Prediction

**Goal:** Predict total value of each customer over their lifetime

- [ ] **13.1** Create CLV service (`ml_service/services/clv_service.py`)
- [ ] **13.2** Calculate historical CLV from payment data
- [ ] **13.3** Build predictive CLV model using gradient boosting
- [ ] **13.4** Features for CLV prediction:
  - [ ] Subscription tenure
  - [ ] Average monthly spend
  - [ ] Plan upgrade/downgrade history
  - [ ] Payment consistency
  - [ ] Referral activity
- [ ] **13.5** Create CLV API endpoint (`GET /api/ml/clv/{userId}`)
- [ ] **13.6** Add CLV tier badges (Platinum, Gold, Silver, Bronze)
- [ ] **13.7** Prioritize high-CLV customers for retention
- [ ] **13.8** Use CLV in dynamic pricing decisions

**CLV Formula (Implemented):**
```
CLV = Σ (Monthly_Revenue × Retention_Rate^t) / (1 + Discount_Rate)^t

Simplified: CLV = ARPU × Avg_Lifetime_Months × Profit_Margin
```

---

### Week 10: A/B Testing Framework

**Goal:** Systematically test pricing strategies

- [ ] **14.1** Create A/B test service (`server/services/abTestService.js`)
- [ ] **14.2** Implement user assignment to test groups (50/50 split)
- [ ] **14.3** Create test configuration:
  - [ ] Test name and description
  - [ ] Start/end dates
  - [ ] Success metrics (conversion, revenue, churn)
  - [ ] Variant definitions
- [ ] **14.4** Store test assignments in database
- [ ] **14.5** Track conversion events per variant
- [ ] **14.6** Calculate statistical significance (p-value < 0.05)
- [ ] **14.7** Create A/B test dashboard for admin
- [ ] **14.8** Auto-declare winner when significance reached
- [ ] **14.9** Gradual rollout of winning variant

**A/B Test Types:**
| Test | Control | Variant | Metric |
|------|---------|---------|--------|
| Pricing | Static price | Dynamic price | Revenue |
| Discounts | No discount | 10% off | Conversion |
| Recommendations | No recs | Personalized | Upgrade rate |
| Emails | Standard | Personalized | CTR |

---

## PHASE 4: Enterprise Features (Weeks 11-14)

### Week 11-12: Real-time Analytics Dashboard

**Goal:** Live monitoring of all ML systems

- [ ] **15.1** Create real-time metrics collection (Redis pub/sub)
- [ ] **15.2** Build analytics dashboard with live charts:
  - [ ] Real-time revenue counter
  - [ ] Live churn risk distribution
  - [ ] Active users map
  - [ ] Pricing distribution histogram
- [ ] **15.3** Add 1-minute refresh for all metrics
- [ ] **15.4** Create custom date range selectors
- [ ] **15.5** Export analytics reports (PDF/Excel)
- [ ] **15.6** Add anomaly alerts overlay
- [ ] **15.7** Mobile-responsive dashboard

---

### Week 12-13: Model Monitoring & Retraining

**Goal:** Ensure ML models stay accurate over time

- [ ] **16.1** Create model monitoring service (`ml_service/services/monitor.py`)
- [ ] **16.2** Track model performance metrics daily:
  - [ ] Accuracy drift detection
  - [ ] Feature distribution shift
  - [ ] Prediction confidence scores
- [ ] **16.3** Set up automated alerts for performance degradation
- [ ] **16.4** Create automated retraining pipeline:
  - [ ] Trigger: Accuracy drops below threshold
  - [ ] Action: Retrain on last 90 days data
  - [ ] Validation: Compare new vs old model
  - [ ] Deployment: Gradual rollout
- [ ] **16.5** Version control for models (MLflow integration)
- [ ] **16.6** Model performance comparison dashboard
- [ ] **16.7** Rollback capability for bad models

---

### Week 13-14: API Rate Limiting & Scalability

**Goal:** Production-ready ML service

- [ ] **17.1** Add Redis caching for ML predictions (TTL: 5 minutes)
- [ ] **17.2** Implement request queuing for high load
- [ ] **17.3** Add circuit breaker pattern for ML service failures
- [ ] **17.4** Create fallback to static pricing if ML fails
- [ ] **17.5** Load testing: 1000 requests/second target
- [ ] **17.6** Docker containerization of ML service
- [ ] **17.7** Kubernetes deployment configuration
- [ ] **17.8** Horizontal auto-scaling based on CPU/memory

---

### Week 14: Security & Compliance

**Goal:** Enterprise-grade security for ML systems

- [ ] **18.1** API authentication for ML service (JWT)
- [ ] **18.2** Rate limiting per user/IP
- [ ] **18.3** Input validation and sanitization
- [ ] **18.4** Encrypt sensitive model data
- [ ] **18.5** GDPR compliance for customer data:
  - [ ] Right to explanation (why this price?)
  - [ ] Right to deletion (remove from training data)
  - [ ] Data anonymization in ML pipeline
- [ ] **18.6** Audit logging for all ML decisions
- [ ] **18.7** Bias detection in pricing model
- [ ] **18.8** Fairness constraints in optimization

---

## COMPLETE FEATURE LIST SUMMARY

| Phase | Features | Weeks | Priority |
|:-----:|----------|:-----:|:--------:|
| **2** | Churn Prediction, Dynamic Pricing, Segmentation | 1-6 | 🔴 Critical |
| **3** | Demand Forecast, Recommendations, Retention, Anomaly Detection, CLV, A/B Testing | 7-10 | 🟡 Important |
| **4** | Real-time Analytics, Model Monitoring, Scalability, Security | 11-14 | 🟢 Nice-to-have |

---

## FINAL SUCCESS CRITERIA

| Metric | Phase 2 Target | Phase 3 Target | Phase 4 Target |
|--------|:--------------:|:--------------:|:--------------:|
| Churn Prediction F1 | > 0.80 | > 0.85 | > 0.88 |
| Revenue Improvement | +20% | +30% | +35% |
| Churn Reduction | -25% | -35% | -40% |
| API Latency | < 100ms | < 50ms | < 30ms |
| Model Accuracy Drift | - | < 5% monthly | < 2% monthly |
| System Uptime | - | 99% | 99.9% |

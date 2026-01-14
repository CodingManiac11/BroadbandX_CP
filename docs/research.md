# Mathematical Formulas for Dynamic Pricing Framework

## Overview: Which Formulas Are Used Where?

| Formula | Used In | Purpose |
|---------|---------|---------|
| Formula 1 | **Dynamic Pricing** | Core pricing calculation |
| Formula 2 | **Dynamic Pricing** | Understanding customer sensitivity |
| Formula 3 | Churn Prediction | Risk assessment input |
| Formula 4 | **Dynamic Pricing** | Revenue optimization |
| Formula 5 | Business Analysis | Customer value calculation |
| Formula 6 | Churn Prediction | ML model training |

---

## CORE DYNAMIC PRICING FORMULAS

### Formula 1: Dynamic Price Calculation ⭐ (MAIN FORMULA)

**This is the heart of your dynamic pricing system.**

```
P_dynamic = P_base × (1 + α·D + β·E + γ·R)
```

**In simple terms:**
```
Final Price = Base Price × Adjustment Factor
```

**Where:**
| Symbol | Meaning | Example Value |
|--------|---------|---------------|
| P_base | Original plan price | ₹500/month |
| D | Demand factor (0 to 1) | 0.3 (30% high demand) |
| E | Elasticity coefficient (-1 to 1) | -0.2 (price sensitive) |
| R | Churn risk factor (0 to 1) | 0.4 (40% churn risk) |
| α, β, γ | Weights (learned by ML) | 0.1, 0.15, 0.2 |

**Example Calculation:**
```
P_base = ₹500
D = 0.3 (high demand period)
E = -0.2 (customer is price sensitive)  
R = 0.4 (medium churn risk - give discount)
α = 0.1, β = 0.15, γ = -0.2 (negative to give discount for high risk)

P_dynamic = 500 × (1 + 0.1×0.3 + 0.15×(-0.2) + (-0.2)×0.4)
P_dynamic = 500 × (1 + 0.03 - 0.03 - 0.08)
P_dynamic = 500 × 0.92
P_dynamic = ₹460 (8% discount for at-risk customer)
```

**Citation:** Talluri & Van Ryzin (2004), Bertsimas & Perakis (2006)

---

### Formula 2: Price Elasticity of Demand ⭐ (MEASURES SENSITIVITY)

**This tells us how customers react to price changes.**

```
ε = (% Change in Demand) / (% Change in Price)
```

**Mathematical Form:**
```
ε = (ΔQ/Q) / (ΔP/P)
```

**Where:**
| Symbol | Meaning |
|--------|---------|
| ε (epsilon) | Price elasticity |
| Q | Quantity demanded (number of subscriptions) |
| P | Price |
| Δ | Change in value |

**Interpretation:**
| Elasticity Value | Type | Customer Behavior | Strategy |
|------------------|------|-------------------|----------|
| ε < -1 | Elastic | Very price sensitive | Offer discounts |
| ε = -1 | Unit elastic | Proportional response | Moderate pricing |
| -1 < ε < 0 | Inelastic | Less price sensitive | Premium pricing OK |

**Example:**
```
If price increases by 10% and subscriptions drop by 15%:
ε = -15% / 10% = -1.5 (Elastic - customers are sensitive!)
```

**Citation:** Varian (2014) - Intermediate Microeconomics

---

### Formula 4: Revenue Optimization ⭐ (BUSINESS GOAL)

**This is what we want to MAXIMIZE.**

```
Maximize R = Σ (Price × Demand × Retention)
```

**Full Mathematical Form:**
```
max R = Σ[i=1 to N] P_i × Q_i(P_i) × (1 - C_i(P_i))
```

**Where:**
| Symbol | Meaning |
|--------|---------|
| R | Total Revenue |
| N | Number of customers |
| P_i | Price for customer i |
| Q_i(P_i) | Demand function (will customer buy at this price?) |
| C_i(P_i) | Churn probability (will customer leave?) |
| (1 - C_i) | Retention probability |

**Constraints (Rules we must follow):**
```
Constraint 1: P_min ≤ P_i ≤ P_max
(Price must be within allowed range, e.g., ₹300 to ₹700)

Constraint 2: C_i(P_i) ≤ C_threshold  
(Churn risk must stay below acceptable level, e.g., 30%)
```

**In Simple Terms:**
```
We want the highest revenue BUT:
- We can't price too high (customers leave)
- We can't price too low (lose money)
- We must keep churn below a threshold
```

**Citation:** den Boer (2015) - Dynamic Pricing and Learning

---

## SUPPORTING FORMULAS (Used by ML Models)

### Formula 3: Churn Probability (Logistic Regression)

**Predicts if a customer will leave (0 to 1 probability).**

```
P(churn) = 1 / (1 + e^(-z))

where z = β₀ + β₁x₁ + β₂x₂ + ... + βₙxₙ
```

**In Simple Terms:**
```
Churn Risk = Function of (Usage + Payments + Complaints + ...)
```

**Where:**
| Symbol | Meaning | Example |
|--------|---------|---------|
| x₁ | Usage decline (%) | 30% drop |
| x₂ | Late payments count | 2 times |
| x₃ | Support tickets | 5 tickets |
| x₄ | Days since login | 15 days |
| β₁, β₂... | Weights (learned) | 0.02, 0.15... |

**Example:**
```
If z = -2, then P(churn) = 1/(1 + e²) = 1/8.39 = 0.12 (12% risk)
If z = +2, then P(churn) = 1/(1 + e⁻²) = 1/1.14 = 0.88 (88% risk!)
```

**Citation:** Verbeke et al. (2012)

---

### Formula 5: Customer Lifetime Value (CLV)

**How much is a customer worth over time?**

```
CLV = Σ[t=1 to T] [(Revenue_t - Cost_t) × r^t] / (1+d)^t
```

**Simplified Version:**
```
CLV = (Average Monthly Revenue × Retention Rate) / (1 - Retention Rate + Discount Rate)
```

**Where:**
| Symbol | Meaning | Example |
|--------|---------|---------|
| Revenue_t | Monthly revenue | ₹500 |
| Cost_t | Service cost | ₹100 |
| r | Retention rate | 0.85 (85%) |
| d | Discount rate | 0.10 (10%) |
| T | Time horizon | 36 months |

**Example:**
```
Monthly profit = ₹500 - ₹100 = ₹400
Retention rate = 85%
Discount rate = 10%

CLV ≈ ₹400 × 0.85 / (1 - 0.85 + 0.10)
CLV ≈ ₹340 / 0.25
CLV = ₹1,360 per customer
```

**Citation:** Gupta & Lehmann (2005)

---

### Formula 6: XGBoost Objective Function

**This is the loss function for training the ML model.**

```
L = Σ[i=1 to n] l(y_i, ŷ_i) + Σ[k=1 to K] Ω(f_k)
```

**In Simple Terms:**
```
Total Loss = Prediction Error + Complexity Penalty
```

**Where:**
| Symbol | Meaning |
|--------|---------|
| l(y_i, ŷ_i) | Error between actual (y) and predicted (ŷ) |
| Ω(f_k) | Regularization (prevents overfitting) |
| K | Number of trees in ensemble |

**Why XGBoost?**
- Better accuracy than single models
- Handles missing data well
- Fast training on large datasets
- Built-in regularization

**Citation:** Chen & Guestrin (2016) - ACM SIGKDD

---

## HOW FORMULAS WORK TOGETHER

```
┌─────────────────────────────────────────────────────────────┐
│                    DYNAMIC PRICING SYSTEM                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STEP 1: Calculate Customer Churn Risk                     │
│  ┌─────────────────────────────────────────┐               │
│  │ Formula 3: P(churn) = 1/(1 + e^-z)      │──► R value    │
│  │ (Using Formula 6: XGBoost for training) │               │
│  └─────────────────────────────────────────┘               │
│                           │                                 │
│                           ▼                                 │
│  STEP 2: Estimate Price Sensitivity                        │
│  ┌─────────────────────────────────────────┐               │
│  │ Formula 2: ε = ΔQ/Q ÷ ΔP/P             │──► E value    │
│  └─────────────────────────────────────────┘               │
│                           │                                 │
│                           ▼                                 │
│  STEP 3: Check Current Demand                              │
│  ┌─────────────────────────────────────────┐               │
│  │ Time-based demand analysis              │──► D value    │
│  └─────────────────────────────────────────┘               │
│                           │                                 │
│                           ▼                                 │
│  STEP 4: Calculate Personalized Price                      │
│  ┌─────────────────────────────────────────┐               │
│  │ Formula 1: P = P_base × (1 + αD + βE + γR)             │
│  └─────────────────────────────────────────┘               │
│                           │                                 │
│                           ▼                                 │
│  STEP 5: Optimize for Maximum Revenue                      │
│  ┌─────────────────────────────────────────┐               │
│  │ Formula 4: max R = Σ P×Q×(1-C)          │               │
│  │ Subject to constraints                   │               │
│  └─────────────────────────────────────────┘               │
│                           │                                 │
│                           ▼                                 │
│  STEP 6: Evaluate Customer Value                           │
│  ┌─────────────────────────────────────────┐               │
│  │ Formula 5: CLV calculation              │               │
│  │ (For business reporting)                │               │
│  └─────────────────────────────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## REFERENCES

[1] Talluri, K., & Van Ryzin, G. (2004). *The Theory and Practice of Revenue Management*. Springer.

[2] Bertsimas, D., & Perakis, G. (2006). "Dynamic Pricing: A Learning Approach."

[3] Verbeke, W., et al. (2012). "Building Comprehensible Customer Churn Prediction Models." *Expert Systems with Applications*, 39(12).

[4] Varian, H. R. (2014). *Intermediate Microeconomics*. W.W. Norton.

[5] den Boer, A. V. (2015). "Dynamic Pricing and Learning." *Surveys in Operations Research*.

[6] Gupta, S., & Lehmann, D. R. (2005). *Managing Customers as Investments*.

[7] Chen, T., & Guestrin, C. (2016). "XGBoost: A Scalable Tree Boosting System." *ACM SIGKDD*.

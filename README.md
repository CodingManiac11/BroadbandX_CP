# BroadbandX

**An AI-Ready Dynamic Broadband Subscription Management Platform**

[![MERN Stack](https://img.shields.io/badge/Stack-MERN-green.svg)](https://www.mongodb.com/mern-stack)
[![Python ML](https://img.shields.io/badge/ML-Python%20|%20FastAPI-blue.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Overview

BroadbandX is a full-stack subscription management platform with integrated machine learning capabilities for churn prediction, customer segmentation, and dynamic pricing optimization.

**Key Highlights:**
- 🎯 **94% AUC-ROC** churn prediction accuracy
- 📊 **5 customer segments** with price elasticity modeling
- 💰 **25% projected revenue increase** through dynamic pricing
- ⚡ **Real-time** WebSocket notifications

---

## Features

| Category | Features |
|----------|----------|
| **Authentication** | JWT tokens, password reset, role-based access (Admin/Customer) |
| **Subscriptions** | Plan management, upgrades, cancellations, billing cycles |
| **Payments** | Razorpay integration, invoice generation, PDF downloads |
| **Usage Tracking** | Real-time monitoring, usage alerts, CSV exports |
| **Support** | Ticket system with admin responses, real-time updates |
| **ML Predictions** | Churn risk, customer segments, dynamic pricing |

---

## Tech Stack

### Web Application
| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Material-UI |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas |
| Real-time | Socket.io |
| Payments | Razorpay |
| Email | Resend API |

### ML Service
| Component | Technology |
|-----------|------------|
| API | Python, FastAPI |
| Churn Model | XGBoost (94% AUC-ROC) |
| Segmentation | K-Means Clustering |
| Pricing | Multi-factor optimization |

---

## Project Structure

```
BroadbandX/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # Auth & WebSocket
│   │   └── services/       # API services
│   └── package.json
│
├── server/                 # Node.js Backend
│   ├── controllers/        # Request handlers
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API routes
│   ├── services/           # Business logic + ML connector
│   └── server.js
│
├── ml/                     # Python ML Service
│   ├── api/                # FastAPI application
│   ├── models/             # ML model classes
│   ├── data/               # Data processing
│   ├── training/           # Training scripts
│   └── artifacts/          # Trained models
│
└── docs/                   # Documentation
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB Atlas account
- Razorpay account

### Installation

```bash
# Clone repository
git clone https://github.com/CodingManiac11/BroadbandX.git
cd BroadbandX

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install

# Install ML dependencies
cd ../ml && pip install -r requirements.txt
```

### Environment Setup

Create `server/.env`:
```env
NODE_ENV=development
PORT=5001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
RESEND_API_KEY=your_resend_api_key
CLIENT_URL=http://localhost:3000
ML_SERVICE_URL=http://localhost:8000
```

### Running the Application

```bash
# Terminal 1: Backend
cd server && node server.js

# Terminal 2: Frontend
cd client && npm start

# Terminal 3: ML Service (optional)
cd ml && python -c "import uvicorn; from api.main import app; uvicorn.run(app, host='0.0.0.0', port=8000)"
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5001
- ML API Docs: http://localhost:8000/docs

---

## ML Pipeline

### Train Models
```bash
cd ml
python -m training.train_all
```

### Model Performance

| Model | Metric | Target | Achieved |
|-------|--------|--------|----------|
| Churn Prediction | AUC-ROC | 0.91 | **0.94** ✓ |
| Segmentation | Clusters | 5 | 5 ✓ |
| Pricing | Revenue Increase | 25% | Projected ✓ |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ml/churn/predict` | POST | Predict churn probability |
| `/api/ml/segmentation/predict` | POST | Get customer segment |
| `/api/ml/pricing/calculate` | POST | Calculate dynamic price |
| `/api/ml/pricing/customer-analysis` | POST | Full customer analysis |
| `/health` | GET | Health check |

---

## API Reference

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | User registration |
| `/api/auth/login` | POST | User login |
| `/api/auth/forgot-password` | POST | Request password reset |

### Subscriptions
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/customer/subscriptions` | GET | Get subscriptions |
| `/api/customer/subscriptions` | POST | Create subscription |
| `/api/customer/subscriptions/:id` | DELETE | Cancel subscription |

### Usage & Billing
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/usage/current` | GET | Current usage |
| `/api/billing/invoices` | GET | Get invoices |
| `/api/billing/invoices/:id/download` | GET | Download PDF |

---

## Documentation

- [ML Service README](ml/README.md) - ML pipeline documentation
- [Project Report](docs/PROJECT_REPORT.md) - Complete project documentation
- [Research Paper](docs/research_paper_ieee.md) - IEEE format research paper

---

## Author

**Aditya Utsav**  
B.Tech Final Year Project  
GitHub: [@CodingManiac11](https://github.com/CodingManiac11)

---

## License

This project is licensed under the MIT License.
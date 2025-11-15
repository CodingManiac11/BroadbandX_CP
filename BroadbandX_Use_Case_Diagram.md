# BroadbandX Use Case Diagram

```
                    BROADBANDX SUBSCRIPTION MANAGEMENT SYSTEM
                               USE CASE DIAGRAM

    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                                                                             │
    │  ┌─────────────┐                                                            │
    │  │   Customer  │                                                            │
    │  │   (Primary  │                                                            │
    │  │    Actor)   │                                                            │
    │  └──────┬──────┘                                                            │
    │         │                                                                   │
    │         ├──────────► UC1: Register Account                                  │
    │         │           ├─ Email Validation                                     │
    │         │           └─ Profile Creation                                     │
    │         │                                                                   │
    │         ├──────────► UC2: User Authentication                               │
    │         │           ├─ Login                                                │
    │         │           ├─ Logout                                               │
    │         │           ├─ Password Reset                                       │
    │         │           └─ Session Management                                   │
    │         │                                                                   │
    │         ├──────────► UC3: Browse Subscription Plans                         │
    │         │           ├─ View Plan Details                                    │
    │         │           ├─ Compare Plans                                        │
    │         │           └─ Plan Filtering                                       │
    │         │                                                                   │
    │         ├──────────► UC4: Manage Subscriptions                              │
    │         │           ├─ Subscribe to Plan                                    │
    │         │           ├─ Upgrade/Downgrade Plan                               │
    │         │           ├─ Cancel Subscription                                  │
    │         │           └─ View Subscription History                            │
    │         │                                                                   │
    │         ├──────────► UC5: Dashboard Access                                  │
    │         │           ├─ View Account Overview                                │
    │         │           ├─ Real-time Updates                                    │
    │         │           └─ Usage Statistics                                     │
    │         │                                                                   │
    │         ├──────────► UC6: Billing Management                                │
    │         │           ├─ View Invoices                                        │
    │         │           ├─ Payment History                                      │
    │         │           └─ Download Bills                                       │
    │         │                                                                   │
    │         ├──────────► UC7: Profile Management                                │
    │         │           ├─ Update Personal Info                                 │
    │         │           ├─ Change Password                                      │
    │         │           └─ Manage Preferences                                   │
    │         │                                                                   │
    │         └──────────► UC8: Customer Support                                  │
    │                     ├─ Submit Tickets                                       │
    │                     ├─ Live Chat (Planned)                                  │
    │                     └─ FAQ Access                                           │
    │                                                                             │
    │                                                                             │
    │  ┌─────────────┐                                                            │
    │  │    Admin    │                                                            │
    │  │   (System   │                                                            │
    │  │ Administrator)                                                           │
    │  └──────┬──────┘                                                            │
    │         │                                                                   │
    │         ├──────────► UC9: Admin Authentication                              │
    │         │           ├─ Secure Admin Login                                   │
    │         │           └─ Role-based Access                                    │
    │         │                                                                   │
    │         ├──────────► UC10: User Management                                  │
    │         │           ├─ View All Users                                       │
    │         │           ├─ Activate/Deactivate Users                           │
    │         │           ├─ User Role Management                                 │
    │         │           └─ User Activity Monitoring                             │
    │         │                                                                   │
    │         ├──────────► UC11: Subscription Plan Management                     │
    │         │           ├─ Create New Plans                                     │
    │         │           ├─ Edit Existing Plans                                  │
    │         │           ├─ Set Plan Pricing                                     │
    │         │           └─ Plan Activation/Deactivation                         │
    │         │                                                                   │
    │         ├──────────► UC12: System Analytics                                 │
    │         │           ├─ View User Statistics                                 │
    │         │           ├─ Revenue Analytics                                    │
    │         │           ├─ System Performance                                   │
    │         │           └─ Generate Reports                                     │
    │         │                                                                   │
    │         ├──────────► UC13: Billing Administration                           │
    │         │           ├─ Manage Invoices                                      │
    │         │           ├─ Payment Processing                                   │
    │         │           └─ Financial Reports                                    │
    │         │                                                                   │
    │         └──────────► UC14: Customer Support Management                      │
    │                     ├─ View Support Tickets                                │
    │                     ├─ Assign Tickets                                      │
    │                     └─ Support Analytics                                   │
    │                                                                             │
    │                                                                             │
    │  ┌─────────────┐                                                            │
    │  │   System    │                                                            │
    │  │  (External  │                                                            │
    │  │   Actors)   │                                                            │
    │  └──────┬──────┘                                                            │
    │         │                                                                   │
    │         ├──────────► UC15: Email Service Integration                        │
    │         │           ├─ Send Verification Emails                             │
    │         │           ├─ Password Reset Emails                                │
    │         │           └─ Notification Emails                                  │
    │         │                                                                   │
    │         ├──────────► UC16: Payment Gateway Integration                      │
    │         │           ├─ Process Payments (Planned)                           │
    │         │           ├─ Payment Verification                                 │
    │         │           └─ Transaction Logging                                  │
    │         │                                                                   │
    │         ├──────────► UC17: Database Management                              │
    │         │           ├─ Data Storage                                         │
    │         │           ├─ Data Backup                                          │
    │         │           └─ Data Retrieval                                       │
    │         │                                                                   │
    │         └──────────► UC18: Real-time Communication                          │
    │                     ├─ WebSocket Connections                               │
    │                     ├─ Live Updates                                        │
    │                     └─ Multi-session Sync                                  │
    │                                                                             │
    │                                                                             │
    │  ════════════════════════════════════════════════════════════════════════   │
    │                           RELATIONSHIPS                                     │
    │  ════════════════════════════════════════════════════════════════════════   │
    │                                                                             │
    │  «include» Relationships:                                                   │
    │  • UC1 Register Account includes Email Validation                          │
    │  • UC2 User Authentication includes Session Management                      │
    │  • UC4 Manage Subscriptions includes Real-time Updates                     │
    │  • All authenticated use cases include UC2 User Authentication              │
    │                                                                             │
    │  «extend» Relationships:                                                    │
    │  • UC6 Billing Management extends UC4 Manage Subscriptions                 │
    │  • UC8 Customer Support extends UC5 Dashboard Access                       │
    │  • UC12 System Analytics extends UC10 User Management                      │
    │                                                                             │
    │  «generalization» Relationships:                                            │
    │  • Admin inherits from User (Admin can perform all user functions)         │
    │                                                                             │
    └─────────────────────────────────────────────────────────────────────────────┘
```

## 📊 **Use Case Descriptions**

### **🔵 Customer Use Cases (Primary Actor)**

#### **UC1: Register Account**
- **Goal**: Create new customer account
- **Precondition**: User has valid email
- **Success Scenario**: Account created, email verified
- **Extensions**: Email already exists, invalid data

#### **UC2: User Authentication**  
- **Goal**: Secure system access
- **Precondition**: User has valid credentials
- **Success Scenario**: User logged in with JWT token
- **Extensions**: Invalid credentials, account locked

#### **UC3: Browse Subscription Plans**
- **Goal**: View available broadband plans
- **Precondition**: None (public access)
- **Success Scenario**: Plans displayed with details
- **Extensions**: No plans available, filtering applied

#### **UC4: Manage Subscriptions**
- **Goal**: Subscribe, modify, or cancel plans
- **Precondition**: User authenticated
- **Success Scenario**: Subscription updated successfully
- **Extensions**: Payment failure, plan unavailable

#### **UC5: Dashboard Access**
- **Goal**: View personalized account dashboard
- **Precondition**: User authenticated
- **Success Scenario**: Dashboard loaded with real-time data
- **Extensions**: Connection issues, partial data load

### **🔴 Admin Use Cases (Administrative Actor)**

#### **UC10: User Management**
- **Goal**: Administer customer accounts
- **Precondition**: Admin authenticated
- **Success Scenario**: User data managed successfully
- **Extensions**: Database errors, permission issues

#### **UC11: Subscription Plan Management**
- **Goal**: Create and modify subscription plans
- **Precondition**: Admin authenticated
- **Success Scenario**: Plans updated in system
- **Extensions**: Validation errors, active subscribers

#### **UC12: System Analytics**
- **Goal**: Monitor system performance and usage
- **Precondition**: Admin authenticated
- **Success Scenario**: Analytics data displayed
- **Extensions**: Data unavailable, calculation errors

### **🟡 System Use Cases (External Actors)**

#### **UC17: Database Management**
- **Goal**: Handle data persistence and retrieval
- **Precondition**: Database connection available
- **Success Scenario**: Data operations completed
- **Extensions**: Connection timeout, data corruption

#### **UC18: Real-time Communication**
- **Goal**: Provide live updates via WebSocket
- **Precondition**: WebSocket connection established
- **Success Scenario**: Real-time data synchronized
- **Extensions**: Connection dropped, message queue full

## 🎯 **Implementation Status**

### **✅ Fully Implemented (40%)**
- UC1: Register Account (90%)
- UC2: User Authentication (95%)
- UC3: Browse Subscription Plans (85%)
- UC5: Dashboard Access (75%)
- UC18: Real-time Communication (95%)

### **⚠️ Partially Implemented**
- UC4: Manage Subscriptions (60%)
- UC6: Billing Management (30%)
- UC10: User Management (40%)

### **❌ Planned for Future**
- UC8: Customer Support (UI only)
- UC11: Plan Management (Backend incomplete)
- UC16: Payment Gateway (Not integrated)

This use case diagram represents the complete vision for BroadbandX while honestly reflecting the current 40% implementation status.

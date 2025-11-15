# BroadbandX Use Case Diagram

```
                    BROADBANDX SUBSCRIPTION MANAGEMENT SYSTEM
                                USE CASE DIAGRAM

    ┌─────────────┐                                              ┌─────────────┐
    │             │                                              │             │
    │  Customer   │                                              │    Admin    │
    │             │                                              │             │
    └──────┬──────┘                                              └──────┬──────┘
           │                                                            │
           │                                                            │
           ├─────────► ┌─────────────────┐                             │
           │           │ User Registration│                             │
           │           └─────────────────┘                             │
           │                                                            │
           ├─────────► ┌─────────────────┐                             │
           │           │ User Authentication                            │
           │           └─────────────────┘                             │
           │                                                            │
           ├─────────► ┌─────────────────┐                             │
           │           │  Browse Plans   │                             │
           │           └─────────────────┘                             │
           │                                                            │
           ├─────────► ┌─────────────────┐                             │
           │           │Manage Subscriptions                            │
           │           └─────────────────┘                             │
           │                                                            │
           ├─────────► ┌─────────────────┐                             │
           │           │ Dashboard Access│                             │
           │           └─────────────────┘                             │
           │                                                            │
           ├─────────► ┌─────────────────┐                             │
           │           │Billing Management│                            │
           │           └─────────────────┘                             │
           │                                                            │
           └─────────► ┌─────────────────┐                             │
                       │Profile Management│                            │
                       └─────────────────┘                             │
                                                                        │
                                                                        │
                                                ┌─────────────────┐ ◄──┤
                                                │Admin Authentication   │
                                                └─────────────────┘     │
                                                                        │
                                                ┌─────────────────┐ ◄──┤
                                                │ User Management │     │
                                                └─────────────────┘     │
                                                                        │
                                                ┌─────────────────┐ ◄──┤
                                                │ Plan Management │     │
                                                └─────────────────┘     │
                                                                        │
                                                ┌─────────────────┐ ◄──┤
                                                │System Analytics │     │
                                                └─────────────────┘     │
                                                                        │
                                                ┌─────────────────┐ ◄──┘
                                                │Support Management│
                                                └─────────────────┘

    ┌─────────────┐
    │             │
    │   System    │ ──────────► ┌─────────────────┐
    │             │             │ Email Integration│
    └─────────────┘             └─────────────────┘
                   │
                   │            ┌─────────────────┐
                   ├──────────► │Real-time Updates│
                   │            └─────────────────┘
                   │
                   │            ┌─────────────────┐
                   └──────────► │Database Operations│
                                └─────────────────┘

    ════════════════════════════════════════════════════════════════════════
                                RELATIONSHIPS
    ════════════════════════════════════════════════════════════════════════

    «include» Dependencies:
    User Registration ──include──► Email Verification
    All Use Cases ──include──► User Authentication (except Browse Plans)

    «extend» Relationships:
    Billing Management ──extend──► Manage Subscriptions
    System Analytics ──extend──► User Management

    Implementation Status:
    ✅ Fully Implemented: User Registration, User Authentication, Browse Plans, 
                          Dashboard Access, Real-time Updates
    ⚠️  Partial: Manage Subscriptions, Billing Management, User Management
    ❌ Planned: Plan Management, System Analytics, Support Management

```

## System Boundary
**BroadbandX Subscription Management Platform**

## Primary Actors
- **Customer**: End users who subscribe to broadband services
- **Admin**: System administrators who manage the platform
- **System**: External services and automated processes

## Key Use Case Flow
```
Customer Registration → Authentication → Browse Plans → Subscribe → 
Dashboard Access → Billing Management → Profile Updates
```
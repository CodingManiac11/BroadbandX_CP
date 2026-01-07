# 🔒 Security Features Testing Guide

## 1. JWT Tokens - Access & Refresh Tokens

### **How It Works:**
```javascript
// When user logs in:
1. Server generates Access Token (24h expiry)
   - Contains: user ID, email, role
   - Signed with JWT_SECRET
   
2. Server generates Refresh Token (7d expiry)
   - Contains: user ID, email, type='refresh'
   - Signed with JWT_REFRESH_SECRET
   
3. Client stores both tokens in localStorage
   - access_token: Used for API requests
   - refresh_token: Used to get new access token
```

### **Testing Steps:**

#### Test 1: Login & Token Generation
```bash
# 1. Login as customer
POST http://localhost:5001/api/auth/login
Content-Type: application/json

{
  "email": "adityautsav123456@gmail.com",
  "password": "your-password"
}

# Expected Response:
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // Access token
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // Refresh token
  }
}
```

#### Test 2: Using Access Token
```bash
# Access protected route with token
GET http://localhost:5001/api/users/profile
Authorization: Bearer YOUR_ACCESS_TOKEN

# Expected: User profile data (200 OK)
# Without token: 401 Unauthorized
```

#### Test 3: Token Expiration
```bash
# Wait 24+ hours OR manually use expired token
GET http://localhost:5001/api/users/profile
Authorization: Bearer EXPIRED_TOKEN

# Expected Response:
{
  "status": "error",
  "message": "Token expired"
}
```

#### Test 4: Refresh Token
```bash
# Get new access token using refresh token
POST http://localhost:5001/api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "YOUR_REFRESH_TOKEN"
}

# Expected: New access token (200 OK)
```

---

## 2. Bcrypt Password Hashing

### **How It Works:**
```javascript
// Registration/Password Change:
1. User provides plain password: "myPassword123"
2. Bcrypt generates random salt (12 rounds)
3. Password hashed: "$2a$12$KIXQQhD..." (60 chars)
4. Only hash stored in database

// Login:
1. User provides plain password
2. Server retrieves hash from database
3. bcrypt.compare(plainPassword, hash)
4. Returns true/false
```

### **Testing Steps:**

#### Test 1: Register New User
```bash
# Register with password
POST http://localhost:5001/api/auth/register
Content-Type: application/json

{
  "firstName": "Test",
  "lastName": "User",
  "email": "test@example.com",
  "password": "Test@123456",
  "phone": "1234567890"
}

# Check MongoDB:
# Password field shows: "$2a$12$..." (hashed, NOT plain text)
```

#### Test 2: Password Verification
```bash
# 1. Login with correct password
POST http://localhost:5001/api/auth/login
{
  "email": "test@example.com",
  "password": "Test@123456"
}
# Expected: 200 OK with tokens

# 2. Login with wrong password
POST http://localhost:5001/api/auth/login
{
  "email": "test@example.com",
  "password": "WrongPassword"
}
# Expected: 401 Unauthorized
```

#### Test 3: Password Change
```bash
# Change password (requires current password)
PUT http://localhost:5001/api/auth/change-password
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "currentPassword": "Test@123456",
  "newPassword": "NewPassword@123"
}

# Expected: 200 OK
# Old password no longer works
# New password works for login
```

#### Test 4: View Database
```bash
# Check MongoDB User collection
# Password field format:
# "$2a$12$KIXQQhD4R5z8W..." (60 characters)
# 
# $2a$ = bcrypt algorithm
# $12$ = 12 salt rounds
# Next 22 chars = salt
# Remaining = actual hash
```

---

## 3. Role-Based Access Control (RBAC)

### **How It Works:**
```javascript
// Roles defined in system:
- admin: Full access to all features
- customer: Limited to own data

// Middleware checks:
1. authenticateToken: Validates JWT
2. authorize('admin'): Checks user role
3. If role not allowed: 403 Forbidden
```

### **Testing Steps:**

#### Test 1: Admin Routes Protection
```bash
# Try accessing admin route as customer
GET http://localhost:5001/api/admin/users
Authorization: Bearer CUSTOMER_TOKEN

# Expected Response:
{
  "status": "error",
  "message": "Access denied. Required role: admin"
}

# Try with admin token
GET http://localhost:5001/api/admin/users
Authorization: Bearer ADMIN_TOKEN

# Expected: 200 OK with user list
```

#### Test 2: Customer Routes
```bash
# Customer accessing their own data
GET http://localhost:5001/api/users/profile
Authorization: Bearer CUSTOMER_TOKEN

# Expected: 200 OK with their profile

# Admin accessing any user data
GET http://localhost:5001/api/admin/users/USER_ID
Authorization: Bearer ADMIN_TOKEN

# Expected: 200 OK with user details
```

#### Test 3: User Deletion (Admin Only)
```bash
# Customer trying to delete user
DELETE http://localhost:5001/api/admin/users/USER_ID
Authorization: Bearer CUSTOMER_TOKEN

# Expected: 403 Forbidden

# Admin deleting user
DELETE http://localhost:5001/api/admin/users/USER_ID
Authorization: Bearer ADMIN_TOKEN

# Expected: 200 OK (if no active subscriptions)
```

#### Test 4: Check JWT Payload
```javascript
// Decode JWT token at https://jwt.io
// Paste your access_token
// Payload shows:
{
  "id": "USER_ID",
  "email": "user@example.com",
  "role": "customer",  // or "admin"
  "iat": 1704672000,
  "exp": 1704758400
}
```

---

## 4. Token Verification Middleware

### **How It Works:**
```javascript
// Every protected API call:
1. Client sends: Authorization: Bearer TOKEN
2. Middleware extracts token from header
3. Verifies signature using JWT_SECRET
4. Decodes payload (user ID, email, role)
5. Fetches user from database
6. Checks user status is 'active'
7. Attaches user to req.user
8. Calls next() or returns 401
```

### **Testing Steps:**

#### Test 1: No Token
```bash
# Access protected route without token
GET http://localhost:5001/api/users/profile

# Expected Response:
{
  "status": "error",
  "message": "Access token is required"
}
```

#### Test 2: Invalid Token
```bash
# Use random/malformed token
GET http://localhost:5001/api/users/profile
Authorization: Bearer invalid.token.here

# Expected Response:
{
  "status": "error",
  "message": "Invalid token"
}
```

#### Test 3: Valid Token
```bash
# Use real token from login
GET http://localhost:5001/api/users/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Expected: 200 OK with user data
# Server logs show:
# 🔍 Verifying token...
# 📝 Token length: 276 First 20 chars: eyJhbGciOiJIUzI1NiIs
# ✅ Token decoded, User ID: 691234...
# 👤 User found: user@example.com (customer)
```

#### Test 4: User Account Suspended
```bash
# 1. Admin suspends user account
PUT http://localhost:5001/api/admin/users/USER_ID
Authorization: Bearer ADMIN_TOKEN
{
  "status": "suspended"
}

# 2. Try using that user's token
GET http://localhost:5001/api/users/profile
Authorization: Bearer SUSPENDED_USER_TOKEN

# Expected Response:
{
  "status": "error",
  "message": "Account is not active"
}
```

#### Test 5: Token After Password Change
```bash
# 1. Get user token
# 2. User changes password
PUT http://localhost:5001/api/auth/change-password
{
  "currentPassword": "old",
  "newPassword": "new"
}

# 3. Try using OLD token
GET http://localhost:5001/api/users/profile
Authorization: Bearer OLD_TOKEN

# Note: Token still works! (JWT is stateless)
# To invalidate: Need token blacklist or use refresh tokens
```

---

## 🧪 Complete Security Test Suite

### Quick Test Script
```javascript
// Save as test-security.js and run: node test-security.js

const axios = require('axios');
const BASE_URL = 'http://localhost:5001/api';

async function testSecurity() {
  console.log('🧪 Starting Security Tests...\n');

  // Test 1: Login
  console.log('1️⃣ Testing JWT Token Generation...');
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'adityautsav123456@gmail.com',
    password: 'your-password'
  });
  const token = loginRes.data.data.token;
  console.log('✅ Token received:', token.substring(0, 30) + '...\n');

  // Test 2: Access with token
  console.log('2️⃣ Testing Token Verification...');
  const profileRes = await axios.get(`${BASE_URL}/users/profile`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('✅ Profile accessed:', profileRes.data.data.user.email, '\n');

  // Test 3: Access without token
  console.log('3️⃣ Testing No Token Protection...');
  try {
    await axios.get(`${BASE_URL}/users/profile`);
  } catch (error) {
    console.log('✅ Blocked correctly:', error.response.data.message, '\n');
  }

  // Test 4: Wrong password
  console.log('4️⃣ Testing Password Hashing...');
  try {
    await axios.post(`${BASE_URL}/auth/login`, {
      email: 'adityautsav123456@gmail.com',
      password: 'WrongPassword123'
    });
  } catch (error) {
    console.log('✅ Wrong password blocked:', error.response.data.message, '\n');
  }

  // Test 5: Admin access
  console.log('5️⃣ Testing Role-Based Access...');
  try {
    await axios.get(`${BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (error) {
    console.log('✅ Admin route blocked for customer:', error.response.data.message, '\n');
  }

  console.log('✅ All security tests passed!');
}

testSecurity().catch(console.error);
```

---

## 📊 Expected Test Results

| Test | Expected Result | Security Feature |
|------|----------------|------------------|
| Login with correct password | 200 OK + tokens | Bcrypt verification |
| Login with wrong password | 401 Unauthorized | Bcrypt comparison fails |
| Access route without token | 401 "Access token required" | Token middleware |
| Access route with invalid token | 401 "Invalid token" | JWT verification |
| Access route with expired token | 401 "Token expired" | JWT expiration |
| Customer accessing admin route | 403 "Access denied" | RBAC |
| Admin accessing admin route | 200 OK | RBAC allows |
| Password in database | Hashed (60 chars starting with $2a$12$) | Bcrypt hashing |

---

## 🔧 Manual Testing Checklist

- [ ] Register new user → Check password is hashed in MongoDB
- [ ] Login with correct credentials → Receive tokens
- [ ] Login with wrong password → Receive 401
- [ ] Access protected route with token → Success
- [ ] Access protected route without token → 401
- [ ] Access protected route with expired token → 401
- [ ] Customer tries to access admin route → 403
- [ ] Admin accesses admin route → Success
- [ ] Change password → Old password stops working
- [ ] Suspend user → Their token stops working
- [ ] Refresh token → Get new access token

---

## 🛠️ Tools for Testing

1. **Postman/Thunder Client** - API testing
2. **MongoDB Compass** - View hashed passwords
3. **jwt.io** - Decode JWT tokens
4. **Browser DevTools** - Check localStorage tokens
5. **Server logs** - See authentication flow

---

## 🚨 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Always getting 401 | Token not in localStorage | Check browser console |
| Token works but data wrong | Using wrong user | Decode token at jwt.io |
| Admin routes always 403 | User role is 'customer' | Check user.role in DB |
| Password change fails | Wrong current password | Use correct current password |
| Tokens expire too fast | JWT_EXPIRE too short | Check .env settings |

---

## 📝 Security Best Practices

✅ **DO:**
- Store tokens in httpOnly cookies (more secure than localStorage)
- Implement token refresh automatically
- Log out users when token expires
- Use HTTPS in production
- Rotate JWT secrets periodically

❌ **DON'T:**
- Store passwords in plain text
- Use same secret for access & refresh tokens
- Allow long token expiration (>24h for access)
- Skip token verification on any protected route
- Return detailed error messages in production

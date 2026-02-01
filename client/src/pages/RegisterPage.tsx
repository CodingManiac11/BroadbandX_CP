import React, { useState } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Link as MuiLink,
  MenuItem,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India',
    },
    agreeToTerms: false,
  });

  const { register, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(isAdmin ? '/admin' : '/dashboard', { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...(formData as any)[parent],
          [child]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value,
      });
    }
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) return 'First name is required';
    if (!formData.lastName.trim()) return 'Last name is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!formData.phone.trim()) return 'Phone number is required';
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 8) return 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    if (!formData.address.street.trim()) return 'Street address is required';
    if (!formData.address.city.trim()) return 'City is required';
    if (!formData.address.state.trim()) return 'State is required';
    if (!formData.address.zipCode.trim()) return 'PIN code is required';
    if (!formData.agreeToTerms) return 'You must agree to the terms and conditions';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      const registerData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        address: formData.address,
        role: 'customer' as const,
      };

      await register(registerData);
      setSuccess('Registration successful! Redirecting to dashboard...');

      // Navigation is handled by useEffect above
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const states = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    // Union Territories
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <Card elevation={8} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h4" component="h1" gutterBottom>
                🌐 BroadbandX
              </Typography>
              <Typography variant="h5" color="text.secondary">
                Create Your Account
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Join thousands of customers enjoying ultra-fast broadband
              </Typography>
            </Box>

            {/* Error/Success Alerts */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit}>
              {/* Personal Information */}
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Personal Information
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
              </Box>
              <TextField
                fullWidth
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                margin="normal"
                required
                disabled={loading}
              />
              <TextField
                fullWidth
                label="Phone Number"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                margin="normal"
                required
                disabled={loading}
                placeholder="+91 98765 43210"
              />

              {/* Password Fields */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Security
              </Typography>
              <TextField
                fullWidth
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                margin="normal"
                required
                disabled={loading}
                helperText="Must be at least 8 characters"
              />
              <TextField
                fullWidth
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                margin="normal"
                required
                disabled={loading}
              />

              {/* Address Information */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Service Address
              </Typography>
              <TextField
                fullWidth
                label="Street Address"
                name="address.street"
                value={formData.address.street}
                onChange={handleInputChange}
                margin="normal"
                required
                disabled={loading}
              />
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <TextField
                  fullWidth
                  label="City"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                />
                <TextField
                  select
                  label="State"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  sx={{ minWidth: 200 }}
                >
                  {states.map((state) => (
                    <MenuItem key={state} value={state}>
                      {state}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="PIN Code"
                  name="address.zipCode"
                  value={formData.address.zipCode}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  placeholder="6-digit PIN"
                  sx={{ minWidth: 120 }}
                />
              </Box>

              {/* Terms and Conditions */}
              <FormControlLabel
                control={
                  <Checkbox
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                }
                label={
                  <Typography variant="body2">
                    I agree to the{' '}
                    <MuiLink href="#" underline="hover">
                      Terms of Service
                    </MuiLink>{' '}
                    and{' '}
                    <MuiLink href="#" underline="hover">
                      Privacy Policy
                    </MuiLink>
                  </Typography>
                }
                sx={{ mt: 2 }}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{ mt: 3, mb: 2, py: 1.5 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Create Account'}
              </Button>
            </form>

            {/* Footer Links */}
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{' '}
                <MuiLink component={Link} to="/login" underline="hover">
                  Sign in here
                </MuiLink>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                <MuiLink component={Link} to="/" underline="hover">
                  ← Back to Home
                </MuiLink>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default RegisterPage;
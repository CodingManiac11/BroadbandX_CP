import React, { useState } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Tab,
  Tabs,
  Alert,
  CircularProgress,
  Link as MuiLink,
} from '@mui/material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const LoginPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customerForm, setCustomerForm] = useState({
    email: '',
    password: '',
  });
  const [adminForm, setAdminForm] = useState({
    email: '',
    password: '',
  });

  const { login, logout, isAuthenticated, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
  React.useEffect(() => {
    console.log('Auth state changed:', { 
      isAuthenticated, 
      isAdmin, 
      user, 
      hasAccessToken: !!localStorage.getItem('access_token'),
      location: location.state
    });
    
    // Check both the context auth state and token existence
    const hasToken = !!localStorage.getItem('access_token');
    
    if (isAuthenticated || hasToken) {
      // Determine where to navigate
      let targetPath;
      
      if (isAdmin) {
        targetPath = '/admin';
      } else if (user?.role === 'customer') {
        targetPath = '/dashboard';
      } else if (hasToken) {
        // If we have a token but no role yet, try to navigate based on from or default to dashboard
        targetPath = (location.state as any)?.from?.pathname || '/dashboard';
      } else {
        targetPath = '/dashboard'; // Default fallback
      }
      
      console.log('Navigating to:', targetPath);
      navigate(targetPath, { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate, location.state, user]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError('');
  };

  const handleCustomerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerForm({
      ...customerForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleAdminInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdminForm({
      ...adminForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent, isAdminLogin: boolean) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = isAdminLogin ? adminForm : customerForm;
    const loginRole = isAdminLogin ? 'admin' : 'customer';
    console.log('Login form submission:', { isAdminLogin, email: formData.email, role: loginRole });

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting login with:', formData.email, 'as', loginRole);
      
      // Clear any previous auth state before login
      if (isAuthenticated) {
        console.log('Clearing previous auth state');
        await logout();
        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Pass the role to ensure portal-specific authentication
      await login(formData.email, formData.password, loginRole);
      console.log('Login successful, checking auth state:', { 
        isAuthenticated, 
        user: user?.email,
        role: user?.role
      });
      
      // Clear form data on successful login
      if (isAdminLogin) {
        setAdminForm({ email: '', password: '' });
      } else {
        setCustomerForm({ email: '', password: '' });
      }
      
      // Navigate based on user role after successful login
      const targetPath = isAdminLogin ? '/admin' : '/dashboard';
      console.log('Navigating to:', targetPath);
      navigate(targetPath, { replace: true });
      
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.message || 'Login failed. Please try again.';
      // Make error message more user-friendly for role mismatch
      if (errorMessage.includes('Invalid credentials for')) {
        setError(isAdminLogin 
          ? 'Invalid admin credentials. Please use the Customer Login if you are a customer.'
          : 'Invalid customer credentials. Please use the Admin Login if you are an admin.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

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
      <Container maxWidth="sm">
        <Card elevation={8} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h4" component="h1" gutterBottom>
                🌐 BroadbandX
              </Typography>
              <Typography variant="h5" color="text.secondary">
                Welcome Back
              </Typography>
            </Box>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
                <Tab label="Customer Login" />
                <Tab label="Admin Login" />
              </Tabs>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Customer Login Form */}
            <TabPanel value={tabValue} index={0}>
              <form onSubmit={(e) => handleSubmit(e, false)}>
                <TextField
                  fullWidth
                  label="Email Address"
                  name="email"
                  type="email"
                  value={customerForm.email}
                  onChange={handleCustomerInputChange}
                  margin="normal"
                  required
                  disabled={loading}
                />
                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type="password"
                  value={customerForm.password}
                  onChange={handleCustomerInputChange}
                  margin="normal"
                  required
                  disabled={loading}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{ mt: 3, mb: 2, py: 1.5 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Sign In as Customer'}
                </Button>
                <Box sx={{ textAlign: 'center', mt: 1 }}>
                  <MuiLink component={RouterLink} to="/forgot-password" variant="body2">
                    Forgot Password?
                  </MuiLink>
                </Box>
              </form>
            </TabPanel>

            {/* Admin Login Form */}
            <TabPanel value={tabValue} index={1}>
              <form onSubmit={(e) => handleSubmit(e, true)}>
                <TextField
                  fullWidth
                  label="Admin Email"
                  name="email"
                  type="email"
                  value={adminForm.email}
                  onChange={handleAdminInputChange}
                  margin="normal"
                  required
                  disabled={loading}
                />
                <TextField
                  fullWidth
                  label="Admin Password"
                  name="password"
                  type="password"
                  value={adminForm.password}
                  onChange={handleAdminInputChange}
                  margin="normal"
                  required
                  disabled={loading}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="secondary"
                  disabled={loading}
                  sx={{ mt: 3, mb: 2, py: 1.5 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Sign In as Admin'}
                </Button>
              </form>
            </TabPanel>

            {/* Footer Links */}
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Don't have an account?{' '}
                <MuiLink component={RouterLink} to="/register" underline="hover">
                  Sign up here
                </MuiLink>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                <MuiLink component={RouterLink} to="/forgot-password" underline="hover">
                  Forgot your password?
                </MuiLink>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                <MuiLink component={RouterLink} to="/" underline="hover">
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

export default LoginPage;
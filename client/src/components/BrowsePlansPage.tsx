import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Speed, Wifi, Router, CheckCircle, Block } from '@mui/icons-material';
import { apiClient, handleApiResponse, handleApiError } from '../services/api';
import { customerService } from '../services/customerService';

const BrowsePlansPage: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlansAndSubscriptions();
  }, []);

  const fetchPlansAndSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Fetching plans and user subscriptions...');
      
      // Fetch plans and user subscriptions in parallel
      const [plansResponse, subscriptionsResponse] = await Promise.all([
        apiClient.get('/plans'),
        customerService.getCustomerSubscriptions()
      ]);
      
      const plansResult = handleApiResponse(plansResponse);
      console.log('📋 Plans fetched:', plansResult);
      
      // Filter only active plans
      const activePlans = (plansResult as any[]).filter((plan: any) => plan.isActive);
      setPlans(activePlans);
      
      // Set user subscriptions
      setUserSubscriptions(subscriptionsResponse.subscriptions || []);
      
      console.log(`✅ ${activePlans.length} active plans loaded`);
      console.log(`👤 ${subscriptionsResponse.subscriptions?.length || 0} user subscriptions found`);
    } catch (err: any) {
      console.error('❌ Error fetching data:', err);
      const errorMessage = handleApiError(err);
      setError(errorMessage || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan: any) => {
    console.log('📦 Plan selected:', plan);
    
    // Check if user already has this plan
    if (isPlanAlreadyTaken(plan._id)) {
      alert('You already have an active subscription to this plan.');
      return;
    }
    
    // Navigate to subscription page or open payment modal
    navigate('/dashboard', { 
      state: { 
        selectedPlan: plan,
        action: 'subscribe'
      } 
    });
  };

  const isPlanAlreadyTaken = (planId: string): boolean => {
    return userSubscriptions.some(subscription => 
      subscription.plan?._id === planId && subscription.status === 'active'
    );
  };

  const hasAnyActiveSubscription = (): boolean => {
    return userSubscriptions.some(subscription => subscription.status === 'active');
  };

  const formatPrice = (price: number) => {
    return `₹${price.toFixed(2)}`;
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'residential': return '#2196f3';
      case 'business': return '#ff9800'; 
      case 'enterprise': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading plans...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchPlansAndSubscriptions}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
          Choose Your Perfect Broadband Plan
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          High-speed internet plans designed for your lifestyle and budget
        </Typography>
        <Divider sx={{ width: '100px', mx: 'auto', bgcolor: '#1976d2', height: 3 }} />
      </Box>

      {plans.length === 0 ? (
        <Alert severity="info">
          No active plans available at the moment. Please check back later.
        </Alert>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
          {plans.map((plan) => (
            <Box key={plan._id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  border: '2px solid transparent',
                  '&:hover': {
                    border: `2px solid ${getCategoryColor(plan.category)}`,
                    transform: 'translateY(-4px)',
                    boxShadow: 3
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                {/* Category Badge */}
                <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
                  <Chip 
                    label={plan.category || 'General'} 
                    size="small"
                    sx={{ 
                      bgcolor: getCategoryColor(plan.category),
                      color: 'white',
                      fontWeight: 'bold',
                      textTransform: 'capitalize'
                    }}
                  />
                </Box>

                <CardContent sx={{ flexGrow: 1, pt: 3 }}>
                  {/* Plan Header */}
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
                      {plan.name}
                    </Typography>
                    
                    {/* Price */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h4" component="span" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                        {formatPrice(plan.pricing?.monthly || 0)}
                      </Typography>
                      <Typography variant="body1" component="span" sx={{ color: 'text.secondary' }}>
                        /month
                      </Typography>
                    </Box>

                    {/* Speed Info */}
                    {plan.features?.speed && (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                        <Speed sx={{ mr: 1, color: '#1976d2' }} />
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {plan.features.speed.download}/{plan.features.speed.upload} {plan.features.speed.unit}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Features List */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                      Plan Features:
                    </Typography>
                    
                    {/* Data Limit */}
                    {plan.features?.dataLimit && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CheckCircle sx={{ mr: 1, color: '#4caf50', fontSize: 16 }} />
                        <Typography variant="body2">
                          {plan.features.dataLimit.unlimited 
                            ? 'Unlimited Data' 
                            : `${plan.features.dataLimit.amount} ${plan.features.dataLimit.unit} Data`
                          }
                        </Typography>
                      </Box>
                    )}

                    {/* Installation */}
                    {plan.features?.installation && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CheckCircle sx={{ mr: 1, color: '#4caf50', fontSize: 16 }} />
                        <Typography variant="body2">
                          {plan.features.installation.free ? 'Free Installation' : 'Installation Available'}
                        </Typography>
                      </Box>
                    )}

                    {/* Support */}
                    {plan.features?.support && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CheckCircle sx={{ mr: 1, color: '#4caf50', fontSize: 16 }} />
                        <Typography variant="body2">
                          {plan.features.support.type} Support {plan.features.support.priority && '(Priority)'}
                        </Typography>
                      </Box>
                    )}

                    {/* OTT Services */}
                    {plan.features?.ottServices && plan.features.ottServices.length > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CheckCircle sx={{ mr: 1, color: '#4caf50', fontSize: 16 }} />
                        <Typography variant="body2">
                          OTT: {plan.features.ottServices.join(', ')}
                        </Typography>
                      </Box>
                    )}

                    {/* WiFi Router */}
                    {plan.features?.wifiRouter && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CheckCircle sx={{ mr: 1, color: '#4caf50', fontSize: 16 }} />
                        <Typography variant="body2">
                          WiFi Router ({plan.features.wifiRouter.type})
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Additional Pricing */}
                  {plan.pricing?.yearly && (
                    <Box sx={{ textAlign: 'center', mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Yearly: {formatPrice(plan.pricing.yearly)} 
                        {plan.pricing.setupFee && ` + ₹${plan.pricing.setupFee} setup`}
                      </Typography>
                    </Box>
                  )}
                </CardContent>

                {/* Action Button */}
                <Box sx={{ p: 2, pt: 0 }}>
                  {isPlanAlreadyTaken(plan._id) ? (
                    <Button
                      variant="outlined"
                      fullWidth
                      size="large"
                      disabled
                      startIcon={<Block />}
                      sx={{
                        borderColor: '#f44336',
                        color: '#f44336',
                        fontWeight: 'bold',
                        py: 1.5
                      }}
                    >
                      Already Taken
                    </Button>
                  ) : hasAnyActiveSubscription() ? (
                    <Button
                      variant="outlined"
                      fullWidth
                      size="large"
                      disabled
                      sx={{
                        borderColor: '#ff9800',
                        color: '#ff9800',
                        fontWeight: 'bold',
                        py: 1.5
                      }}
                    >
                      Active Subscription Exists
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      onClick={() => handleSelectPlan(plan)}
                      sx={{
                        bgcolor: getCategoryColor(plan.category),
                        '&:hover': {
                          bgcolor: getCategoryColor(plan.category),
                          opacity: 0.9
                        },
                        fontWeight: 'bold',
                        py: 1.5
                      }}
                    >
                      Select This Plan
                    </Button>
                  )}
                </Box>
              </Card>
            </Box>
          ))}
        </Box>
      )}

      {/* Summary */}
      <Box sx={{ textAlign: 'center', mt: 4, p: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Found {plans.length} active plans
        </Typography>
        <Typography variant="body2" color="text.secondary">
          All plans include high-speed broadband with reliable connectivity
        </Typography>
      </Box>
    </Box>
  );
};

export default BrowsePlansPage;
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Card, CardContent, Button, Chip, Divider,
  TextField, CircularProgress, Alert, InputAdornment,
  FormControl, Select, MenuItem, InputLabel, Pagination
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Speed, Wifi, Router, Search, FilterList } from '@mui/icons-material';
import { Plan } from '../types/index';
import api from '../services/api';

const PlansPage: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const plansPerPage = 12;

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    filterPlans();
  }, [plans, searchTerm, priceFilter, categoryFilter]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await api.get('/plans?limit=100'); // Get all plans
      console.log('📋 Plans fetched:', response.data);
      
      if (response.data && response.data.status === 'success' && response.data.data?.plans) {
        setPlans(response.data.data.plans);
      } else if (response.data && Array.isArray(response.data)) {
        setPlans(response.data);
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        setPlans(response.data.data);
      } else {
        console.error('Unexpected response format:', response.data);
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('❌ Error fetching plans:', err);
      setError('Failed to fetch plans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterPlans = () => {
    let filtered = plans.filter(plan => {
      const matchesSearch = plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           plan.pricing?.monthly?.toString().includes(searchTerm);
      
      const matchesPrice = priceFilter === 'all' || 
                          (priceFilter === 'low' && (plan.pricing?.monthly || 0) < 50) ||
                          (priceFilter === 'medium' && (plan.pricing?.monthly || 0) >= 50 && (plan.pricing?.monthly || 0) < 80) ||
                          (priceFilter === 'high' && (plan.pricing?.monthly || 0) >= 80);
      
      const matchesCategory = categoryFilter === 'all' || plan.category === categoryFilter;
      
      return matchesSearch && matchesPrice && matchesCategory;
    });
    
    setFilteredPlans(filtered);
    setCurrentPage(1);
  };

  const getPaginatedPlans = () => {
    const startIndex = (currentPage - 1) * plansPerPage;
    const endIndex = startIndex + plansPerPage;
    return filteredPlans.slice(startIndex, endIndex);
  };

  const formatPrice = (price: number) => {
    return `₹${price.toFixed(2)}`;
  };

  const formatSpeed = (plan: Plan) => {
    if (plan.features?.speed) {
      return `${plan.features.speed.download}/${plan.features.speed.upload} ${plan.features.speed.unit}`;
    }
    return 'Speed info not available';
  };

  const getFeatures = (plan: Plan) => {
    const features = [];
    
    if (plan.features?.dataLimit?.unlimited) {
      features.push('Unlimited Data');
    } else if (plan.features?.dataLimit?.amount) {
      features.push(`${plan.features.dataLimit.amount} ${plan.features.dataLimit.unit}`);
    }
    
    if (plan.features?.speed) {
      features.push(`${plan.features.speed.download} ${plan.features.speed.unit} Download`);
    }
    
    if (plan.technicalSpecs?.technology) {
      features.push(`${(plan.technicalSpecs.technology || 'unknown').charAt(0).toUpperCase() + (plan.technicalSpecs.technology || 'unknown').slice(1)} Technology`);
    }
    
    if (plan.technicalSpecs?.reliability) {
      features.push(`${plan.technicalSpecs.reliability}% Uptime`);
    }
    
    if (!plan.technicalSpecs?.installation?.required) {
      features.push('Easy Setup');
    }
    
    return features.slice(0, 4); // Limit to 4 features for display
  };

  const isRecommended = (plan: Plan) => {
    return plan.popularity > 50 || plan.targetAudience === 'families';
  };

  const handleSubscribe = (planId: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    } else {
      // For now, navigate to customer dashboard
      // In the future, you could create a dedicated subscription flow
      alert(`Subscribing to plan: ${planId}`);
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={fetchPlans} sx={{ mt: 2 }}>Retry</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
          Choose Your Perfect Broadband Plan
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          High-speed internet plans designed for your lifestyle and budget
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {filteredPlans.length} plans available
        </Typography>
        <Divider sx={{ width: '100px', mx: 'auto', bgcolor: '#1976d2', height: 3 }} />
      </Box>

      {/* Search and Filter Controls */}
      <Card sx={{ mb: 4, p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Search sx={{ mr: 1, color: '#1976d2' }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Search & Filter Plans
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          <Box sx={{ flex: '1 1 300px' }}>
            <TextField
              fullWidth
              placeholder="Search by plan name or price..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          
          <Box sx={{ flex: '1 1 200px' }}>
            <FormControl fullWidth>
              <InputLabel>Price Range</InputLabel>
              <Select
                value={priceFilter}
                label="Price Range"
                onChange={(e) => setPriceFilter(e.target.value)}
              >
                <MenuItem value="all">All Prices</MenuItem>
                <MenuItem value="low">Under ₹50</MenuItem>
                <MenuItem value="medium">₹50 - ₹80</MenuItem>
                <MenuItem value="high">₹80+</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ flex: '1 1 200px' }}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                label="Category"
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                <MenuItem value="residential">Residential</MenuItem>
                <MenuItem value="business">Business</MenuItem>
                <MenuItem value="enterprise">Enterprise</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ flex: '0 0 150px' }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                setSearchTerm('');
                setPriceFilter('all');
                setCategoryFilter('all');
              }}
              sx={{ height: '56px' }}
            >
              Clear Filters
            </Button>
          </Box>
        </Box>
      </Card>

      {/* Plans Grid */}
      {filteredPlans.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No plans found matching your criteria
          </Typography>
          <Button onClick={() => {
            setSearchTerm('');
            setPriceFilter('all');
            setCategoryFilter('all');
          }} sx={{ mt: 2 }}>
            Clear Filters
          </Button>
        </Box>
      ) : (
        <>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: 3, 
            mb: 4 
          }}>
            {getPaginatedPlans().map((plan) => {
              const recommended = isRecommended(plan);
              const features = getFeatures(plan);
              
              return (
                <Box key={plan._id}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      position: 'relative',
                      transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 12px 20px rgba(0,0,0,0.15)'
                      },
                      border: recommended ? '3px solid #1976d2' : '1px solid #e0e0e0',
                      bgcolor: recommended ? '#f8faff' : '#ffffff'
                    }}
                  >
                    {recommended && (
                      <Chip 
                        label="RECOMMENDED" 
                        color="primary" 
                        size="small"
                        sx={{ 
                          position: 'absolute', 
                          top: -10, 
                          left: '50%', 
                          transform: 'translateX(-50%)',
                          fontWeight: 'bold'
                        }} 
                      />
                    )}
                    
                    <CardContent sx={{ p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ mb: 2 }}>
                        <Speed sx={{ fontSize: 32, color: '#1976d2', mb: 1 }} />
                        <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
                          {plan.name}
                        </Typography>
                        <Chip 
                          label={plan.category?.toUpperCase() || 'GENERAL'} 
                          variant="outlined" 
                          size="small" 
                          sx={{ mb: 1 }}
                        />
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="h4" component="div" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                          {formatPrice(plan.pricing?.monthly || 0)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          /month
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                          <Wifi sx={{ mr: 1, color: '#666', fontSize: 16 }} />
                          <Typography variant="body2" color="text.secondary">
                            {formatSpeed(plan)}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ mb: 3, flexGrow: 1 }}>
                        {features.map((feature, index) => (
                          <Typography key={index} variant="body2" sx={{ mb: 0.5, color: '#555', fontSize: '0.875rem' }}>
                            ✓ {feature}
                          </Typography>
                        ))}
                      </Box>

                      <Button 
                        variant={recommended ? "contained" : "outlined"}
                        fullWidth 
                        size="small"
                        onClick={() => handleSubscribe(plan._id)}
                        sx={{ 
                          py: 1,
                          fontWeight: 'bold',
                          mt: 'auto',
                          ...(recommended && {
                            background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                            boxShadow: '0 3px 5px 2px rgba(25, 118, 210, .3)',
                          })
                        }}
                      >
                        {recommended ? 'Get Started' : 'Choose Plan'}
                      </Button>
                    </CardContent>
                  </Card>
                </Box>
              );
            })}
          </Box>

          {/* Pagination */}
          {filteredPlans.length > plansPerPage && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
              <Pagination
                count={Math.ceil(filteredPlans.length / plansPerPage)}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </>
      )}

      {/* Why Choose Us Section */}
      <Box sx={{ textAlign: 'center', p: 4, bgcolor: '#f8f9fa', borderRadius: 2 }}>
        <Router sx={{ fontSize: 48, color: '#1976d2', mb: 2 }} />
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
          Why Choose Our Broadband?
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 3, 
          justifyContent: 'center',
          mt: 3, 
          mb: 4 
        }}>
          <Box sx={{ flex: '1 1 200px', maxWidth: '300px' }}>
            <Typography variant="h6" gutterBottom>🚀 Lightning Fast</Typography>
            <Typography variant="body2" color="text.secondary">
              Experience blazing fast internet speeds for all your needs
            </Typography>
          </Box>
          <Box sx={{ flex: '1 1 200px', maxWidth: '300px' }}>
            <Typography variant="h6" gutterBottom>💯 99.9% Uptime</Typography>
            <Typography variant="body2" color="text.secondary">
              Reliable connection you can count on 24/7
            </Typography>
          </Box>
          <Box sx={{ flex: '1 1 200px', maxWidth: '300px' }}>
            <Typography variant="h6" gutterBottom>🎯 24/7 Support</Typography>
            <Typography variant="body2" color="text.secondary">
              Expert technical support whenever you need it
            </Typography>
          </Box>
        </Box>
        
        <Box>
          <Button 
            variant="outlined" 
            size="large" 
            onClick={() => navigate('/')}
            sx={{ mr: 2, fontWeight: 'bold' }}
          >
            Back to Home
          </Button>
          <Button 
            variant="contained" 
            size="large"
            onClick={() => navigate('/login')}
            sx={{ fontWeight: 'bold' }}
          >
            Get Started Today
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default PlansPage;
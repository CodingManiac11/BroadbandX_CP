import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Avatar,
  Stack
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { customerService } from '../services/customerService';

const AccountSettingsSimple = () => {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India'
    }
  });

  // Update profileData when user data changes
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || '',
          country: user.address?.country || 'India'
        }
      });
    }
  }, [user]);

  const handleProfileSave = async () => {
    setLoading(true);
    setError('');
    try {
      // Call the actual API to update profile
      const updatedUser = await customerService.updateProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        address: profileData.address
      });
      
      // Update the auth context with the new user data
      updateUser(updatedUser);
      
      setSuccess('Profile updated successfully!');
      setEditing(false);
      
      // Auto-clear success message
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update profile. Please try again.');
      console.error('Profile update error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setProfileData(prev => {
        const parentObj = prev[parent as keyof typeof prev];
        if (typeof parentObj === 'object' && parentObj !== null) {
          return {
            ...prev,
            [parent]: {
              ...parentObj,
              [child]: value
            }
          };
        }
        return prev;
      });
    } else {
      setProfileData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        Account Settings
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Profile Information
            </Typography>
            {!editing ? (
              <Button
                startIcon={<EditIcon />}
                onClick={() => setEditing(true)}
                variant="outlined"
              >
                Edit Profile
              </Button>
            ) : (
              <Box>
                <Button
                  startIcon={<SaveIcon />}
                  onClick={handleProfileSave}
                  variant="contained"
                  disabled={loading}
                  sx={{ mr: 1 }}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  startIcon={<CancelIcon />}
                  onClick={() => setEditing(false)}
                  variant="outlined"
                  disabled={loading}
                >
                  Cancel
                </Button>
              </Box>
            )}
          </Box>

          <Box display="flex" alignItems="center" mb={3}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                mr: 3,
                bgcolor: 'primary.main',
                fontSize: '2rem',
                fontWeight: 'bold'
              }}
            >
              {profileData.firstName?.charAt(0)?.toUpperCase()}{profileData.lastName?.charAt(0)?.toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {profileData.firstName} {profileData.lastName}
              </Typography>
              <Typography color="textSecondary">
                {profileData.email}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
              <TextField
                fullWidth
                label="First Name"
                value={profileData.firstName}
                onChange={(e) => handleProfileChange('firstName', e.target.value)}
                disabled={!editing}
                variant="outlined"
              />
            </Box>
            <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
              <TextField
                fullWidth
                label="Last Name"
                value={profileData.lastName}
                onChange={(e) => handleProfileChange('lastName', e.target.value)}
                disabled={!editing}
                variant="outlined"
              />
            </Box>
            <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
              <TextField
                fullWidth
                label="Email"
                value={profileData.email}
                disabled={true}
                variant="outlined"
                helperText="Email cannot be changed"
              />
            </Box>
            <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
              <TextField
                fullWidth
                label="Phone"
                value={profileData.phone}
                onChange={(e) => handleProfileChange('phone', e.target.value)}
                disabled={!editing}
                variant="outlined"
              />
            </Box>
            
            <Box sx={{ width: '100%', mt: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Address
              </Typography>
            </Box>
            
            <Box sx={{ flex: '1 1 100%', minWidth: '300px' }}>
              <TextField
                fullWidth
                label="Street Address"
                value={profileData.address.street}
                onChange={(e) => handleProfileChange('address.street', e.target.value)}
                disabled={!editing}
                variant="outlined"
              />
            </Box>
            
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <TextField
                fullWidth
                label="City"
                value={profileData.address.city}
                onChange={(e) => handleProfileChange('address.city', e.target.value)}
                disabled={!editing}
                variant="outlined"
              />
            </Box>
            
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <TextField
                fullWidth
                label="State"
                value={profileData.address.state}
                onChange={(e) => handleProfileChange('address.state', e.target.value)}
                disabled={!editing}
                variant="outlined"
              />
            </Box>
            
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <TextField
                fullWidth
                label="ZIP Code"
                value={profileData.address.zipCode}
                onChange={(e) => handleProfileChange('address.zipCode', e.target.value)}
                disabled={!editing}
                variant="outlined"
              />
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AccountSettingsSimple;
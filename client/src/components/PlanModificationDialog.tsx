import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Divider,
  Stack
} from '@mui/material';
import { TrendingUp, TrendingDown, SwapHoriz } from '@mui/icons-material';
import { planRequestService } from '../services/planRequestService';
import { Plan, Subscription } from '../types/index';

interface PlanModificationDialogProps {
  open: boolean;
  onClose: () => void;
  currentSubscription: Subscription | null;
  newPlan: Plan | null;
  onRequestSubmitted: () => void;
}

const PlanModificationDialog: React.FC<PlanModificationDialogProps> = ({
  open,
  onClose,
  currentSubscription,
  newPlan,
  onRequestSubmitted
}) => {
  const [formData, setFormData] = useState({
    customerNotes: '',
    urgency: 'medium',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!currentSubscription || !newPlan) return;

    try {
      setLoading(true);
      setError(null);

      // Determine request type based on plan pricing
      const currentPrice = currentSubscription.plan.pricing.monthly;
      const newPrice = newPlan.pricing.monthly;
      let requestType: 'plan_upgrade' | 'plan_downgrade' | 'plan_change' = 'plan_change';

      if (newPrice > currentPrice) {
        requestType = 'plan_upgrade';
      } else if (newPrice < currentPrice) {
        requestType = 'plan_downgrade';
      }

      await planRequestService.createPlanRequest({
        requestType,
        requestedPlanId: newPlan._id,
        customerNotes: formData.customerNotes || undefined,
        urgency: formData.urgency as 'low' | 'medium' | 'high',
        reason: formData.reason || 'Plan modification request',
        billingCycle: currentSubscription.billingCycle || 'monthly'
      });

      onRequestSubmitted();
      onClose();
      
      // Reset form
      setFormData({
        customerNotes: '',
        urgency: 'medium',
        reason: ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!currentSubscription || !newPlan) return null;

  const currentPrice = currentSubscription.plan.pricing.monthly;
  const newPrice = newPlan.pricing.monthly;
  const priceDifference = newPrice - currentPrice;
  const isUpgrade = priceDifference > 0;
  const isDowngrade = priceDifference < 0;

  const getModificationType = () => {
    if (isUpgrade) return { type: 'Upgrade', icon: <TrendingUp color="success" />, color: 'success.main' };
    if (isDowngrade) return { type: 'Downgrade', icon: <TrendingDown color="warning" />, color: 'warning.main' };
    return { type: 'Change', icon: <SwapHoriz color="primary" />, color: 'primary.main' };
  };

  const modType = getModificationType();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          {modType.icon}
          <Box>
            <Typography variant="h6">
              Request Plan {modType.type}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Submit a request for admin approval
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Important:</strong> All plan modifications require admin approval. 
            Changes will take effect on your next billing cycle once approved.
          </Typography>
        </Alert>

        {/* Plan Comparison */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Plan Comparison
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 2, alignItems: 'center' }}>
              {/* Current Plan */}
              <Card variant="outlined">
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    Current Plan
                  </Typography>
                  <Typography variant="h6" gutterBottom>
                    {currentSubscription.plan.name}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {currentSubscription.plan.features?.speed?.download}Mbps / 
                    {currentSubscription.plan.features?.dataLimit?.unlimited ? ' Unlimited' : ` ${currentSubscription.plan.features?.dataLimit?.amount}${currentSubscription.plan.features?.dataLimit?.unit || 'GB'}`}
                  </Typography>
                  <Typography variant="h6" color="text.primary">
                    ₹{currentPrice.toLocaleString()}/month
                  </Typography>
                </CardContent>
              </Card>

              {/* Arrow */}
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                {modType.icon}
              </Box>

              {/* New Plan */}
              <Card variant="outlined" sx={{ bgcolor: 'primary.50' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    Requested Plan
                  </Typography>
                  <Typography variant="h6" gutterBottom>
                    {newPlan.name}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {newPlan.features.speed?.download}Mbps / 
                    {newPlan.features.dataLimit?.unlimited ? ' Unlimited' : ` ${newPlan.features.dataLimit?.amount}${newPlan.features.dataLimit?.unit || 'GB'}`}
                  </Typography>
                  <Typography variant="h6" color="primary">
                    ₹{newPrice.toLocaleString()}/month
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {/* Price Difference */}
            <Divider sx={{ my: 2 }} />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Monthly Price Change
              </Typography>
              <Typography 
                variant="h5" 
                color={isUpgrade ? 'error.main' : isDowngrade ? 'success.main' : 'text.primary'}
              >
                {priceDifference > 0 ? '+' : ''}₹{priceDifference.toLocaleString()}
              </Typography>
              {isUpgrade && (
                <Typography variant="body2" color="text.secondary">
                  Additional charge per month
                </Typography>
              )}
              {isDowngrade && (
                <Typography variant="body2" color="text.secondary">
                  Savings per month
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Priority/Urgency */}
          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={formData.urgency}
              label="Priority"
              onChange={(e) => handleInputChange('urgency', e.target.value)}
            >
              <MenuItem value="low">
                Low - Standard processing (5-7 business days)
              </MenuItem>
              <MenuItem value="medium">
                Medium - Priority processing (2-3 business days)
              </MenuItem>
              <MenuItem value="high">
                High - Urgent processing (Within 24 hours)
              </MenuItem>
            </Select>
          </FormControl>

          {/* Reason */}
          <TextField
            label="Reason for Modification"
            multiline
            rows={2}
            value={formData.reason}
            onChange={(e) => handleInputChange('reason', e.target.value)}
            placeholder={
              isUpgrade 
                ? "e.g., Need faster speeds for work, more data usage required..." 
                : "e.g., Reducing costs, current plan features not needed..."
            }
            fullWidth
            required
          />

          {/* Additional Notes */}
          <TextField
            label="Additional Notes (Optional)"
            multiline
            rows={3}
            value={formData.customerNotes}
            onChange={(e) => handleInputChange('customerNotes', e.target.value)}
            placeholder="Any additional information you'd like to share with the admin..."
            fullWidth
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !formData.reason.trim()}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlanModificationDialog;
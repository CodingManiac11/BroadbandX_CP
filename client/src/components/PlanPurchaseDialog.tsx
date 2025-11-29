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
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import { planRequestService } from '../services/planRequestService';
import { Plan } from '../types/index';

interface PlanPurchaseDialogProps {
  open: boolean;
  onClose: () => void;
  plan: Plan | null;
  onRequestSubmitted: () => void;
}

const PlanPurchaseDialog: React.FC<PlanPurchaseDialogProps> = ({
  open,
  onClose,
  plan,
  onRequestSubmitted
}) => {
  const [formData, setFormData] = useState({
    billingCycle: 'monthly',
    customerNotes: '',
    urgency: 'medium',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!plan) return;

    try {
      setLoading(true);
      setError(null);

      await planRequestService.createPlanRequest({
        requestType: 'new_subscription',
        requestedPlanId: plan._id,
        billingCycle: formData.billingCycle as 'monthly' | 'yearly',
        customerNotes: formData.customerNotes || undefined,
        urgency: formData.urgency as 'low' | 'medium' | 'high',
        reason: formData.reason || 'New subscription request'
      });

      onRequestSubmitted();
      onClose();
      
      // Reset form
      setFormData({
        billingCycle: 'monthly',
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

  if (!plan) return null;

  const monthlyPrice = plan.pricing.monthly;
  const yearlyPrice = plan.pricing.yearly || monthlyPrice * 12 * 0.9; // 10% discount for yearly
  const currentPrice = formData.billingCycle === 'yearly' ? yearlyPrice : monthlyPrice;
  const savings = formData.billingCycle === 'yearly' ? (monthlyPrice * 12 - yearlyPrice) : 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Request Plan Subscription
        <Typography variant="body2" color="text.secondary">
          Submit a request for admin approval
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Important:</strong> All plan subscriptions require admin approval. 
            You'll receive a notification once your request is reviewed.
          </Typography>
        </Alert>

        {/* Plan Summary */}
        <Card sx={{ mb: 3, bgcolor: 'primary.50' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {plan.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {plan.description}
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2">
                  <strong>Speed:</strong> {plan.features.speed?.download}Mbps down / {plan.features.speed?.upload}Mbps up
                </Typography>
                <Typography variant="body2">
                  <strong>Data:</strong> {plan.features.dataLimit?.unlimited ? 'Unlimited' : `${plan.features.dataLimit?.amount}${plan.features.dataLimit?.unit || 'GB'}/month`}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h5" color="primary">
                  ₹{currentPrice.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  per {formData.billingCycle === 'yearly' ? 'year' : 'month'}
                </Typography>
                {savings > 0 && (
                  <Typography variant="body2" color="success.main">
                    Save ₹{savings.toLocaleString()}/year
                  </Typography>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Billing Cycle */}
          <FormControl fullWidth>
            <InputLabel>Billing Cycle</InputLabel>
            <Select
              value={formData.billingCycle}
              label="Billing Cycle"
              onChange={(e) => handleInputChange('billingCycle', e.target.value)}
            >
              <MenuItem value="monthly">
                Monthly - ₹{monthlyPrice.toLocaleString()}/month
              </MenuItem>
              <MenuItem value="yearly">
                Yearly - ₹{yearlyPrice.toLocaleString()}/year 
                {savings > 0 && (
                  <Typography variant="body2" color="success.main" sx={{ ml: 1 }}>
                    (Save ₹{savings.toLocaleString()})
                  </Typography>
                )}
              </MenuItem>
            </Select>
          </FormControl>

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
            label="Reason for Request (Optional)"
            multiline
            rows={2}
            value={formData.reason}
            onChange={(e) => handleInputChange('reason', e.target.value)}
            placeholder="e.g., Need faster internet for work from home, current plan is insufficient..."
            fullWidth
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
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlanPurchaseDialog;
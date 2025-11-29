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
  Stack,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import { Warning, Cancel } from '@mui/icons-material';
import { planRequestService } from '../services/planRequestService';
import { Subscription } from '../types/index';

interface SubscriptionCancellationDialogProps {
  open: boolean;
  onClose: () => void;
  subscription: Subscription | null;
  onRequestSubmitted: () => void;
}

const SubscriptionCancellationDialog: React.FC<SubscriptionCancellationDialogProps> = ({
  open,
  onClose,
  subscription,
  onRequestSubmitted
}) => {
  const [formData, setFormData] = useState({
    reason: '',
    customerNotes: '',
    urgency: 'medium',
    confirmUnderstanding: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!subscription) return;

    try {
      setLoading(true);
      setError(null);

      await planRequestService.createPlanRequest({
        requestType: 'cancel_subscription',
        customerNotes: formData.customerNotes || undefined,
        urgency: formData.urgency as 'low' | 'medium' | 'high',
        reason: formData.reason,
        billingCycle: subscription.billingCycle || 'monthly'
      });

      onRequestSubmitted();
      onClose();
      
      // Reset form
      setFormData({
        reason: '',
        customerNotes: '',
        urgency: 'medium',
        confirmUnderstanding: false
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!subscription) return null;

  const cancellationReasons = [
    'Moving to a different location',
    'Switching to another provider',
    'Cost concerns',
    'Service quality issues',
    'No longer need internet service',
    'Downgrading to a different plan',
    'Technical issues not resolved',
    'Other'
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Warning color="warning" />
          <Box>
            <Typography variant="h6">
              Request Subscription Cancellation
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Submit a cancellation request for admin approval
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

        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Important:</strong> Cancellation requests require admin approval. 
            Your service will remain active until the request is approved and processed.
          </Typography>
        </Alert>

        {/* Subscription Summary */}
        <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Subscription to Cancel
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">Plan</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {subscription.plan.name}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Monthly Cost</Typography>
                <Typography variant="body1" fontWeight="medium">
                  ₹{subscription.plan.pricing.monthly.toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Billing Cycle</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {subscription.billingCycle || 'Monthly'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {subscription.status}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />
            
            <Alert severity="info" variant="outlined">
              <Typography variant="body2">
                <strong>Next billing date:</strong> {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : 'Not specified'}
                <br />
                <strong>Service will continue until:</strong> End of current billing period (after approval)
              </Typography>
            </Alert>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Cancellation Reason */}
          <FormControl fullWidth required>
            <InputLabel>Reason for Cancellation</InputLabel>
            <Select
              value={formData.reason}
              label="Reason for Cancellation"
              onChange={(e) => handleInputChange('reason', e.target.value)}
            >
              {cancellationReasons.map((reason) => (
                <MenuItem key={reason} value={reason}>
                  {reason}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Priority/Urgency */}
          <FormControl fullWidth>
            <InputLabel>Urgency</InputLabel>
            <Select
              value={formData.urgency}
              label="Urgency"
              onChange={(e) => handleInputChange('urgency', e.target.value)}
            >
              <MenuItem value="low">
                Low - Standard processing (Cancel at end of billing cycle)
              </MenuItem>
              <MenuItem value="medium">
                Medium - Process within 5-7 business days
              </MenuItem>
              <MenuItem value="high">
                High - Urgent cancellation (Process within 24-48 hours)
              </MenuItem>
            </Select>
          </FormControl>

          {/* Additional Details */}
          <TextField
            label="Additional Details"
            multiline
            rows={4}
            value={formData.customerNotes}
            onChange={(e) => handleInputChange('customerNotes', e.target.value)}
            placeholder="Please provide any additional information about your cancellation request. If you're experiencing issues, please describe them - our admin team may be able to help resolve them."
            fullWidth
          />

          {/* Terms Understanding */}
          <Card variant="outlined">
            <CardContent sx={{ bgcolor: 'warning.50' }}>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Cancellation Terms & Conditions</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                • Service will remain active until the end of your current billing period<br />
                • Any paid amounts for the current period are non-refundable<br />
                • Early termination fees may apply depending on your contract terms<br />
                • Equipment return may be required within 30 days<br />
                • You can reactivate your service anytime by contacting support
              </Typography>
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.confirmUnderstanding}
                    onChange={(e) => handleInputChange('confirmUnderstanding', e.target.checked)}
                    color="warning"
                  />
                }
                label="I understand and agree to the cancellation terms"
              />
            </CardContent>
          </Card>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={onClose} disabled={loading}>
          Keep Subscription
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={handleSubmit}
          disabled={loading || !formData.reason || !formData.confirmUnderstanding}
          startIcon={loading ? <CircularProgress size={16} /> : <Cancel />}
        >
          {loading ? 'Submitting...' : 'Submit Cancellation Request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SubscriptionCancellationDialog;
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  TextField,
  Box,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import {
  billingService,
  BillingSubscription,
  CancelSubscriptionRequest
} from '../../services/billingService';

interface CancelSubscriptionDialogProps {
  open: boolean;
  onClose: () => void;
  subscription: BillingSubscription;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export const CancelSubscriptionDialog: React.FC<CancelSubscriptionDialogProps> = ({
  open,
  onClose,
  subscription,
  onSuccess,
  onError
}) => {
  const [effectiveOption, setEffectiveOption] = useState<'immediate' | 'end_of_billing_cycle'>('end_of_billing_cycle');
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleCancel = async () => {
    if (confirmText !== 'CANCEL') {
      onError('Please type CANCEL to confirm cancellation');
      return;
    }

    try {
      setProcessing(true);

      const cancelRequest: CancelSubscriptionRequest = {
        effective: effectiveOption,
        ...(effectiveOption === 'end_of_billing_cycle' && {
          effectiveDate: subscription.currentPeriodEnd
        }),
        ...(reason && { reason })
      };

      await billingService.cancelSubscription(cancelRequest);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      onError(error.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setEffectiveOption('end_of_billing_cycle');
    setReason('');
    setConfirmText('');
    onClose();
  };

  const getRefundAmount = () => {
    if (effectiveOption === 'immediate') {
      const now = new Date();
      const periodStart = new Date(subscription.currentPeriodStart);
      const periodEnd = new Date(subscription.currentPeriodEnd);
      
      const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
      const usedDays = Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
      const remainingDays = Math.max(0, totalDays - usedDays);
      
      const refundAmount = Math.round((subscription.planId.price * remainingDays) / totalDays);
      return refundAmount;
    }
    return 0;
  };

  const refundAmount = getRefundAmount();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <CancelIcon color="error" sx={{ mr: 1 }} />
          Cancel Subscription
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Are you sure you want to cancel your subscription?
          </Typography>
          <Typography variant="body2">
            You're currently on the <strong>{subscription.planId.name}</strong> plan. 
            This action cannot be undone, but you can reactivate your subscription later.
          </Typography>
        </Alert>

        <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
          <FormLabel component="legend">When should the cancellation take effect?</FormLabel>
          <RadioGroup
            value={effectiveOption}
            onChange={(e) => setEffectiveOption(e.target.value as 'immediate' | 'end_of_billing_cycle')}
          >
            <FormControlLabel
              value="end_of_billing_cycle"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2">
                    <strong>At the end of current billing cycle</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Your subscription will remain active until {billingService.formatDate(subscription.currentPeriodEnd)}
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="immediate"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2">
                    <strong>Immediately</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Your subscription will be canceled right now
                    {refundAmount > 0 && ` with a refund of ${billingService.formatCents(refundAmount)}`}
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>

        {effectiveOption === 'immediate' && refundAmount > 0 && (
          <Alert severity="info" icon={<ScheduleIcon />} sx={{ mb: 3 }}>
            <Typography variant="body2">
              You will receive a refund of <strong>{billingService.formatCents(refundAmount)}</strong> for the unused portion 
              of your current billing cycle.
            </Typography>
          </Alert>
        )}

        {effectiveOption === 'end_of_billing_cycle' && (
          <Alert severity="info" icon={<ScheduleIcon />} sx={{ mb: 3 }}>
            <Typography variant="body2">
              Your subscription will remain active until <strong>{billingService.formatDate(subscription.currentPeriodEnd)}</strong>. 
              You can continue to use all features until then.
            </Typography>
          </Alert>
        )}

        <TextField
          fullWidth
          multiline
          rows={3}
          label="Reason for cancellation (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Help us improve by telling us why you're canceling..."
          sx={{ mb: 3 }}
        />

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            To confirm cancellation, please type <strong>CANCEL</strong> below:
          </Typography>
          <TextField
            fullWidth
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            placeholder="Type CANCEL"
            error={confirmText !== '' && confirmText !== 'CANCEL'}
            helperText={confirmText !== '' && confirmText !== 'CANCEL' ? 'Please type CANCEL exactly' : ''}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          Keep Subscription
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleCancel}
          disabled={confirmText !== 'CANCEL' || processing}
        >
          {processing ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Canceling...
            </>
          ) : (
            'Cancel Subscription'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CancelSubscriptionDialog;
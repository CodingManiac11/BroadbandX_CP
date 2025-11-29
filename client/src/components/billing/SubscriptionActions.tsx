import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Stack,
  Chip
} from '@mui/material';
import {
  PlayArrow as ReactivateIcon,
  Schedule as ScheduleIcon,
  Cancel as CancelIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import {
  BillingSubscription,
  billingService
} from '../../services/billingService';
import PlanChangeDialog from './PlanChangeDialog';
import CancelSubscriptionDialog from './CancelSubscriptionDialog';

interface SubscriptionActionsProps {
  subscription: BillingSubscription;
  onUpdate: () => void;
  onError: (error: string) => void;
}

export const SubscriptionActions: React.FC<SubscriptionActionsProps> = ({
  subscription,
  onUpdate,
  onError
}) => {
  const [planChangeOpen, setPlanChangeOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  const handleReactivate = async () => {
    try {
      setReactivating(true);
      await billingService.reactivateSubscription();
      onUpdate();
    } catch (error: any) {
      console.error('Error reactivating subscription:', error);
      onError(error.response?.data?.message || 'Failed to reactivate subscription');
    } finally {
      setReactivating(false);
    }
  };

  const getSubscriptionStatusInfo = () => {
    switch (subscription.status) {
      case 'active':
        return {
          color: 'success' as const,
          message: 'Your subscription is active and all features are available.',
          showActions: true
        };
      case 'cancelled':
        return {
          color: 'error' as const,
          message: 'Your subscription has been cancelled. You can reactivate it at any time.',
          showActions: false
        };
      case 'past_due':
        return {
          color: 'warning' as const,
          message: 'Your payment is past due. Please update your payment method to continue service.',
          showActions: true
        };
      case 'trial':
        return {
          color: 'info' as const,
          message: 'You are currently on a trial subscription.',
          showActions: true
        };
      default:
        return {
          color: 'info' as const,
          message: 'Unknown subscription status.',
          showActions: false
        };
    }
  };

  const statusInfo = getSubscriptionStatusInfo();

  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Subscription Management
          </Typography>

          <Alert severity={statusInfo.color} sx={{ mb: 3 }}>
            {statusInfo.message}
          </Alert>

          {/* Scheduled Changes Alert */}
          {subscription.scheduledChanges && (
            <Alert 
              severity="info" 
              icon={<ScheduleIcon />}
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small">
                  Cancel Change
                </Button>
              }
            >
              <Typography variant="subtitle2" gutterBottom>
                Scheduled Plan Change
              </Typography>
              <Typography variant="body2">
                Your plan will {subscription.scheduledChanges.type} on {billingService.formatDate(subscription.scheduledChanges.effectiveDate)}
              </Typography>
            </Alert>
          )}

          {/* Cancellation Scheduled Alert */}
          {subscription.cancellationScheduled && (
            <Alert 
              severity="warning" 
              icon={<CancelIcon />}
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={handleReactivate}>
                  Reactivate
                </Button>
              }
            >
              <Typography variant="subtitle2" gutterBottom>
                Cancellation Scheduled
              </Typography>
              <Typography variant="body2">
                Your subscription will end on {billingService.formatDate(subscription.cancellationScheduled.effectiveDate)}
                {subscription.cancellationScheduled.reason && (
                  <>
                    <br />
                    <Typography component="span" variant="caption">
                      Reason: {subscription.cancellationScheduled.reason}
                    </Typography>
                  </>
                )}
              </Typography>
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Current Plan Info */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Current Plan
                </Typography>
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="h6">{subscription.planId.name}</Typography>
                    <Typography variant="body1" color="primary">
                      {billingService.formatCents(subscription.planId.price)}/{subscription.planId.billingCycle}
                    </Typography>
                  </Box>
                  <Box>
                    <Chip 
                      label={subscription.status.replace('_', ' ').toUpperCase()}
                      color={statusInfo.color}
                      size="small"
                    />
                  </Box>
                </Stack>
              </Box>
            </Grid>

            {/* Actions */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Actions
                </Typography>
                <Stack spacing={1}>
                  {subscription.status === 'cancelled' ? (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={reactivating ? <CircularProgress size={20} /> : <ReactivateIcon />}
                      onClick={handleReactivate}
                      disabled={reactivating}
                      fullWidth
                    >
                      {reactivating ? 'Reactivating...' : 'Reactivate Subscription'}
                    </Button>
                  ) : (
                    <>
                      {statusInfo.showActions && (
                        <>
                          <Button
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => setPlanChangeOpen(true)}
                            disabled={!!subscription.scheduledChanges}
                            fullWidth
                          >
                            Change Plan
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            startIcon={<CancelIcon />}
                            onClick={() => setCancelDialogOpen(true)}
                            disabled={!!subscription.cancellationScheduled}
                            fullWidth
                          >
                            Cancel Subscription
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Plan Change Dialog */}
      <PlanChangeDialog
        open={planChangeOpen}
        onClose={() => setPlanChangeOpen(false)}
        currentSubscription={subscription}
        onSuccess={() => {
          onUpdate();
          setPlanChangeOpen(false);
        }}
        onError={onError}
      />

      {/* Cancel Subscription Dialog */}
      <CancelSubscriptionDialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        subscription={subscription}
        onSuccess={() => {
          onUpdate();
          setCancelDialogOpen(false);
        }}
        onError={onError}
      />
    </Box>
  );
};

export default SubscriptionActions;
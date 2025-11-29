import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  Alert,
  CircularProgress,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Check as CheckIcon,
  TrendingUp as UpgradeIcon,
  TrendingDown as DowngradeIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import {
  billingService,
  BillingPlan,
  BillingSubscription,
  ChangePlanRequest
} from '../../services/billingService';

interface PlanChangeDialogProps {
  open: boolean;
  onClose: () => void;
  currentSubscription: BillingSubscription;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export const PlanChangeDialog: React.FC<PlanChangeDialogProps> = ({
  open,
  onClose,
  currentSubscription,
  onSuccess,
  onError
}) => {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [effectiveOption, setEffectiveOption] = useState<'immediate' | 'next_billing_cycle'>('immediate');
  const [processing, setProcessing] = useState(false);
  const [prorationPreview, setProrationPreview] = useState<{
    show: boolean;
    credit?: number;
    charge?: number;
    effectiveDate?: string;
  }>({ show: false });

  useEffect(() => {
    if (open) {
      fetchPlans();
    }
  }, [open]);

  useEffect(() => {
    if (selectedPlan && effectiveOption === 'immediate') {
      // In a real implementation, you might want to fetch proration preview from the server
      calculateProrationPreview();
    } else {
      setProrationPreview({ show: false });
    }
  }, [selectedPlan, effectiveOption]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const plansData = await billingService.getPlans();
      setPlans(plansData.filter(plan => plan.status === 'active'));
    } catch (error) {
      console.error('Error fetching plans:', error);
      onError('Failed to load available plans');
    } finally {
      setLoading(false);
    }
  };

  const calculateProrationPreview = () => {
    const selectedPlanData = plans.find(plan => plan._id === selectedPlan);
    if (!selectedPlanData || !currentSubscription.proration) {
      setProrationPreview({ show: false });
      return;
    }

    const currentPlanPrice = currentSubscription.planId.price;
    const newPlanPrice = selectedPlanData.price;
    const priceDiff = newPlanPrice - currentPlanPrice;
    
    // This is a simplified calculation - the real calculation would come from the server
    const daysRemaining = Math.ceil(
      (new Date(currentSubscription.currentPeriodEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalDays = Math.ceil(
      (new Date(currentSubscription.currentPeriodEnd).getTime() - new Date(currentSubscription.currentPeriodStart).getTime()) / (1000 * 60 * 60 * 24)
    );

    const proratedAmount = Math.round((priceDiff * daysRemaining) / totalDays);

    setProrationPreview({
      show: true,
      credit: proratedAmount < 0 ? Math.abs(proratedAmount) : 0,
      charge: proratedAmount > 0 ? proratedAmount : 0,
      effectiveDate: new Date().toISOString()
    });
  };

  const handlePlanChange = async () => {
    if (!selectedPlan) return;

    try {
      setProcessing(true);

      const changeRequest: ChangePlanRequest = {
        newPlanId: selectedPlan,
        effective: effectiveOption,
        ...(effectiveOption === 'next_billing_cycle' && {
          effectiveDate: currentSubscription.currentPeriodEnd
        })
      };

      await billingService.changePlan(changeRequest);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error changing plan:', error);
      onError(error.response?.data?.message || 'Failed to change plan');
    } finally {
      setProcessing(false);
    }
  };

  const getChangeType = (newPlan: BillingPlan): 'upgrade' | 'downgrade' | 'same' => {
    if (newPlan.price > currentSubscription.planId.price) return 'upgrade';
    if (newPlan.price < currentSubscription.planId.price) return 'downgrade';
    return 'same';
  };

  const handleClose = () => {
    setSelectedPlan('');
    setEffectiveOption('immediate');
    setProrationPreview({ show: false });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Change Your Plan</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              You're currently on the <strong>{currentSubscription.planId.name}</strong> plan 
              ({billingService.formatCents(currentSubscription.planId.price)}/{currentSubscription.planId.billingCycle})
            </Alert>

            <Typography variant="h6" gutterBottom>
              Select New Plan
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {plans.map((plan) => {
                const changeType = getChangeType(plan);
                const isCurrentPlan = plan._id === currentSubscription.planId._id;
                
                return (
                  <Grid size={{ xs: 12, md: 6 }} key={plan._id}>
                    <Card 
                      variant={selectedPlan === plan._id ? "outlined" : "elevation"}
                      sx={{ 
                        height: '100%',
                        cursor: isCurrentPlan ? 'default' : 'pointer',
                        bgcolor: selectedPlan === plan._id ? 'action.selected' : 'background.paper',
                        opacity: isCurrentPlan ? 0.5 : 1,
                        borderColor: selectedPlan === plan._id ? 'primary.main' : 'divider',
                        borderWidth: selectedPlan === plan._id ? 2 : 1
                      }}
                      onClick={() => !isCurrentPlan && setSelectedPlan(plan._id)}
                    >
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                          <Typography variant="h6">
                            {plan.name}
                          </Typography>
                          {isCurrentPlan ? (
                            <Chip label="Current" color="primary" size="small" />
                          ) : (
                            <Chip 
                              icon={changeType === 'upgrade' ? <UpgradeIcon /> : 
                                   changeType === 'downgrade' ? <DowngradeIcon /> : undefined}
                              label={changeType === 'upgrade' ? 'Upgrade' : 
                                   changeType === 'downgrade' ? 'Downgrade' : 'Same Price'}
                              color={changeType === 'upgrade' ? 'success' : 
                                   changeType === 'downgrade' ? 'warning' : 'info'}
                              size="small"
                            />
                          )}
                        </Box>
                        
                        <Typography variant="h5" color="primary" gutterBottom>
                          {billingService.formatCents(plan.price)}
                          <Typography component="span" variant="body2" color="text.secondary">
                            /{plan.billingCycle}
                          </Typography>
                        </Typography>

                        <List dense>
                          {plan.features.map((feature, index) => (
                            <ListItem key={index} disableGutters>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <CheckIcon color="success" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText 
                                primary={feature}
                                primaryTypographyProps={{ variant: 'body2' }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            {selectedPlan && (
              <Box>
                <Divider sx={{ mb: 2 }} />
                
                <FormControl component="fieldset" sx={{ mb: 2 }}>
                  <FormLabel component="legend">When should this change take effect?</FormLabel>
                  <RadioGroup
                    value={effectiveOption}
                    onChange={(e) => setEffectiveOption(e.target.value as 'immediate' | 'next_billing_cycle')}
                  >
                    <FormControlLabel
                      value="immediate"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="body2">
                            <strong>Immediately</strong>
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Change will be effective right now with proration
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      value="next_billing_cycle"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="body2">
                            <strong>Next billing cycle</strong>
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Change will be effective on {billingService.formatDate(currentSubscription.currentPeriodEnd)}
                          </Typography>
                        </Box>
                      }
                    />
                  </RadioGroup>
                </FormControl>

                {prorationPreview.show && effectiveOption === 'immediate' && (
                  <Alert 
                    severity={prorationPreview.charge ? "warning" : "info"} 
                    icon={<ScheduleIcon />}
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="subtitle2" gutterBottom>
                      Proration Details
                    </Typography>
                    {prorationPreview.credit && prorationPreview.credit > 0 && (
                      <Typography variant="body2">
                        You will receive a credit of <strong>{billingService.formatCents(prorationPreview.credit)}</strong> for the unused portion of your current plan.
                      </Typography>
                    )}
                    {prorationPreview.charge && prorationPreview.charge > 0 && (
                      <Typography variant="body2">
                        You will be charged <strong>{billingService.formatCents(prorationPreview.charge)}</strong> for the remaining period on the new plan.
                      </Typography>
                    )}
                  </Alert>
                )}

                {effectiveOption === 'next_billing_cycle' && (
                  <Alert severity="info" icon={<ScheduleIcon />} sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      Your plan will change to <strong>{plans.find(p => p._id === selectedPlan)?.name}</strong> on {billingService.formatDate(currentSubscription.currentPeriodEnd)}. 
                      You can cancel this scheduled change at any time before it takes effect.
                    </Typography>
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handlePlanChange}
          disabled={!selectedPlan || processing || loading}
        >
          {processing ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Processing...
            </>
          ) : (
            `Change Plan`
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PlanChangeDialog;
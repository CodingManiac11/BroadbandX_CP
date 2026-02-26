import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Alert,
    AlertTitle,
    Stack,
    Chip,
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    Warning as WarningIcon,
    ErrorOutline as ErrorIcon,
    AccessTime as TimeIcon,
    Refresh as RenewIcon,
    Block as BlockIcon,
} from '@mui/icons-material';

interface ExpiryBannerProps {
    subscriptionStatus: string;
    endDate?: string;
    gracePeriodEnd?: string;
    planName?: string;
    amount?: number;
    onRenew?: () => void;
}

const ExpiryBanner: React.FC<ExpiryBannerProps> = ({
    subscriptionStatus,
    endDate,
    gracePeriodEnd,
    planName,
    amount,
    onRenew,
}) => {
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [daysLeft, setDaysLeft] = useState<number>(0);

    useEffect(() => {
        if (subscriptionStatus === 'grace_period' && gracePeriodEnd) {
            const updateTimer = () => {
                const now = new Date();
                const end = new Date(gracePeriodEnd);
                const diff = end.getTime() - now.getTime();

                if (diff <= 0) {
                    setTimeLeft('Expired');
                    setDaysLeft(0);
                    return;
                }

                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

                setDaysLeft(days);
                if (days > 0) {
                    setTimeLeft(`${days}d ${hours}h ${minutes}m`);
                } else {
                    setTimeLeft(`${hours}h ${minutes}m`);
                }
            };

            updateTimer();
            const interval = setInterval(updateTimer, 60000); // Update every minute
            return () => clearInterval(interval);
        }
    }, [subscriptionStatus, gracePeriodEnd]);

    // Don't show anything for active or cancelled subscriptions
    if (subscriptionStatus === 'active' || subscriptionStatus === 'cancelled') {
        return null;
    }

    // ========================
    // GRACE PERIOD BANNER
    // ========================
    if (subscriptionStatus === 'grace_period') {
        const progressValue = gracePeriodEnd
            ? Math.max(0, Math.min(100, ((3 - daysLeft) / 3) * 100))
            : 50;

        return (
            <Paper
                elevation={4}
                sx={{
                    mb: 3,
                    overflow: 'hidden',
                    borderRadius: 2,
                    border: '2px solid #f59e0b',
                    animation: 'pulse-border 2s ease-in-out infinite',
                    '@keyframes pulse-border': {
                        '0%, 100%': { borderColor: '#f59e0b' },
                        '50%': { borderColor: '#ef4444' },
                    },
                }}
            >
                {/* Progress bar showing time remaining */}
                <LinearProgress
                    variant="determinate"
                    value={progressValue}
                    sx={{
                        height: 4,
                        bgcolor: '#fef3c7',
                        '& .MuiLinearProgress-bar': {
                            bgcolor: daysLeft <= 1 ? '#ef4444' : '#f59e0b',
                            transition: 'width 1s ease-in-out',
                        },
                    }}
                />

                <Box
                    sx={{
                        p: 3,
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(239, 68, 68, 0.08) 100%)',
                    }}
                >
                    <Stack direction="row" alignItems="flex-start" spacing={2}>
                        <WarningIcon
                            sx={{
                                fontSize: 40,
                                color: '#f59e0b',
                                mt: 0.5,
                                animation: 'bounce 1s ease-in-out infinite',
                                '@keyframes bounce': {
                                    '0%, 100%': { transform: 'translateY(0)' },
                                    '50%': { transform: 'translateY(-4px)' },
                                },
                            }}
                        />

                        <Box sx={{ flex: 1 }}>
                            <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#92400e' }}>
                                    Your Plan Has Expired
                                </Typography>
                                <Chip
                                    label="Grace Period"
                                    size="small"
                                    sx={{
                                        bgcolor: '#fef3c7',
                                        color: '#92400e',
                                        fontWeight: 600,
                                        fontSize: '0.7rem',
                                    }}
                                />
                            </Stack>

                            <Typography variant="body2" sx={{ color: '#78350f', mb: 1.5 }}>
                                Your <strong>{planName || 'subscription'}</strong> expired on{' '}
                                <strong>{endDate ? new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</strong>.
                                Service will continue for a limited time.
                            </Typography>

                            <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <TimeIcon sx={{ fontSize: 18, color: daysLeft <= 1 ? '#ef4444' : '#f59e0b' }} />
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontWeight: 700,
                                            color: daysLeft <= 1 ? '#ef4444' : '#92400e',
                                            fontSize: '0.95rem',
                                        }}
                                    >
                                        {timeLeft} remaining
                                    </Typography>
                                </Stack>

                                {amount && (
                                    <Typography variant="body2" sx={{ color: '#78350f' }}>
                                        Renewal: <strong>₹{amount}</strong>
                                    </Typography>
                                )}

                                <Button
                                    variant="contained"
                                    size="medium"
                                    startIcon={<RenewIcon />}
                                    onClick={onRenew}
                                    sx={{
                                        ml: 'auto !important',
                                        bgcolor: '#10b981',
                                        '&:hover': { bgcolor: '#059669' },
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        px: 3,
                                        borderRadius: 2,
                                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                    }}
                                >
                                    Renew Now
                                </Button>
                            </Stack>
                        </Box>
                    </Stack>
                </Box>
            </Paper>
        );
    }

    // ========================
    // SUSPENDED OVERLAY
    // ========================
    if (subscriptionStatus === 'suspended') {
        return (
            <Dialog
                open={true}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: 'hidden',
                    },
                }}
            >
                <Box
                    sx={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        p: 3,
                        textAlign: 'center',
                    }}
                >
                    <BlockIcon sx={{ fontSize: 60, color: 'white', mb: 1 }} />
                    <DialogTitle sx={{ color: 'white', p: 0, fontSize: '1.5rem', fontWeight: 700 }}>
                        Service Suspended
                    </DialogTitle>
                </Box>

                <DialogContent sx={{ pt: 3, pb: 2 }}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        <AlertTitle sx={{ fontWeight: 600 }}>Your broadband service is currently inactive</AlertTitle>
                        Your <strong>{planName || 'subscription'}</strong> has been suspended because the grace period
                        ended without renewal.
                    </Alert>

                    <Typography variant="body1" sx={{ color: '#555', textAlign: 'center', my: 2 }}>
                        Renew your subscription to restore your broadband service immediately.
                    </Typography>

                    {amount && (
                        <Typography variant="h5" sx={{ textAlign: 'center', fontWeight: 700, color: '#333', my: 1 }}>
                            Renewal Amount: ₹{amount}
                        </Typography>
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 3, pt: 1, justifyContent: 'center' }}>
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<RenewIcon />}
                        onClick={onRenew}
                        sx={{
                            bgcolor: '#10b981',
                            '&:hover': { bgcolor: '#059669' },
                            fontWeight: 700,
                            textTransform: 'none',
                            px: 5,
                            py: 1.5,
                            borderRadius: 2,
                            fontSize: '1.1rem',
                            boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                        }}
                    >
                        Restore Service — Renew Now
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    // ========================
    // EXPIRED STATUS (fallback)
    // ========================
    if (subscriptionStatus === 'expired') {
        return (
            <Alert
                severity="error"
                variant="filled"
                sx={{ mb: 3, borderRadius: 2 }}
                icon={<ErrorIcon />}
                action={
                    <Button
                        color="inherit"
                        size="small"
                        startIcon={<RenewIcon />}
                        onClick={onRenew}
                        sx={{ fontWeight: 600, textTransform: 'none' }}
                    >
                        Renew
                    </Button>
                }
            >
                <AlertTitle sx={{ fontWeight: 600 }}>Subscription Expired</AlertTitle>
                Your {planName || 'plan'} has expired. Please renew to continue using the service.
            </Alert>
        );
    }

    return null;
};

export default ExpiryBanner;

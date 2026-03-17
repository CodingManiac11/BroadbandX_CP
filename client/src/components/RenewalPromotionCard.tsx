import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Bolt as BoltIcon,
  Timer as TimerIcon,
  AutoAwesome as SparkleIcon,
  Speed as SpeedIcon,
  DataUsage as DataIcon,
  SupportAgent as SupportIcon,
  ArrowForward as ArrowIcon,
  Celebration as CelebrationIcon,
} from '@mui/icons-material';

interface RenewalPromotionCardProps {
  planName: string;
  endDate: string;
  speed?: string;
  price?: number;
  onRenew: () => void;
  onBrowsePlans: () => void;
}

const RenewalPromotionCard: React.FC<RenewalPromotionCardProps> = ({
  planName,
  endDate,
  speed,
  price,
  onRenew,
  onBrowsePlans,
}) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0 });
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const end = new Date(endDate);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, mins: 0 });
        setDaysLeft(0);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setDaysLeft(days);
      setTimeLeft({ days, hours, mins });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [endDate]);

  // Only show if ≤ 10 days remaining
  if (daysLeft > 10) return null;

  const isUrgent = daysLeft <= 3;
  const isExpired = daysLeft <= 0 && timeLeft.hours <= 0;

  const gradientBg = isExpired
    ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
    : isUrgent
    ? 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)'
    : 'linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #2d1b69 100%)';

  const accentColor = isExpired ? '#ff6b6b' : isUrgent ? '#ffd93d' : '#6c63ff';
  const glowColor = isExpired ? 'rgba(255,107,107,0.3)' : isUrgent ? 'rgba(255,217,61,0.3)' : 'rgba(108,99,255,0.3)';

  return (
    <Paper
      elevation={8}
      sx={{
        mb: 3,
        borderRadius: 3,
        overflow: 'hidden',
        background: gradientBg,
        border: `1px solid ${accentColor}40`,
        boxShadow: `0 8px 32px ${glowColor}`,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          animation: 'shimmer 2s ease-in-out infinite',
        },
        '@keyframes shimmer': {
          '0%, 100%': { opacity: 0.5 },
          '50%': { opacity: 1 },
        },
        '@keyframes pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        '@keyframes float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        '@keyframes countdownPulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={1.5} mb={2.5}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              background: `${accentColor}20`,
              display: 'flex',
              animation: 'float 3s ease-in-out infinite',
            }}
          >
            {isExpired ? (
              <TimerIcon sx={{ fontSize: 28, color: accentColor }} />
            ) : (
              <BoltIcon sx={{ fontSize: 28, color: accentColor }} />
            )}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h6"
              sx={{
                color: '#fff',
                fontWeight: 700,
                fontSize: '1.1rem',
                letterSpacing: '0.3px',
              }}
            >
              {isExpired ? '⚡ Your Plan Has Expired!' : `⏰ Your ${planName} Plan is Ending Soon`}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
              {isExpired
                ? 'Renew now to continue enjoying uninterrupted broadband'
                : 'Renew early to avoid service interruption'}
            </Typography>
          </Box>
          {!isExpired && (
            <Chip
              label={isUrgent ? '🔥 URGENT' : '⏳ EXPIRING'}
              size="small"
              sx={{
                bgcolor: `${accentColor}25`,
                color: accentColor,
                fontWeight: 700,
                fontSize: '0.7rem',
                letterSpacing: '0.5px',
                border: `1px solid ${accentColor}40`,
                animation: isUrgent ? 'pulse 1.5s ease-in-out infinite' : 'none',
              }}
            />
          )}
        </Stack>

        {/* Countdown Timer — the hero section */}
        {!isExpired && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 2,
              mb: 3,
              py: 2,
            }}
          >
            {[
              { value: timeLeft.days, label: 'DAYS' },
              { value: timeLeft.hours, label: 'HOURS' },
              { value: timeLeft.mins, label: 'MINS' },
            ].map((item, i) => (
              <Box key={i} sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: 2,
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${accentColor}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(10px)',
                    animation: isUrgent ? 'countdownPulse 2s ease-in-out infinite' : 'none',
                  }}
                >
                  <Typography
                    variant="h4"
                    sx={{
                      color: accentColor,
                      fontWeight: 800,
                      fontFamily: '"SF Mono", "Roboto Mono", monospace',
                    }}
                  >
                    {String(item.value).padStart(2, '0')}
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.65rem',
                    letterSpacing: '1.5px',
                    mt: 0.5,
                    display: 'block',
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* Progress bar showing time elapsed */}
        <Box sx={{ mb: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>
              Plan cycle progress
            </Typography>
            <Typography variant="caption" sx={{ color: accentColor, fontSize: '0.7rem', fontWeight: 600 }}>
              {isExpired ? 'Expired' : `${daysLeft}d remaining`}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, Math.max(0, ((30 - daysLeft) / 30) * 100))}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'rgba(255,255,255,0.08)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                background: `linear-gradient(90deg, ${accentColor}80, ${accentColor})`,
              },
            }}
          />
        </Box>

        {/* Benefits reminder */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            mb: 2.5,
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, mb: 1, fontSize: '0.8rem' }}
          >
            <SparkleIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle', color: '#ffd93d' }} />
            Don't lose your benefits:
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            {[
              { icon: <SpeedIcon sx={{ fontSize: 16 }} />, text: speed ? `${speed} Speed` : 'High Speed' },
              { icon: <DataIcon sx={{ fontSize: 16 }} />, text: 'Unlimited Data' },
              { icon: <SupportIcon sx={{ fontSize: 16 }} />, text: '24/7 Support' },
            ].map((benefit, i) => (
              <Stack key={i} direction="row" alignItems="center" spacing={0.5}>
                <Box sx={{ color: accentColor }}>{benefit.icon}</Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>
                  {benefit.text}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        {/* CTA Buttons */}
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            fullWidth
            size="large"
            endIcon={<ArrowIcon />}
            onClick={onRenew}
            sx={{
              py: 1.5,
              borderRadius: 2,
              fontWeight: 700,
              fontSize: '0.95rem',
              textTransform: 'none',
              background: `linear-gradient(135deg, ${accentColor}, ${isUrgent ? '#ff6b6b' : '#8b5cf6'})`,
              boxShadow: `0 4px 20px ${glowColor}`,
              '&:hover': {
                background: `linear-gradient(135deg, ${isUrgent ? '#ff6b6b' : '#8b5cf6'}, ${accentColor})`,
                boxShadow: `0 6px 28px ${glowColor}`,
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            {isExpired ? '⚡ Renew Now' : `🔄 Renew for ₹${price || 799}`}
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={onBrowsePlans}
            sx={{
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              fontSize: '0.85rem',
              textTransform: 'none',
              color: 'rgba(255,255,255,0.7)',
              borderColor: 'rgba(255,255,255,0.15)',
              '&:hover': {
                borderColor: accentColor,
                color: accentColor,
                background: `${accentColor}10`,
              },
              minWidth: 140,
            }}
          >
            Explore Plans
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
};

export default RenewalPromotionCard;

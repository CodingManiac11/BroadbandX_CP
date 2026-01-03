import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Divider,
  Button,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  Payment as PaymentIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { apiClient } from '../services/api';

interface Reminder {
  _id: string;
  type: 'payment_due' | 'overdue' | 'upcoming' | 'info';
  title: string;
  message: string;
  dueDate?: string;
  amount?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  createdAt: string;
}

interface BillingRemindersProps {
  compact?: boolean; // For header notification icon
  onClose?: () => void;
}

const BillingReminders: React.FC<BillingRemindersProps> = ({ compact = false, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/notifications/reminders');
      const data = response.data as any;
      if (data.success) {
        setReminders(data.data);
      }
    } catch (err: any) {
      console.error('Error fetching reminders:', err);
      setError(err.response?.data?.message || 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (reminderId: string) => {
    try {
      await apiClient.patch(`/notifications/reminders/${reminderId}/read`);
      setReminders(prev =>
        prev.map(r => (r._id === reminderId ? { ...r, read: true } : r))
      );
    } catch (err) {
      console.error('Error marking reminder as read:', err);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'default';
    }
  };

  const getIcon = (type: string, priority: string) => {
    if (priority === 'urgent' || type === 'overdue') {
      return <ErrorIcon color="error" />;
    }
    if (type === 'payment_due') {
      return <WarningIcon color="warning" />;
    }
    if (type === 'upcoming') {
      return <InfoIcon color="info" />;
    }
    return <PaymentIcon color="primary" />;
  };

  const unreadCount = reminders.filter(r => !r.read).length;

  // Compact view for header
  if (compact) {
    return (
      <Box>
        <IconButton
          color="inherit"
          onClick={(e) => setAnchorEl(e.currentTarget)}
        >
          <Badge badgeContent={unreadCount} color="error">
            {unreadCount > 0 ? <NotificationsActiveIcon /> : <NotificationsIcon />}
          </Badge>
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{
            sx: { width: 380, maxHeight: 500 }
          }}
        >
          <Box px={2} py={1}>
            <Typography variant="h6" fontWeight="bold">
              Notifications
            </Typography>
          </Box>
          <Divider />

          {loading ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress size={30} />
            </Box>
          ) : reminders.length === 0 ? (
            <Box px={2} py={3} textAlign="center">
              <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No reminders at this time
              </Typography>
            </Box>
          ) : (
            reminders.slice(0, 5).map((reminder) => (
              <MenuItem
                key={reminder._id}
                onClick={() => {
                  markAsRead(reminder._id);
                  setAnchorEl(null);
                }}
                sx={{
                  bgcolor: reminder.read ? 'transparent' : 'action.hover',
                  py: 1.5,
                  flexDirection: 'column',
                  alignItems: 'flex-start'
                }}
              >
                <Box display="flex" alignItems="start" width="100%" gap={1}>
                  {getIcon(reminder.type, reminder.priority)}
                  <Box flex={1}>
                    <Typography variant="body2" fontWeight={reminder.read ? 'normal' : 'bold'}>
                      {reminder.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {reminder.message}
                    </Typography>
                    {reminder.amount && (
                      <Typography variant="caption" color="primary" display="block">
                        Amount: ₹{reminder.amount.toFixed(2)}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </MenuItem>
            ))
          )}

          {reminders.length > 5 && (
            <>
              <Divider />
              <Box px={2} py={1} textAlign="center">
                <Button size="small" onClick={onClose}>
                  View All
                </Button>
              </Box>
            </>
          )}
        </Menu>
      </Box>
    );
  }

  // Full view for dashboard page
  return (
    <Box>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <NotificationsActiveIcon color="primary" fontSize="large" />
              <Typography variant="h5" fontWeight="bold">
                Billing Reminders
              </Typography>
            </Box>
            {unreadCount > 0 && (
              <Chip
                label={`${unreadCount} unread`}
                color="error"
                size="small"
              />
            )}
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : reminders.length === 0 ? (
            <Box textAlign="center" py={4}>
              <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                All Caught Up!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You have no pending reminders or notifications
              </Typography>
            </Box>
          ) : (
            <List>
              {reminders.map((reminder, index) => (
                <React.Fragment key={reminder._id}>
                  <ListItem
                    sx={{
                      bgcolor: reminder.read ? 'transparent' : 'action.hover',
                      borderRadius: 1,
                      mb: 1,
                    }}
                    secondaryAction={
                      !reminder.read && (
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => markAsRead(reminder._id)}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      )
                    }
                  >
                    <ListItemIcon>
                      {getIcon(reminder.type, reminder.priority)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography
                            variant="body1"
                            fontWeight={reminder.read ? 'normal' : 'bold'}
                          >
                            {reminder.title}
                          </Typography>
                          <Chip
                            label={reminder.priority}
                            color={getPriorityColor(reminder.priority) as any}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {reminder.message}
                          </Typography>
                          {reminder.amount && (
                            <Typography variant="body2" color="primary" fontWeight="medium" mt={0.5}>
                              Amount Due: ₹{reminder.amount.toFixed(2)}
                            </Typography>
                          )}
                          {reminder.dueDate && (
                            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                              Due: {new Date(reminder.dueDate).toLocaleDateString()}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary" display="block">
                            {new Date(reminder.createdAt).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < reminders.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default BillingReminders;

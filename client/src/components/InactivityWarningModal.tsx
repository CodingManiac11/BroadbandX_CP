import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import TimerIcon from '@mui/icons-material/Timer';

interface InactivityWarningModalProps {
  open: boolean;
  remainingSeconds: number;
  onStayLoggedIn: () => void;
}

/**
 * Modal shown when user is about to be logged out due to inactivity
 */
export const InactivityWarningModal: React.FC<InactivityWarningModalProps> = ({
  open,
  remainingSeconds,
  onStayLoggedIn
}) => {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: 'warning.light',
          color: 'warning.dark'
        }}
      >
        <WarningIcon />
        <span>Inactivity Warning</span>
      </DialogTitle>
      
      <DialogContent sx={{ mt: 2 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          You will be logged out due to inactivity
        </Alert>
        
        <Typography variant="body1" paragraph>
          You have been inactive for a while. For your security, you will be automatically 
          logged out soon.
        </Typography>
        
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            p: 3,
            bgcolor: 'grey.100',
            borderRadius: 2,
            my: 2
          }}
        >
          <TimerIcon color="error" fontSize="large" />
          <Typography variant="h3" color="error" fontWeight="bold">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" align="center">
          Click "Stay Logged In" to continue your session
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button
          onClick={onStayLoggedIn}
          variant="contained"
          color="primary"
          fullWidth
          size="large"
        >
          Stay Logged In
        </Button>
      </DialogActions>
    </Dialog>
  );
};

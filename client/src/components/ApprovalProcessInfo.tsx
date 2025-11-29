import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Chip,
  Stack,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  Send,
  Visibility,
  CheckCircle,
  Cancel,
  Notifications,
  Assignment
} from '@mui/icons-material';

const ApprovalProcessInfo: React.FC = () => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          How the Plan Approval Process Works
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            For security and quality control, all plan changes now require admin approval. 
            This ensures better service management and prevents unauthorized modifications.
          </Typography>
        </Alert>

        <Stepper orientation="vertical" sx={{ mt: 2 }}>
          <Step>
            <StepLabel
              StepIconComponent={() => (
                <Box sx={{ 
                  bgcolor: 'primary.main', 
                  color: 'white', 
                  borderRadius: '50%', 
                  width: 40, 
                  height: 40, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Send />
                </Box>
              )}
            >
              <Typography variant="h6">1. Submit Request</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choose your desired plan and submit a request with details about your needs and urgency level.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip label="New Subscription" size="small" variant="outlined" />
                <Chip label="Plan Upgrade" size="small" variant="outlined" />
                <Chip label="Plan Downgrade" size="small" variant="outlined" />
                <Chip label="Cancellation" size="small" variant="outlined" />
              </Stack>
            </StepContent>
          </Step>

          <Step>
            <StepLabel
              StepIconComponent={() => (
                <Box sx={{ 
                  bgcolor: 'warning.main', 
                  color: 'white', 
                  borderRadius: '50%', 
                  width: 40, 
                  height: 40, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Assignment />
                </Box>
              )}
            >
              <Typography variant="h6">2. Pending Review</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Your request is queued for admin review. Higher priority requests are processed faster.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip label="High: 24hrs" size="small" color="error" />
                <Chip label="Medium: 2-3 days" size="small" color="warning" />
                <Chip label="Low: 5-7 days" size="small" color="success" />
              </Stack>
            </StepContent>
          </Step>

          <Step>
            <StepLabel
              StepIconComponent={() => (
                <Box sx={{ 
                  bgcolor: 'secondary.main', 
                  color: 'white', 
                  borderRadius: '50%', 
                  width: 40, 
                  height: 40, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Visibility />
                </Box>
              )}
            >
              <Typography variant="h6">3. Admin Review</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Our admin team reviews your request, checks compatibility, and may add comments or ask for clarification.
              </Typography>
            </StepContent>
          </Step>

          <Step>
            <StepLabel
              StepIconComponent={() => (
                <Box sx={{ 
                  bgcolor: 'success.main', 
                  color: 'white', 
                  borderRadius: '50%', 
                  width: 40, 
                  height: 40, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <CheckCircle />
                </Box>
              )}
            >
              <Typography variant="h6">4. Decision Made</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Your request is either approved or rejected with detailed feedback from the admin team.
              </Typography>
            </StepContent>
          </Step>

          <Step>
            <StepLabel
              StepIconComponent={() => (
                <Box sx={{ 
                  bgcolor: 'info.main', 
                  color: 'white', 
                  borderRadius: '50%', 
                  width: 40, 
                  height: 40, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Notifications />
                </Box>
              )}
            >
              <Typography variant="h6">5. Implementation</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                If approved, changes take effect on your next billing cycle. You'll receive confirmation and next steps.
              </Typography>
            </StepContent>
          </Step>
        </Stepper>

        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Request Status Meanings
          </Typography>
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip label="Pending" color="warning" size="small" />
              <Typography variant="body2">
                Awaiting admin review - you can cancel if needed
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip label="Approved" color="success" size="small" />
              <Typography variant="body2">
                Approved and will be implemented on next billing cycle
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip label="Rejected" color="error" size="small" />
              <Typography variant="body2">
                Request denied - see admin comments for reasons
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip label="Cancelled" color="default" size="small" />
              <Typography variant="body2">
                You cancelled this request before admin review
              </Typography>
            </Box>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ApprovalProcessInfo;
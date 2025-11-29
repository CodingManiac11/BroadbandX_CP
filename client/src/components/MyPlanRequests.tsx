import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Pagination,
  Divider,
  Paper,
  LinearProgress
} from '@mui/material';
import {
  AccessTime,
  CheckCircle,
  Cancel,
  Pending,
  Info,
  Warning
} from '@mui/icons-material';
import { planRequestService, PlanRequest } from '../services/planRequestService';
import { useRealTimeUpdates, usePlanRequestUpdates } from '../hooks/useRealTimeUpdates';

const MyPlanRequests: React.FC = () => {
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialog states
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PlanRequest | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Real-time updates
  useRealTimeUpdates();

  const handleRealTimeUpdate = useCallback((data: any) => {
    console.log('📡 Real-time update received:', data);
    
    switch (data.type) {
      case 'plan_request_created':
        // Add new request to the list
        setRequests(prev => [data.planRequest, ...prev]);
        break;
        
      case 'plan_request_status_changed':
      case 'plan_request_approved':
      case 'plan_request_rejected':
        // Update existing request
        setRequests(prev => 
          prev.map(req => 
            req._id === data.planRequest._id ? data.planRequest : req
          )
        );
        break;
        
      case 'plan_request_cancelled':
        // Update or remove cancelled request
        setRequests(prev => 
          prev.map(req => 
            req._id === data.planRequest._id ? data.planRequest : req
          )
        );
        break;
        
      default:
        // Refresh the list for any other updates
        fetchRequests();
    }
  }, []);

  usePlanRequestUpdates(handleRealTimeUpdate);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await planRequestService.getMyPlanRequests({
        page,
        limit: 10,
        status: statusFilter === 'all' ? undefined : statusFilter
      });

      setRequests(response.requests || []);
      setTotalPages(response.pages || 1);
    } catch (err) {
      console.error('Error fetching plan requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch plan requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter]);

  const handleCancelRequest = (request: PlanRequest) => {
    setSelectedRequest(request);
    setCancelReason('');
    setCancelDialogOpen(true);
  };

  const executeCancelRequest = async () => {
    if (!selectedRequest) return;

    try {
      await planRequestService.cancelPlanRequest(selectedRequest._id, cancelReason);
      setCancelDialogOpen(false);
      fetchRequests();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to cancel request');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Pending color="warning" />;
      case 'approved': return <CheckCircle color="success" />;
      case 'rejected': return <Cancel color="error" />;
      case 'cancelled': return <Cancel color="disabled" />;
      default: return <Info />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount?.toFixed(2) || '0.00'}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 8) return 'Very High';
    if (priority >= 6) return 'High';
    if (priority >= 4) return 'Medium';
    return 'Low';
  };

  if (loading && requests.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        My Plan Requests
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Track the status of your plan change requests. All subscription modifications require admin approval.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Status Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle1">Filter by status:</Typography>
          {['all', 'pending', 'approved', 'rejected', 'cancelled'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setStatusFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </Stack>
      </Paper>

      {/* No Requests Message */}
      {!loading && requests.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No plan requests found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {statusFilter === 'all' 
              ? "You haven't submitted any plan requests yet."
              : `No ${statusFilter} requests found.`
            }
          </Typography>
        </Paper>
      )}

      {/* Requests List */}
      <Stack spacing={3}>
        {requests.map((request) => (
          <Card key={request._id} elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                {/* Main Request Info */}
                <Box sx={{ flex: 2 }}>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {getStatusIcon(request.status)}
                      <Typography variant="h6">
                        {request.summary}
                      </Typography>
                      <Chip 
                        label={(request.status || 'unknown').charAt(0).toUpperCase() + (request.status || 'unknown').slice(1)} 
                        color={getStatusColor(request.status)}
                        size="small"
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary">
                      Submitted on {formatDate(request.createdAt)}
                    </Typography>

                    {/* Plan Details */}
                    <Box>
                      {request.previousPlan && (
                        <Typography variant="body2">
                          <strong>Current Plan:</strong> {request.previousPlan.name} 
                          {request.previousPlan.pricing?.monthly && (
                            <span> ({formatCurrency(request.previousPlan.pricing.monthly)}/month)</span>
                          )}
                        </Typography>
                      )}
                      {request.requestedPlan && (
                        <Typography variant="body2">
                          <strong>Requested Plan:</strong> {request.requestedPlan.name}
                          {request.requestedPlan.pricing?.monthly && (
                            <span> ({formatCurrency(request.requestedPlan.pricing.monthly)}/month)</span>
                          )}
                        </Typography>
                      )}
                      {request.pricing?.priceDifference !== undefined && request.pricing.priceDifference !== 0 && (
                        <Typography 
                          variant="body2" 
                          color={request.pricing.priceDifference > 0 ? 'success.main' : 'error.main'}
                        >
                          <strong>Price Change:</strong> {request.pricing.priceDifference > 0 ? '+' : ''}
                          {formatCurrency(request.pricing.priceDifference)}/month
                        </Typography>
                      )}
                    </Box>

                    {/* Request Details */}
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                      {request.requestDetails?.urgency && (
                        <Chip 
                          label={`${(request.requestDetails?.urgency || 'unknown').charAt(0).toUpperCase() + (request.requestDetails?.urgency || 'unknown').slice(1)} Priority`}
                          color={getUrgencyColor(request.requestDetails.urgency)}
                          size="small"
                        />
                      )}
                      <Chip 
                        label={`Priority Score: ${request.priority}`}
                        variant="outlined"
                        size="small"
                      />
                      {request.requestDetails?.billingCycle && (
                        <Chip 
                          label={(request.requestDetails?.billingCycle || 'unknown').charAt(0).toUpperCase() + (request.requestDetails?.billingCycle || 'unknown').slice(1)}
                          variant="outlined"
                          size="small"
                        />
                      )}
                    </Stack>

                    {/* Customer Notes */}
                    {request.customerNotes && (
                      <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                        <Typography variant="body2">
                          <strong>Your Notes:</strong> {request.customerNotes}
                        </Typography>
                      </Box>
                    )}

                    {/* Reason */}
                    {request.requestDetails?.reason && (
                      <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                        <Typography variant="body2">
                          <strong>Reason:</strong> {request.requestDetails.reason}
                        </Typography>
                      </Box>
                    )}

                    {/* Admin Response */}
                    {request.adminAction && (
                      <Box sx={{ bgcolor: request.status === 'approved' ? 'success.50' : 'error.50', p: 2, borderRadius: 1 }}>
                        <Typography variant="body2">
                          <strong>Admin Response:</strong> {request.adminAction.comments || 'No comments provided'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Reviewed by {request.adminAction.reviewedBy?.firstName} {request.adminAction.reviewedBy?.lastName}
                          {request.adminAction.reviewedAt && <span> on {formatDate(request.adminAction.reviewedAt)}</span>}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Box>

                {/* Action Panel */}
                <Box sx={{ flex: 1 }}>
                  <Stack spacing={2} sx={{ height: '100%' }}>
                    {/* Status Progress */}
                    <Box>
                      <Typography variant="body2" gutterBottom>
                        Request Status
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={
                          request.status === 'pending' ? 50 :
                          request.status === 'approved' ? 100 :
                          request.status === 'rejected' ? 100 :
                          request.status === 'cancelled' ? 25 : 0
                        }
                        color={
                          request.status === 'approved' ? 'success' :
                          request.status === 'rejected' ? 'error' :
                          request.status === 'cancelled' ? 'warning' : 'primary'
                        }
                      />
                    </Box>

                    {/* Pending Actions */}
                    {request.status === 'pending' && (
                      <Box>
                        <Alert severity="info" sx={{ mb: 2 }}>
                          <Typography variant="body2">
                            Your request is pending admin review. You'll be notified once it's processed.
                          </Typography>
                        </Alert>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() => handleCancelRequest(request)}
                          startIcon={<Cancel />}
                          fullWidth
                        >
                          Cancel Request
                        </Button>
                      </Box>
                    )}

                    {/* Approved Actions */}
                    {request.status === 'approved' && (
                      <Alert severity="success">
                        <Typography variant="body2">
                          Your request has been approved! Changes will take effect on your next billing cycle.
                        </Typography>
                      </Alert>
                    )}

                    {/* Rejected Notice */}
                    {request.status === 'rejected' && (
                      <Alert severity="error">
                        <Typography variant="body2">
                          Your request has been rejected. You can submit a new request if needed.
                        </Typography>
                      </Alert>
                    )}

                    {/* Cancelled Notice */}
                    {request.status === 'cancelled' && (
                      <Alert severity="warning">
                        <Typography variant="body2">
                          This request was cancelled.
                        </Typography>
                      </Alert>
                    )}
                  </Stack>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
          />
        </Box>
      )}

      {/* Cancel Request Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cancel Request</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ mb: 2 }}>
              Are you sure you want to cancel this request: {selectedRequest?.summary}?
            </Typography>
            <TextField
              fullWidth
              label="Reason for cancellation (optional)"
              multiline
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>Keep Request</Button>
          <Button onClick={executeCancelRequest} variant="contained" color="error">
            Cancel Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MyPlanRequests;
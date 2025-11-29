import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Stack,
  Alert,
  CircularProgress,
  Pagination,
  Grid,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Visibility,
  AccessTime,
  Person,
  AttachMoney,
  TrendingUp,
  TrendingDown,
  Add
} from '@mui/icons-material';
import { adminService } from '../services/adminService';
import { useRealTimeUpdates, useAdminPlanRequestUpdates } from '../hooks/useRealTimeUpdates';

interface PlanRequest {
  _id: string;
  customer: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  requestType: 'new_subscription' | 'plan_change' | 'cancel_subscription' | 'plan_upgrade' | 'plan_downgrade';
  requestedPlan?: {
    _id: string;
    name: string;
    pricing: {
      monthly: number;
      currency: string;
    };
    category: string;
    features: any;
  };
  previousPlan?: {
    _id: string;
    name: string;
    pricing: {
      monthly: number;
      currency: string;
    };
  };
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestDetails: {
    billingCycle: string;
    reason?: string;
    urgency: 'low' | 'medium' | 'high';
  };
  pricing: {
    currentAmount?: number;
    newAmount?: number;
    priceDifference?: number;
  };
  customerNotes?: string;
  priority: number;
  requestAge: number;
  timeUntilExpiration: number;
  summary: string;
  createdAt: string;
  adminAction?: {
    reviewedBy?: {
      firstName: string;
      lastName: string;
    };
    reviewedAt?: string;
    comments?: string;
  };
}

const PlanRequestManagement: React.FC = () => {
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [requestTypeFilter, setRequestTypeFilter] = useState('all');
  const [summary, setSummary] = useState<any>({});

  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PlanRequest | null>(null);
  const [actionComments, setActionComments] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Real-time updates
  useRealTimeUpdates();

  const handleAdminRealTimeUpdate = useCallback((data: any) => {
    console.log('👑 Admin real-time update received:', data);
    
    switch (data.type) {
      case 'admin_plan_request_created':
        // Add new request to the list
        setRequests(prev => [data.planRequest, ...prev]);
        // Update summary
        setSummary((prev: any) => ({
          ...prev,
          totalPending: (prev.totalPending || 0) + 1
        }));
        break;
        
      case 'admin_plan_request_approved':
      case 'admin_plan_request_rejected':
      case 'admin_plan_request_cancelled':
        // Update existing request and refresh list
        fetchRequests();
        break;
        
      default:
        // Refresh the list for any other updates
        fetchRequests();
    }
  }, []);

  useAdminPlanRequestUpdates(handleAdminRealTimeUpdate);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminService.getAllPlanRequests({
        page,
        limit: 10,
        status: statusFilter,
        requestType: requestTypeFilter === 'all' ? undefined : requestTypeFilter
      });

      setRequests(response.data || []);
      setTotalPages(response.pagination?.pages || 1);
      setSummary(response.summary || {});
    } catch (err) {
      console.error('Error fetching plan requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch plan requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter, requestTypeFilter]);

  const handleViewRequest = (request: PlanRequest) => {
    setSelectedRequest(request);
    setViewDialogOpen(true);
  };

  const handleApproveRequest = (request: PlanRequest) => {
    setSelectedRequest(request);
    setActionComments('');
    setInternalNotes('');
    setApproveDialogOpen(true);
  };

  const handleRejectRequest = (request: PlanRequest) => {
    setSelectedRequest(request);
    setActionComments('');
    setInternalNotes('');
    setRejectDialogOpen(true);
  };

  const executeApproval = async () => {
    if (!selectedRequest) return;

    try {
      await adminService.approvePlanRequest(selectedRequest._id, {
        comments: actionComments,
        internalNotes: internalNotes
      });
      
      setApproveDialogOpen(false);
      fetchRequests();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to approve request');
    }
  };

  const executeRejection = async () => {
    if (!selectedRequest) return;

    try {
      await adminService.rejectPlanRequest(selectedRequest._id, {
        comments: actionComments,
        internalNotes: internalNotes
      });
      
      setRejectDialogOpen(false);
      fetchRequests();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to reject request');
    }
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'new_subscription': return <Add />;
      case 'plan_upgrade': return <TrendingUp />;
      case 'plan_downgrade': return <TrendingDown />;
      case 'cancel_subscription': return <Cancel />;
      default: return <Person />;
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
    return new Date(dateString).toLocaleDateString();
  };

  if (loading && requests.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Plan Request Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" color="warning.main">
              Pending Requests
            </Typography>
            <Typography variant="h4">
              {summary.totalPending || 0}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="error.main">
              Urgent Requests
            </Typography>
            <Typography variant="h4">
              {summary.urgentRequests || 0}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="success.main">
              Approved Today
            </Typography>
            <Typography variant="h4">
              {summary.statusBreakdown?.approved || 0}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" color="error.main">
              Rejected Today
            </Typography>
            <Typography variant="h4">
              {summary.statusBreakdown?.rejected || 0}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
                <MenuItem value="all">All</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Request Type</InputLabel>
              <Select
                value={requestTypeFilter}
                label="Request Type"
                onChange={(e) => setRequestTypeFilter(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="new_subscription">New Subscription</MenuItem>
                <MenuItem value="plan_upgrade">Plan Upgrade</MenuItem>
                <MenuItem value="plan_downgrade">Plan Downgrade</MenuItem>
                <MenuItem value="plan_change">Plan Change</MenuItem>
                <MenuItem value="cancel_subscription">Cancellation</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell>Request Type</TableCell>
              <TableCell>Plan Details</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Urgency</TableCell>
              <TableCell>Age</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request._id}>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {request.customer.firstName} {request.customer.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {request.customer.email}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {getRequestTypeIcon(request.requestType)}
                    <Typography variant="body2">
                      {request.summary}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Box>
                    {request.requestedPlan && (
                      <Typography variant="body2" fontWeight="bold">
                        → {request.requestedPlan.name}
                      </Typography>
                    )}
                    {request.previousPlan && (
                      <Typography variant="caption" color="text.secondary">
                        From: {request.previousPlan.name}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    {request.pricing.newAmount && (
                      <Typography variant="body2">
                        {formatCurrency(request.pricing.newAmount)}
                      </Typography>
                    )}
                    {request.pricing.priceDifference !== undefined && (
                      <Typography 
                        variant="caption" 
                        color={request.pricing.priceDifference > 0 ? 'success.main' : 'error.main'}
                      >
                        {request.pricing.priceDifference > 0 ? '+' : ''}
                        {formatCurrency(request.pricing.priceDifference)}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={request.priority} 
                    size="small" 
                    color={request.priority >= 7 ? 'error' : request.priority >= 5 ? 'warning' : 'success'}
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={(request.status || 'unknown').charAt(0).toUpperCase() + (request.status || 'unknown').slice(1)} 
                    size="small" 
                    color={getStatusColor(request.status)}
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={(request.requestDetails?.urgency || 'unknown').charAt(0).toUpperCase() + (request.requestDetails?.urgency || 'unknown').slice(1)} 
                    size="small" 
                    color={getUrgencyColor(request.requestDetails.urgency)}
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title={`Created on ${formatDate(request.createdAt)}`}>
                    <Typography variant="body2">
                      {request.requestAge}h ago
                    </Typography>
                  </Tooltip>
                  {request.timeUntilExpiration > 0 && (
                    <Typography variant="caption" color="warning.main">
                      Expires in {request.timeUntilExpiration}h
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleViewRequest(request)}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    {request.status === 'pending' && (
                      <>
                        <Tooltip title="Approve">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleApproveRequest(request)}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRejectRequest(request)}
                          >
                            <Cancel />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, newPage) => setPage(newPage)}
          color="primary"
        />
      </Box>

      {/* View Request Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Request Details</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2 }}>
                <Box>
                  <Typography variant="h6">Customer Information</Typography>
                  <Typography>Name: {selectedRequest.customer.firstName} {selectedRequest.customer.lastName}</Typography>
                  <Typography>Email: {selectedRequest.customer.email}</Typography>
                  <Typography>Phone: {selectedRequest.customer.phone}</Typography>
                </Box>
                <Box>
                  <Typography variant="h6">Request Information</Typography>
                  <Typography>Type: {selectedRequest.summary}</Typography>
                  <Typography>Priority: {selectedRequest.priority}</Typography>
                  <Typography>Urgency: {selectedRequest.requestDetails.urgency}</Typography>
                  <Typography>Status: {selectedRequest.status}</Typography>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography variant="h6">Plan Details</Typography>
                  {selectedRequest.previousPlan && (
                    <Typography>Current Plan: {selectedRequest.previousPlan.name} ({formatCurrency(selectedRequest.previousPlan.pricing.monthly)})</Typography>
                  )}
                  {selectedRequest.requestedPlan && (
                    <Typography>Requested Plan: {selectedRequest.requestedPlan.name} ({formatCurrency(selectedRequest.requestedPlan.pricing.monthly)})</Typography>
                  )}
                  {selectedRequest.pricing.priceDifference !== undefined && (
                    <Typography>Price Difference: {formatCurrency(selectedRequest.pricing.priceDifference)}</Typography>
                  )}
                </Box>
                {selectedRequest.customerNotes && (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="h6">Customer Notes</Typography>
                    <Typography>{selectedRequest.customerNotes}</Typography>
                  </Box>
                )}
                {selectedRequest.requestDetails.reason && (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="h6">Reason</Typography>
                    <Typography>{selectedRequest.requestDetails.reason}</Typography>
                  </Box>
                )}
                {selectedRequest.adminAction && (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="h6">Admin Action</Typography>
                    <Typography>Reviewed by: {selectedRequest.adminAction.reviewedBy?.firstName} {selectedRequest.adminAction.reviewedBy?.lastName}</Typography>
                    <Typography>Reviewed at: {formatDate(selectedRequest.adminAction.reviewedAt!)}</Typography>
                    {selectedRequest.adminAction.comments && (
                      <Typography>Comments: {selectedRequest.adminAction.comments}</Typography>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Approve Request Dialog */}
      <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Request</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ mb: 2 }}>
              Are you sure you want to approve this {selectedRequest?.summary}?
            </Typography>
            <TextField
              fullWidth
              label="Comments (visible to customer)"
              multiline
              rows={3}
              value={actionComments}
              onChange={(e) => setActionComments(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Internal Notes (admin only)"
              multiline
              rows={2}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
          <Button onClick={executeApproval} variant="contained" color="success">
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Request Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Request</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography sx={{ mb: 2 }}>
              Are you sure you want to reject this {selectedRequest?.summary}?
            </Typography>
            <TextField
              fullWidth
              label="Reason for rejection (visible to customer)"
              multiline
              rows={3}
              value={actionComments}
              onChange={(e) => setActionComments(e.target.value)}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              fullWidth
              label="Internal Notes (admin only)"
              multiline
              rows={2}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={executeRejection} 
            variant="contained" 
            color="error"
            disabled={!actionComments.trim()}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlanRequestManagement;
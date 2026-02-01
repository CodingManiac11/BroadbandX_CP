import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip,
  Snackbar,
  Rating,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
  LinearProgress,
  Tab,
  Tabs,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Help as HelpIcon,
  QuestionAnswer as QuestionAnswerIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  AccessTime as AccessTimeIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Star as StarIcon,
  Message as MessageIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface TicketMessage {
  _id: string;
  senderType: 'customer' | 'agent' | 'system';
  senderName: string;
  content: string;
  createdAt: string;
}

interface Ticket {
  _id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  status: 'open' | 'assigned' | 'in-progress' | 'pending-customer' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  assignedToName?: string;
  messages: TicketMessage[];
  satisfaction?: {
    rating: number;
    feedback: string;
  };
  aiAnalysis?: {
    suggestedCategory: string;
    suggestedPriority: string;
    sentimentScore: number;
  };
}

const SupportCenter: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openTicketDialog, setOpenTicketDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    category: 'general',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  });
  const [ratingDialog, setRatingDialog] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [ratingFeedback, setRatingFeedback] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  // FAQ data
  const faqs = [
    {
      id: 1,
      question: "How do I change my subscription plan?",
      answer: "You can change your subscription plan by going to the 'My Subscriptions' section in your dashboard and clicking on 'Upgrade/Downgrade Plan'."
    },
    {
      id: 2,
      question: "What payment methods are supported?",
      answer: "We support UPI payments, credit/debit cards, net banking, and digital wallets like Paytm, PhonePe, and Google Pay."
    },
    {
      id: 3,
      question: "How can I check my data usage?",
      answer: "Your current data usage is displayed on your dashboard. You can also view detailed usage history in the 'Usage Analytics' section."
    },
    {
      id: 4,
      question: "What should I do if I'm experiencing slow internet speeds?",
      answer: "First, try restarting your router. If the issue persists, run a speed test and contact our support team with the results."
    },
    {
      id: 5,
      question: "How do I report a network outage?",
      answer: "You can report network outages through this support center by creating a new ticket with category 'Network' and priority 'Urgent'."
    }
  ];

  // Load user's tickets
  const loadTickets = useCallback(async () => {
    if (!user) return;

    setLoadingTickets(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(
        `${API_URL}/support/tickets/my`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setTickets(response.data.data.tickets);
      }
    } catch (err: any) {
      console.error('Error loading tickets:', err);
      setError(err.response?.data?.message || 'Failed to load support tickets');
    } finally {
      setLoadingTickets(false);
    }
  }, [user, API_URL]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Load single ticket details
  const loadTicketDetails = async (ticketId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(
        `${API_URL}/support/tickets/${ticketId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSelectedTicket(response.data.data);
        setOpenTicketDialog(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load ticket details');
    }
  };

  // Create new ticket
  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.description.trim()) return;
    if (!user) return;

    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('access_token');

      const response = await axios.post(
        `${API_URL}/support/tickets`,
        {
          subject: newTicket.subject,
          description: newTicket.description,
          category: newTicket.category,
          priority: newTicket.priority
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSuccess(`Ticket ${response.data.data.ticketNumber} created successfully!`);
        setNewTicket({ subject: '', description: '', category: 'general', priority: 'medium' });
        setOpenCreateDialog(false);
        loadTickets();
      }
    } catch (err: any) {
      console.error('Error creating ticket:', err);
      setError(err.response?.data?.message || 'Failed to create support ticket');
    } finally {
      setLoading(false);
    }
  };

  // Send message to ticket
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    setSendingMessage(true);
    try {
      const token = localStorage.getItem('access_token');

      await axios.post(
        `${API_URL}/support/tickets/${selectedTicket._id}/messages`,
        { content: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNewMessage('');
      // Reload ticket to get new message
      await loadTicketDetails(selectedTicket._id);
      setSuccess('Message sent!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Rate ticket
  const handleRateTicket = async () => {
    if (!rating || !selectedTicket) return;

    try {
      const token = localStorage.getItem('access_token');

      await axios.post(
        `${API_URL}/support/tickets/${selectedTicket._id}/rate`,
        { rating, feedback: ratingFeedback },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setRatingDialog(false);
      setRating(null);
      setRatingFeedback('');
      setSuccess('Thank you for your feedback!');
      loadTickets();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit rating');
    }
  };

  // Status colors and icons
  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { color: 'info' | 'warning' | 'success' | 'error' | 'default', icon: React.ReactNode, label: string }> = {
      'open': { color: 'info', icon: <InfoIcon />, label: 'Open' },
      'assigned': { color: 'info', icon: <InfoIcon />, label: 'Assigned' },
      'in-progress': { color: 'warning', icon: <ScheduleIcon />, label: 'In Progress' },
      'pending-customer': { color: 'warning', icon: <WarningIcon />, label: 'Awaiting Your Reply' },
      'resolved': { color: 'success', icon: <CheckCircleIcon />, label: 'Resolved' },
      'closed': { color: 'default', icon: <CheckCircleIcon />, label: 'Closed' }
    };
    return statusMap[status] || { color: 'default' as const, icon: <InfoIcon />, label: status };
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
      'urgent': 'error',
      'high': 'warning',
      'medium': 'info',
      'low': 'default'
    };
    return colors[priority] || 'default';
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'technical': '🔧',
      'billing': '💳',
      'service': '📡',
      'network': '🌐',
      'account': '👤',
      'general': '📋'
    };
    return icons[category] || '📋';
  };

  // Count tickets by status (safe defaults)
  const openCount = (tickets || []).filter(t => ['open', 'assigned', 'in-progress', 'pending-customer'].includes(t.status)).length;
  const resolvedCount = (tickets || []).filter(t => ['resolved', 'closed'].includes(t.status)).length;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          🎫 Support Center
        </Typography>
        <Box>
          <Tooltip title="Refresh">
            <IconButton onClick={loadTickets} disabled={loadingTickets}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenCreateDialog(true)}
            sx={{ ml: 1 }}
          >
            New Ticket
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {/* Quick Actions Sidebar */}
        <Box sx={{ flex: { xs: '1', md: '0 0 280px' } }}>
          <Card sx={{ mb: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ticket Summary
              </Typography>
              <Box display="flex" justifyContent="space-around" mt={2}>
                <Box textAlign="center">
                  <Typography variant="h3" fontWeight="bold">{openCount}</Typography>
                  <Typography variant="body2">Active</Typography>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
                <Box textAlign="center">
                  <Typography variant="h3" fontWeight="bold">{resolvedCount}</Typography>
                  <Typography variant="body2">Resolved</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ height: 'fit-content' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Contact Information
              </Typography>

              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <PhoneIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Call Support"
                    secondary="+91 1800-123-4567"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <EmailIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Email Support"
                    secondary="support@broadbandx.com"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <AccessTimeIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Support Hours"
                    secondary="24/7 Available"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Box>

        {/* Main Content */}
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                sx={{ mb: 2 }}
              >
                <Tab
                  label={
                    <Badge badgeContent={openCount} color="primary">
                      <Box sx={{ pr: 2 }}>My Tickets</Box>
                    </Badge>
                  }
                />
                <Tab label="FAQs" icon={<HelpIcon />} iconPosition="start" />
              </Tabs>

              {/* Tickets Tab */}
              {activeTab === 0 && (
                <>
                  {loadingTickets ? (
                    <Box display="flex" justifyContent="center" py={4}>
                      <CircularProgress />
                    </Box>
                  ) : (tickets || []).length === 0 ? (
                    <Alert severity="info" icon={<MessageIcon />}>
                      You don't have any support tickets yet.
                      <Button size="small" onClick={() => setOpenCreateDialog(true)} sx={{ ml: 2 }}>
                        Create One
                      </Button>
                    </Alert>
                  ) : (
                    <TableContainer component={Paper} variant="outlined">
                      <Table>
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'grey.100' }}>
                            <TableCell><strong>Ticket #</strong></TableCell>
                            <TableCell><strong>Subject</strong></TableCell>
                            <TableCell><strong>Category</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell><strong>Priority</strong></TableCell>
                            <TableCell><strong>Created</strong></TableCell>
                            <TableCell align="center"><strong>Actions</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(tickets || []).map((ticket) => {
                            const statusInfo = getStatusInfo(ticket.status);
                            return (
                              <TableRow
                                key={ticket._id}
                                hover
                                sx={{
                                  cursor: 'pointer',
                                  '&:hover': { bgcolor: 'action.hover' }
                                }}
                                onClick={() => loadTicketDetails(ticket._id)}
                              >
                                <TableCell>
                                  <Typography variant="body2" fontWeight="medium" color="primary">
                                    {ticket.ticketNumber}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {ticket.subject}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={`${getCategoryIcon(ticket.category)} ${ticket.category}`}
                                    size="small"
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={statusInfo.label}
                                    color={statusInfo.color}
                                    size="small"
                                    icon={statusInfo.icon as React.ReactElement}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={ticket.priority}
                                    color={getPriorityColor(ticket.priority)}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(ticket.createdAt).toLocaleDateString()}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Tooltip title="View Details">
                                    <IconButton size="small" color="primary">
                                      <MessageIcon />
                                    </IconButton>
                                  </Tooltip>
                                  {['resolved', 'closed'].includes(ticket.status) && !ticket.satisfaction && (
                                    <Tooltip title="Rate Support">
                                      <IconButton
                                        size="small"
                                        color="warning"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedTicket(ticket);
                                          setRatingDialog(true);
                                        }}
                                      >
                                        <StarIcon />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              )}

              {/* FAQs Tab */}
              {activeTab === 1 && (
                <Box>
                  {faqs.map((faq) => (
                    <Accordion key={faq.id}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle1">
                          <QuestionAnswerIcon sx={{ verticalAlign: 'middle', mr: 1, fontSize: '1.2rem', color: 'primary.main' }} />
                          {faq.question}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2" color="text.secondary">
                          {faq.answer}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Create Ticket Dialog */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <AddIcon color="primary" />
            Create Support Ticket
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Subject"
            fullWidth
            variant="outlined"
            value={newTicket.subject}
            onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
            sx={{ mb: 2, mt: 1 }}
            placeholder="Brief description of your issue"
          />

          <Box display="flex" gap={2} mb={2}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={newTicket.category}
                label="Category"
                onChange={(e) => setNewTicket(prev => ({ ...prev, category: e.target.value }))}
              >
                <MenuItem value="general">📋 General</MenuItem>
                <MenuItem value="technical">🔧 Technical</MenuItem>
                <MenuItem value="billing">💳 Billing</MenuItem>
                <MenuItem value="service">📡 Service</MenuItem>
                <MenuItem value="network">🌐 Network</MenuItem>
                <MenuItem value="account">👤 Account</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={newTicket.priority}
                label="Priority"
                onChange={(e) => setNewTicket(prev => ({
                  ...prev,
                  priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent'
                }))}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={5}
            variant="outlined"
            value={newTicket.description}
            onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe your issue in detail. Include any error messages, steps to reproduce, and what you've tried."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateTicket}
            variant="contained"
            disabled={loading || !newTicket.subject.trim() || !newTicket.description.trim()}
            startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}
          >
            {loading ? 'Creating...' : 'Submit Ticket'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Ticket Detail Dialog */}
      <Dialog
        open={openTicketDialog}
        onClose={() => setOpenTicketDialog(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedTicket && (
          <>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">
                    {selectedTicket.ticketNumber} - {selectedTicket.subject}
                  </Typography>
                  <Box display="flex" gap={1} mt={1}>
                    <Chip
                      label={getStatusInfo(selectedTicket.status).label}
                      color={getStatusInfo(selectedTicket.status).color}
                      size="small"
                    />
                    <Chip
                      label={selectedTicket.priority}
                      color={getPriorityColor(selectedTicket.priority)}
                      size="small"
                    />
                    <Chip
                      label={`${getCategoryIcon(selectedTicket.category)} ${selectedTicket.category}`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </Box>
                <IconButton onClick={() => setOpenTicketDialog(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              {/* Messages */}
              <Box sx={{ maxHeight: 400, overflowY: 'auto', mb: 2 }}>
                {(selectedTicket?.messages || []).map((msg, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      justifyContent: msg.senderType === 'customer' ? 'flex-end' : 'flex-start',
                      mb: 2
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth: '70%',
                        p: 2,
                        borderRadius: 2,
                        bgcolor: msg.senderType === 'customer' ? 'primary.light' : 'grey.100',
                        color: msg.senderType === 'customer' ? 'white' : 'text.primary'
                      }}
                    >
                      <Typography variant="caption" display="block" sx={{ opacity: 0.8, mb: 0.5 }}>
                        {msg.senderName} • {new Date(msg.createdAt).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {msg.content}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* Reply Box */}
              {!['resolved', 'closed'].includes(selectedTicket.status) && (
                <Box display="flex" gap={1}>
                  <TextField
                    fullWidth
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    multiline
                    rows={2}
                    variant="outlined"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleSendMessage}
                    disabled={sendingMessage || !newMessage.trim()}
                    sx={{ alignSelf: 'flex-end' }}
                  >
                    {sendingMessage ? <CircularProgress size={20} /> : <SendIcon />}
                  </Button>
                </Box>
              )}

              {/* Rate Resolved Ticket */}
              {['resolved', 'closed'].includes(selectedTicket.status) && !selectedTicket.satisfaction && (
                <Alert
                  severity="info"
                  action={
                    <Button
                      size="small"
                      startIcon={<StarIcon />}
                      onClick={() => setRatingDialog(true)}
                    >
                      Rate
                    </Button>
                  }
                >
                  This ticket has been resolved. Please rate your support experience!
                </Alert>
              )}

              {selectedTicket.satisfaction && (
                <Alert severity="success" icon={<StarIcon />}>
                  You rated this support: {selectedTicket.satisfaction.rating}/5 ⭐
                </Alert>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={ratingDialog} onClose={() => setRatingDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Rate Your Support Experience</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" alignItems="center" py={2}>
            <Rating
              size="large"
              value={rating}
              onChange={(_, newValue) => setRating(newValue)}
            />
            <TextField
              fullWidth
              label="Additional Feedback (Optional)"
              multiline
              rows={3}
              value={ratingFeedback}
              onChange={(e) => setRatingFeedback(e.target.value)}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRatingDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleRateTicket}
            disabled={!rating}
          >
            Submit Rating
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess('')}
        message={success}
      />
    </Box>
  );
};

export default SupportCenter;
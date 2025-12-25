import React, { useState, useEffect } from 'react';
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
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Help as HelpIcon,
  QuestionAnswer as QuestionAnswerIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created: string;
  lastUpdated: string;
  adminResponse?: string;
}

const SupportCenter: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  });

  // Mock FAQ data
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
      answer: "You can report network outages through this support center by creating a new ticket with 'Network Issue' priority set to 'High'."
    }
  ];

  useEffect(() => {
    loadTickets();
  }, [user]);

  const loadTickets = async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/feedback/user/${user._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Convert feedback to ticket format
      const feedbackTickets = response.data.data.map((feedback: any) => ({
        id: feedback._id,
        title: `${feedback.type} - Rating: ${feedback.rating?.overall || 'N/A'}`,
        description: feedback.comment,
        status: feedback.status === 'pending' ? 'open' : 
                feedback.status === 'reviewed' ? 'in-progress' :
                feedback.status === 'responded' ? 'resolved' : 'closed',
        priority: 'medium',
        created: feedback.createdAt,
        lastUpdated: feedback.updatedAt,
        adminResponse: feedback.response?.content
      }));
      
      setTickets(feedbackTickets);
    } catch (err) {
      console.error('Error loading tickets:', err);
      setError('Failed to load support tickets');
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicket.title.trim() || !newTicket.description.trim()) return;
    if (!user) return;

    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('access_token');
      
      // Submit as feedback to backend
      await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/feedback`,
        {
          type: 'support',
          comment: `${newTicket.title}\n\n${newTicket.description}`,
          rating: {
            overall: 3,
            speed: 3,
            reliability: 3,
            support: 3,
            value: 3
          },
          sentiment: 'neutral',
          source: 'support'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Reload tickets
      await loadTickets();
      
      setNewTicket({ title: '', description: '', priority: 'medium' });
      setOpenDialog(false);
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      setError(error.response?.data?.message || 'Failed to create support ticket');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'info';
      case 'in-progress': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'default';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        Support Center
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {/* Quick Actions */}
        <Box sx={{ flex: { xs: '1', md: '0 0 300px' } }}>
          <Card sx={{ height: 'fit-content' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                fullWidth
                onClick={() => setOpenDialog(true)}
                sx={{ mb: 2 }}
              >
                Create New Ticket
              </Button>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
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

        {/* Support Tickets */}
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                My Support Tickets
              </Typography>
              
              {tickets.length === 0 ? (
                <Alert severity="info">
                  You don't have any support tickets yet. Create one if you need assistance!
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Ticket ID</TableCell>
                        <TableCell>Title</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Created</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tickets.map((ticket) => (
                        <React.Fragment key={ticket.id}>
                          <TableRow>
                            <TableCell>#{ticket.id.slice(-8)}</TableCell>
                            <TableCell>{ticket.title}</TableCell>
                            <TableCell>
                              <Chip 
                                label={ticket.status} 
                                color={getStatusColor(ticket.status) as any}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={ticket.priority} 
                                color={getPriorityColor(ticket.priority) as any}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {new Date(ticket.created).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                          {ticket.description && (
                            <TableRow>
                              <TableCell colSpan={5} style={{ paddingLeft: '40px', backgroundColor: '#f5f5f5' }}>
                                <Typography variant="subtitle2" gutterBottom>
                                  <strong>Description:</strong>
                                </Typography>
                                <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                                  {ticket.description}
                                </Typography>
                                {ticket.adminResponse && (
                                  <Box sx={{ mt: 2, p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                                    <Typography variant="subtitle2" color="primary" gutterBottom>
                                      <strong>Admin Response:</strong>
                                    </Typography>
                                    <Typography variant="body2">
                                      {ticket.adminResponse}
                                    </Typography>
                                  </Box>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* FAQ Section */}
      <Box sx={{ mt: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <HelpIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Frequently Asked Questions
            </Typography>
            {faqs.map((faq) => (
              <Accordion key={faq.id}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">
                    <QuestionAnswerIcon sx={{ verticalAlign: 'middle', mr: 1, fontSize: '1.2rem' }} />
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
          </CardContent>
        </Card>
      </Box>

      {/* Create Ticket Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Support Ticket</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Ticket Title"
            fullWidth
            variant="outlined"
            value={newTicket.title}
            onChange={(e) => setNewTicket(prev => ({ ...prev, title: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={newTicket.description}
            onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            select
            margin="dense"
            label="Priority"
            fullWidth
            variant="outlined"
            value={newTicket.priority}
            onChange={(e) => setNewTicket(prev => ({ 
              ...prev, 
              priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent'
            }))}
            SelectProps={{
              native: true,
            }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateTicket} 
            variant="contained"
            disabled={loading || !newTicket.title.trim() || !newTicket.description.trim()}
          >
            {loading ? 'Creating...' : 'Create Ticket'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SupportCenter;
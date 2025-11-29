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
import { useAuth } from '../contexts/AuthContext';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created: string;
  lastUpdated: string;
}

const SupportCenter: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
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
    // Load existing tickets (mock data for now)
    const mockTickets: Ticket[] = [
      {
        id: '1',
        title: 'Internet Speed Issue',
        description: 'My internet speed is slower than expected',
        status: 'in-progress',
        priority: 'medium',
        created: '2024-01-15T10:30:00Z',
        lastUpdated: '2024-01-16T09:15:00Z'
      }
    ];
    setTickets(mockTickets);
  }, []);

  const handleCreateTicket = async () => {
    if (!newTicket.title.trim() || !newTicket.description.trim()) return;

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const ticket: Ticket = {
        id: Date.now().toString(),
        title: newTicket.title,
        description: newTicket.description,
        status: 'open',
        priority: newTicket.priority,
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      setTickets(prev => [ticket, ...prev]);
      setNewTicket({ title: '', description: '', priority: 'medium' });
      setOpenDialog(false);
    } catch (error) {
      console.error('Error creating ticket:', error);
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
                        <TableRow key={ticket.id}>
                          <TableCell>#{ticket.id}</TableCell>
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
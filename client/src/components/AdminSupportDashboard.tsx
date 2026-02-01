/**
 * Admin Support Dashboard
 * Comprehensive ticket management for administrators
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Alert,
    Snackbar,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    LinearProgress,
    Divider,
    Avatar,
    Badge,
    Tab,
    Tabs,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    ListItemButton
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Search as SearchIcon,
    Send as SendIcon,
    Close as CloseIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    Info as InfoIcon,
    Person as PersonIcon,
    Schedule as ScheduleIcon,
    TrendingUp as TrendingUpIcon,
    Assignment as AssignmentIcon,
    Flag as FlagIcon,
    ArrowUpward as EscalateIcon,
    MoreVert as MoreIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface TicketMessage {
    _id: string;
    senderType: 'customer' | 'agent' | 'system';
    senderName: string;
    content: string;
    isInternal?: boolean;
    createdAt: string;
}

interface Ticket {
    _id: string;
    ticketNumber: string;
    customer: { _id: string; firstName: string; lastName: string; email: string };
    customerName: string;
    customerEmail: string;
    subject: string;
    description: string;
    category: string;
    status: string;
    priority: string;
    assignedTo?: { _id: string; firstName: string; lastName: string };
    assignedToName?: string;
    createdAt: string;
    updatedAt: string;
    messages: TicketMessage[];
    sla?: {
        responseDeadline?: string;
        resolutionDeadline?: string;
        responseBreached?: boolean;
        resolutionBreached?: boolean;
    };
    aiAnalysis?: {
        suggestedCategory: string;
        suggestedPriority: string;
        suggestedResponses: string[];
    };
}

interface Agent {
    _id: string;
    name: string;
    email: string;
    openTickets: number;
}

interface Statistics {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    urgent: number;
    high: number;
    avgSatisfaction: number | null;
    slaBreached: number;
}

const AdminSupportDashboard: React.FC = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [statistics, setStatistics] = useState<Statistics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [ticketDialog, setTicketDialog] = useState(false);
    const [assignDialog, setAssignDialog] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [isInternalNote, setIsInternalNote] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);

    // Filters
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState(0);

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

    // Load tickets
    const loadTickets = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const params = new URLSearchParams();

            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (priorityFilter !== 'all') params.append('priority', priorityFilter);
            if (categoryFilter !== 'all') params.append('category', categoryFilter);
            if (searchQuery) params.append('search', searchQuery);

            const response = await axios.get(
                `${API_URL}/support/admin/tickets?${params.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                setTickets(response.data.data.tickets);
                setStatistics(response.data.data.summary);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load tickets');
        } finally {
            setLoading(false);
        }
    }, [API_URL, statusFilter, priorityFilter, categoryFilter, searchQuery]);

    // Load agents
    const loadAgents = useCallback(async () => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get(
                `${API_URL}/support/admin/agents`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                setAgents(response.data.data);
            }
        } catch (err) {
            console.error('Failed to load agents:', err);
        }
    }, [API_URL]);

    useEffect(() => {
        loadTickets();
        loadAgents();
    }, [loadTickets, loadAgents]);

    // Load ticket details
    const loadTicketDetails = async (ticketId: string) => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get(
                `${API_URL}/support/tickets/${ticketId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                setSelectedTicket(response.data.data);
                setTicketDialog(true);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load ticket');
        }
    };

    // Send message/reply
    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedTicket) return;

        setSendingMessage(true);
        try {
            const token = localStorage.getItem('access_token');

            await axios.post(
                `${API_URL}/support/tickets/${selectedTicket._id}/messages`,
                { content: newMessage, isInternal: isInternalNote },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setNewMessage('');
            setIsInternalNote(false);
            await loadTicketDetails(selectedTicket._id);
            setSuccess('Message sent!');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send message');
        } finally {
            setSendingMessage(false);
        }
    };

    // Assign ticket
    const handleAssignTicket = async (agentId: string) => {
        if (!selectedTicket) return;

        try {
            const token = localStorage.getItem('access_token');

            await axios.put(
                `${API_URL}/support/admin/tickets/${selectedTicket._id}/assign`,
                { agentId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setAssignDialog(false);
            setSuccess('Ticket assigned successfully!');
            loadTickets();
            loadAgents();
            await loadTicketDetails(selectedTicket._id);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to assign ticket');
        }
    };

    // Update ticket status
    const handleUpdateStatus = async (status: string) => {
        if (!selectedTicket) return;

        try {
            const token = localStorage.getItem('access_token');

            await axios.put(
                `${API_URL}/support/admin/tickets/${selectedTicket._id}/status`,
                { status },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setSuccess(`Ticket marked as ${status}`);
            loadTickets();
            await loadTicketDetails(selectedTicket._id);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update status');
        }
    };

    // Update priority
    const handleUpdatePriority = async (priority: string) => {
        if (!selectedTicket) return;

        try {
            const token = localStorage.getItem('access_token');

            await axios.put(
                `${API_URL}/support/admin/tickets/${selectedTicket._id}/priority`,
                { priority },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setSuccess(`Priority changed to ${priority}`);
            loadTickets();
            await loadTicketDetails(selectedTicket._id);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update priority');
        }
    };

    // Escalate ticket
    const handleEscalate = async () => {
        if (!selectedTicket) return;

        const reason = window.prompt('Escalation reason:');
        if (!reason) return;

        try {
            const token = localStorage.getItem('access_token');

            await axios.put(
                `${API_URL}/support/admin/tickets/${selectedTicket._id}/escalate`,
                { reason },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setSuccess('Ticket escalated!');
            loadTickets();
            await loadTicketDetails(selectedTicket._id);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to escalate');
        }
    };

    // Status helpers
    const getStatusInfo = (status: string) => {
        const map: Record<string, { color: any; label: string }> = {
            'open': { color: 'info', label: 'Open' },
            'assigned': { color: 'primary', label: 'Assigned' },
            'in-progress': { color: 'warning', label: 'In Progress' },
            'pending-customer': { color: 'secondary', label: 'Pending Customer' },
            'resolved': { color: 'success', label: 'Resolved' },
            'closed': { color: 'default', label: 'Closed' }
        };
        return map[status] || { color: 'default', label: status };
    };

    const getPriorityColor = (priority: string) => {
        const colors: Record<string, any> = {
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

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold" color="primary">
                    🎫 Support Ticket Management
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={loadTickets}
                    disabled={loading}
                >
                    Refresh
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {/* Statistics Cards */}
            {statistics && (
                <Grid container spacing={2} mb={3}>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                            <CardContent>
                                <Typography variant="h3" fontWeight="bold">{statistics.open}</Typography>
                                <Typography variant="body2">Open Tickets</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                            <CardContent>
                                <Typography variant="h3" fontWeight="bold">{statistics.urgent + statistics.high}</Typography>
                                <Typography variant="body2">High Priority</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                            <CardContent>
                                <Typography variant="h3" fontWeight="bold">{statistics.inProgress}</Typography>
                                <Typography variant="body2">In Progress</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3 }}>
                        <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
                            <CardContent>
                                <Typography variant="h3" fontWeight="bold">{statistics.resolved}</Typography>
                                <Typography variant="body2">Resolved</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Filters */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Search tickets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} /> }}
                            />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={statusFilter}
                                    label="Status"
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <MenuItem value="all">All Status</MenuItem>
                                    <MenuItem value="open">Open</MenuItem>
                                    <MenuItem value="assigned">Assigned</MenuItem>
                                    <MenuItem value="in-progress">In Progress</MenuItem>
                                    <MenuItem value="pending-customer">Pending Customer</MenuItem>
                                    <MenuItem value="resolved">Resolved</MenuItem>
                                    <MenuItem value="closed">Closed</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Priority</InputLabel>
                                <Select
                                    value={priorityFilter}
                                    label="Priority"
                                    onChange={(e) => setPriorityFilter(e.target.value)}
                                >
                                    <MenuItem value="all">All Priority</MenuItem>
                                    <MenuItem value="urgent">Urgent</MenuItem>
                                    <MenuItem value="high">High</MenuItem>
                                    <MenuItem value="medium">Medium</MenuItem>
                                    <MenuItem value="low">Low</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={categoryFilter}
                                    label="Category"
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                >
                                    <MenuItem value="all">All Categories</MenuItem>
                                    <MenuItem value="technical">🔧 Technical</MenuItem>
                                    <MenuItem value="billing">💳 Billing</MenuItem>
                                    <MenuItem value="service">📡 Service</MenuItem>
                                    <MenuItem value="network">🌐 Network</MenuItem>
                                    <MenuItem value="account">👤 Account</MenuItem>
                                    <MenuItem value="general">📋 General</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <Button
                                variant="outlined"
                                onClick={() => {
                                    setStatusFilter('all');
                                    setPriorityFilter('all');
                                    setCategoryFilter('all');
                                    setSearchQuery('');
                                }}
                            >
                                Clear Filters
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Tickets Table */}
            <Card>
                <CardContent>
                    {loading ? (
                        <Box display="flex" justifyContent="center" py={4}>
                            <CircularProgress />
                        </Box>
                    ) : tickets.length === 0 ? (
                        <Alert severity="info">No tickets found matching your filters.</Alert>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                                        <TableCell><strong>Ticket #</strong></TableCell>
                                        <TableCell><strong>Customer</strong></TableCell>
                                        <TableCell><strong>Subject</strong></TableCell>
                                        <TableCell><strong>Category</strong></TableCell>
                                        <TableCell><strong>Status</strong></TableCell>
                                        <TableCell><strong>Priority</strong></TableCell>
                                        <TableCell><strong>Assigned To</strong></TableCell>
                                        <TableCell><strong>Created</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {tickets.map((ticket) => (
                                        <TableRow
                                            key={ticket._id}
                                            hover
                                            sx={{ cursor: 'pointer' }}
                                            onClick={() => loadTicketDetails(ticket._id)}
                                        >
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="bold" color="primary">
                                                    {ticket.ticketNumber}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{ticket.customerName}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {ticket.customerEmail}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                >
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
                                                    label={getStatusInfo(ticket.status).label}
                                                    color={getStatusInfo(ticket.status).color}
                                                    size="small"
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
                                                {ticket.assignedToName || (
                                                    <Typography variant="caption" color="text.secondary">Unassigned</Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption">
                                                    {new Date(ticket.createdAt).toLocaleDateString()}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>

            {/* Ticket Detail Dialog */}
            <Dialog
                open={ticketDialog}
                onClose={() => setTicketDialog(false)}
                maxWidth="lg"
                fullWidth
            >
                {selectedTicket && (
                    <>
                        <DialogTitle>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                <Box>
                                    <Typography variant="h5" fontWeight="bold">
                                        {selectedTicket.ticketNumber}
                                    </Typography>
                                    <Typography variant="subtitle1" color="text.secondary">
                                        {selectedTicket.subject}
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
                                <Box display="flex" gap={1}>
                                    <Tooltip title="Assign">
                                        <IconButton onClick={() => setAssignDialog(true)}>
                                            <PersonIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Escalate">
                                        <IconButton onClick={handleEscalate} color="warning">
                                            <EscalateIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <IconButton onClick={() => setTicketDialog(false)}>
                                        <CloseIcon />
                                    </IconButton>
                                </Box>
                            </Box>
                        </DialogTitle>

                        <DialogContent dividers>
                            <Grid container spacing={3}>
                                {/* Left: Messages */}
                                <Grid size={{ xs: 12, md: 8 }}>
                                    <Typography variant="h6" gutterBottom>Conversation</Typography>

                                    <Box sx={{ maxHeight: 400, overflowY: 'auto', mb: 2, bgcolor: 'grey.50', borderRadius: 2, p: 2 }}>
                                        {selectedTicket.messages.map((msg, idx) => (
                                            <Box
                                                key={idx}
                                                sx={{
                                                    mb: 2,
                                                    p: 2,
                                                    borderRadius: 2,
                                                    bgcolor: msg.senderType === 'customer' ? 'white' :
                                                        msg.senderType === 'system' ? 'grey.200' :
                                                            msg.isInternal ? 'warning.light' : 'primary.light',
                                                    color: msg.senderType === 'agent' && !msg.isInternal ? 'white' : 'inherit',
                                                    borderLeft: msg.isInternal ? '4px solid orange' : 'none'
                                                }}
                                            >
                                                <Box display="flex" justifyContent="space-between" mb={0.5}>
                                                    <Typography variant="caption" fontWeight="bold">
                                                        {msg.senderName} {msg.isInternal && '(Internal Note)'}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {new Date(msg.createdAt).toLocaleString()}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                                    {msg.content}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>

                                    {/* Reply Box */}
                                    <Box>
                                        <Box display="flex" gap={1} mb={1}>
                                            <Button
                                                size="small"
                                                variant={!isInternalNote ? 'contained' : 'outlined'}
                                                onClick={() => setIsInternalNote(false)}
                                            >
                                                Reply to Customer
                                            </Button>
                                            <Button
                                                size="small"
                                                variant={isInternalNote ? 'contained' : 'outlined'}
                                                color="warning"
                                                onClick={() => setIsInternalNote(true)}
                                            >
                                                Internal Note
                                            </Button>
                                        </Box>
                                        <Box display="flex" gap={1}>
                                            <TextField
                                                fullWidth
                                                multiline
                                                rows={3}
                                                placeholder={isInternalNote ? "Add internal note..." : "Type your reply..."}
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
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

                                        {/* AI Suggested Responses */}
                                        {selectedTicket.aiAnalysis?.suggestedResponses && (
                                            <Box mt={2}>
                                                <Typography variant="caption" color="text.secondary">
                                                    AI Suggested Responses:
                                                </Typography>
                                                <Box display="flex" gap={1} flexWrap="wrap" mt={0.5}>
                                                    {selectedTicket.aiAnalysis.suggestedResponses.map((response, idx) => (
                                                        <Chip
                                                            key={idx}
                                                            label={response.substring(0, 40) + '...'}
                                                            size="small"
                                                            variant="outlined"
                                                            onClick={() => setNewMessage(response)}
                                                            sx={{ cursor: 'pointer' }}
                                                        />
                                                    ))}
                                                </Box>
                                            </Box>
                                        )}
                                    </Box>
                                </Grid>

                                {/* Right: Details & Actions */}
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <Typography variant="h6" gutterBottom>Details</Typography>

                                    <List dense>
                                        <ListItem>
                                            <ListItemAvatar>
                                                <Avatar sx={{ bgcolor: 'primary.light' }}>
                                                    <PersonIcon />
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary="Customer"
                                                secondary={`${selectedTicket.customerName} (${selectedTicket.customerEmail})`}
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemAvatar>
                                                <Avatar sx={{ bgcolor: 'secondary.light' }}>
                                                    <AssignmentIcon />
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary="Assigned To"
                                                secondary={selectedTicket.assignedToName || 'Unassigned'}
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemAvatar>
                                                <Avatar sx={{ bgcolor: 'info.light' }}>
                                                    <ScheduleIcon />
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary="Created"
                                                secondary={new Date(selectedTicket.createdAt).toLocaleString()}
                                            />
                                        </ListItem>
                                    </List>

                                    <Divider sx={{ my: 2 }} />

                                    <Typography variant="subtitle2" gutterBottom>Quick Actions</Typography>

                                    <Box display="flex" flexDirection="column" gap={1}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Update Status</InputLabel>
                                            <Select
                                                value={selectedTicket.status}
                                                label="Update Status"
                                                onChange={(e) => handleUpdateStatus(e.target.value)}
                                            >
                                                <MenuItem value="open">Open</MenuItem>
                                                <MenuItem value="assigned">Assigned</MenuItem>
                                                <MenuItem value="in-progress">In Progress</MenuItem>
                                                <MenuItem value="pending-customer">Pending Customer</MenuItem>
                                                <MenuItem value="resolved">Resolved</MenuItem>
                                                <MenuItem value="closed">Closed</MenuItem>
                                            </Select>
                                        </FormControl>

                                        <FormControl fullWidth size="small">
                                            <InputLabel>Update Priority</InputLabel>
                                            <Select
                                                value={selectedTicket.priority}
                                                label="Update Priority"
                                                onChange={(e) => handleUpdatePriority(e.target.value)}
                                            >
                                                <MenuItem value="low">Low</MenuItem>
                                                <MenuItem value="medium">Medium</MenuItem>
                                                <MenuItem value="high">High</MenuItem>
                                                <MenuItem value="urgent">Urgent</MenuItem>
                                            </Select>
                                        </FormControl>

                                        <Button
                                            variant="outlined"
                                            startIcon={<PersonIcon />}
                                            onClick={() => setAssignDialog(true)}
                                        >
                                            Assign Agent
                                        </Button>

                                        {!['resolved', 'closed'].includes(selectedTicket.status) && (
                                            <Button
                                                variant="contained"
                                                color="success"
                                                startIcon={<CheckCircleIcon />}
                                                onClick={() => handleUpdateStatus('resolved')}
                                            >
                                                Mark Resolved
                                            </Button>
                                        )}
                                    </Box>
                                </Grid>
                            </Grid>
                        </DialogContent>
                    </>
                )}
            </Dialog>

            {/* Assign Agent Dialog */}
            <Dialog open={assignDialog} onClose={() => setAssignDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Assign Ticket to Agent</DialogTitle>
                <DialogContent>
                    <List>
                        {agents.map((agent) => (
                            <ListItemButton
                                key={agent._id}
                                onClick={() => handleAssignTicket(agent._id)}
                            >
                                <ListItemAvatar>
                                    <Badge badgeContent={agent.openTickets} color="primary">
                                        <Avatar>{agent.name.charAt(0)}</Avatar>
                                    </Badge>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={agent.name}
                                    secondary={`${agent.email} • ${agent.openTickets} open tickets`}
                                />
                            </ListItemButton>
                        ))}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAssignDialog(false)}>Cancel</Button>
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

export default AdminSupportDashboard;

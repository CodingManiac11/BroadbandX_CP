import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Eye, MessageSquare, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useNotificationHelpers } from './NotificationSystem';
import { TicketDetailModal, CreateTicketModal } from './SupportTicketModals';

interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  category: 'technical' | 'billing' | 'service' | 'general';
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  messages: TicketMessage[];
}

interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderType: 'customer' | 'admin';
  message: string;
  createdAt: Date;
  attachments?: string[];
}

interface SupportTicketSystemProps {
  currentUserId: string;
  currentUserRole: 'admin' | 'customer';
}

export const SupportTicketSystem: React.FC<SupportTicketSystemProps> = ({ 
  currentUserId, 
  currentUserRole 
}) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const { showSuccess, showError, showWarning } = useNotificationHelpers();

  // Fetch real tickets from API instead of using mock data
  useEffect(() => {
    // TODO: Implement real API call to fetch support tickets
    // For now, start with empty tickets array
    setTickets([]);
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-600 bg-blue-100';
      case 'in-progress': return 'text-yellow-600 bg-yellow-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'closed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="w-4 h-4" />;
      case 'in-progress': return <AlertTriangle className="w-4 h-4" />;
      case 'resolved': return <CheckCircle className="w-4 h-4" />;
      case 'closed': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    try {
      await fetch(`/api/notifications/ticket-update/${ticketId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerEmail: ticket.customerEmail,
          customerName: ticket.customerName,
          ticketNumber: ticket.ticketNumber,
          status: newStatus,
          message: `Ticket status has been updated to ${newStatus}`
        })
      });

      setTickets(prev => prev.map(t => 
        t.id === ticketId 
          ? { ...t, status: newStatus as SupportTicket['status'], updatedAt: new Date() }
          : t
      ));
      showSuccess('Status Updated', `Ticket status changed to ${newStatus}`);
    } catch (error) {
      console.error('Failed to send status update email:', error);
      // Still update the UI even if email fails
      setTickets(prev => prev.map(t => 
        t.id === ticketId 
          ? { ...t, status: newStatus as SupportTicket['status'], updatedAt: new Date() }
          : t
      ));
      showWarning('Status Updated', `Ticket status changed to ${newStatus} (email notification failed)`);
    }
  };

  const addMessage = async (ticketId: string, message: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const newMessage: TicketMessage = {
      id: Math.random().toString(36).substr(2, 9),
      ticketId,
      senderId: currentUserId,
      senderName: currentUserRole === 'admin' ? 'Admin Support' : 'Customer',
      senderType: currentUserRole,
      message,
      createdAt: new Date()
    };

    // Add message locally
    setTickets(prev => prev.map(t => 
      t.id === ticketId 
        ? { 
            ...t, 
            messages: [...t.messages, newMessage],
            updatedAt: new Date()
          }
        : t
    ));

    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => prev ? {
        ...prev,
        messages: [...prev.messages, newMessage]
      } : null);
    }

    // Send email notification
    try {
      await fetch(`/api/notifications/ticket-update/${ticketId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerEmail: ticket.customerEmail,
          customerName: ticket.customerName,
          ticketNumber: ticket.ticketNumber,
          status: ticket.status,
          message: `New message from ${newMessage.senderName}: ${message}`
        })
      });
      showSuccess('Message Sent', 'Your message has been added to the ticket');
    } catch (error) {
      console.error('Failed to send message notification email:', error);
      showWarning('Message Sent', 'Message added to ticket (email notification failed)');
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Support Tickets</h2>
        {currentUserRole === 'customer' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Create Ticket
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {filteredTickets.map((ticket) => (
          <div
            key={ticket.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedTicket(ticket)}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-gray-500">{ticket.ticketNumber}</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority.toUpperCase()}
                </span>
                <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                  {getStatusIcon(ticket.status)}
                  {ticket.status.replace('-', ' ').toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {ticket.updatedAt.toLocaleDateString()}
              </span>
            </div>
            
            <h3 className="font-medium text-gray-900 mb-1">{ticket.subject}</h3>
            <p className="text-sm text-gray-600 mb-2">{ticket.customerName} • {ticket.customerEmail}</p>
            <p className="text-sm text-gray-500 line-clamp-2">{ticket.description}</p>
            
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs text-gray-500">
                {ticket.messages.length} message{ticket.messages.length !== 1 ? 's' : ''}
              </span>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdateStatus={updateTicketStatus}
          onAddMessage={addMessage}
          currentUserRole={currentUserRole}
        />
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (ticketData) => {
            const newTicket: SupportTicket = {
              subject: ticketData.subject || 'No Subject',
              description: ticketData.description || 'No description provided',
              priority: ticketData.priority || 'low',
              category: ticketData.category || 'general',
              id: Math.random().toString(36).substr(2, 9),
              ticketNumber: `TKT-${String(tickets.length + 1).padStart(3, '0')}`,
              customerId: currentUserId,
              customerName: 'Current User',
              customerEmail: 'user@example.com',
              status: 'open',
              createdAt: new Date(),
              updatedAt: new Date(),
              messages: [{
                id: Math.random().toString(36).substr(2, 9),
                ticketId: '',
                senderId: currentUserId,
                senderName: 'Current User',
                senderType: 'customer',
                message: ticketData.description || '',
                createdAt: new Date()
              }]
            };

            setTickets(prev => [newTicket, ...prev]);
            
            try {
              await fetch(`/api/notifications/ticket-update/${newTicket.id}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  customerEmail: newTicket.customerEmail,
                  customerName: newTicket.customerName,
                  ticketNumber: newTicket.ticketNumber,
                  status: newTicket.status,
                  message: `Your support ticket has been created. Our team will assist you shortly.`
                })
              });
              showSuccess('Ticket Created', 'Your support ticket has been created successfully');
            } catch (error) {
              console.error('Failed to send ticket creation email:', error);
              showWarning('Ticket Created', 'Ticket created successfully (email notification failed)');
            }
          }}
        />
      )}
    </div>
  );
};

// Additional components for modals would go here...
// TicketDetailModal and CreateTicketModal components
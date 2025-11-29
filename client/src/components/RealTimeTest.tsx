import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Alert,
  Stack,
  Chip,
  Divider
} from '@mui/material';
import { realTimeService } from '../services/realTimeService';

const RealTimeTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [messages, setMessages] = useState<any[]>([]);
  const [testUserId] = useState('68cbd462ba125ac54a8d72da'); // Test user ID

  useEffect(() => {
    // Connect to real-time service
    const socket = realTimeService.connect(testUserId);

    if (!socket) {
      setConnectionStatus('Socket.IO not available');
      return;
    }

    socket.on('connect', () => {
      setConnectionStatus('Connected');
      addMessage('Connected to server', 'success');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('Disconnected');
      addMessage('Disconnected from server', 'error');
    });

    socket.on('connect_error', (error: any) => {
      setConnectionStatus('Connection Error');
      addMessage(`Connection error: ${error.message}`, 'error');
    });

    // Listen to all plan request events
    const events = [
      'plan_request_created',
      'plan_request_status_changed',
      'plan_request_approved',
      'plan_request_rejected',
      'plan_request_cancelled',
      'admin_plan_request_created',
      'admin_plan_request_approved',
      'admin_plan_request_rejected'
    ];

    events.forEach(event => {
      socket.on(event, (data: any) => {
        addMessage(`📡 ${event}: ${data.message}`, 'info');
      });
    });

    return () => {
      realTimeService.disconnect();
    };
  }, [testUserId]);

  const addMessage = (text: string, type: 'success' | 'error' | 'info') => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      text,
      type,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const joinAdminRoom = () => {
    realTimeService.joinAdminRoom();
    addMessage('Joined admin room', 'success');
  };

  const testCreateRequest = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/plan-requests/test-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const result = await response.json();
      if (result.success) {
        addMessage('✅ Test plan request created', 'success');
      } else {
        addMessage(`❌ ${result.message}`, 'error');
      }
    } catch (error) {
      addMessage(`❌ Error: ${error}`, 'error');
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Real-Time System Test
      </Typography>

      {/* Connection Status */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">Connection Status:</Typography>
            <Chip 
              label={connectionStatus}
              color={connectionStatus === 'Connected' ? 'success' : 'error'}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Test Controls</Typography>
          <Stack direction="row" spacing={2}>
            <Button variant="contained" onClick={joinAdminRoom}>
              Join Admin Room
            </Button>
            <Button variant="outlined" onClick={testCreateRequest}>
              Create Test Request
            </Button>
            <Button variant="text" onClick={clearMessages}>
              Clear Messages
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Real-Time Messages</Typography>
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {messages.length === 0 ? (
              <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No messages yet. Try creating a test request or check the connection.
              </Typography>
            ) : (
              messages.map((message) => (
                <Box key={message.id} sx={{ mb: 1 }}>
                  <Alert severity={message.type} sx={{ mb: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography>{message.text}</Typography>
                      <Typography variant="caption">{message.timestamp}</Typography>
                    </Stack>
                  </Alert>
                </Box>
              ))
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RealTimeTest;
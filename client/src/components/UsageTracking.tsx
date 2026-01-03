import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
  Button,
} from '@mui/material';
import {
  DataUsage as DataUsageIcon,
  CloudDownload as DownloadIcon,
  CloudUpload as UploadIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { apiClient } from '../services/api';
import { downloadCSV } from '../utils/csvExport';

interface UsageData {
  period: string;
  totalUsage: number;
  downloadUsage: number;
  uploadUsage: number;
  dataLimit: number;
  dataLimitGB?: number; // Add optional GB field from backend
  usagePercentage: number;
  lastUpdated: string;
  billingCycle: {
    start: string;
    end: string;
  };
}

interface UsageHistory {
  date: string;
  download: number;
  upload: number;
  total: number;
}

const UsageTracking: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [currentUsage, setCurrentUsage] = useState<UsageData | null>(null);
  const [usageHistory, setUsageHistory] = useState<UsageHistory[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch current usage
      const currentResponse = await apiClient.get('/usage/current');
      const currentData = currentResponse.data as any;
      if (currentData.success) {
        setCurrentUsage(currentData.data);
      }

      // Fetch usage history
      const historyResponse = await apiClient.get('/usage/history?limit=7');
      const historyData = historyResponse.data as any;
      if (historyData.success) {
        setUsageHistory(historyData.data);
      }
    } catch (err: any) {
      console.error('Error fetching usage data:', err);
      setError(err.response?.data?.message || 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', { 
        month: 'numeric', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getUsageStatus = (percentage: number) => {
    if (percentage >= 90) return { color: 'error', icon: <WarningIcon />, text: 'Critical' };
    if (percentage >= 75) return { color: 'warning', icon: <WarningIcon />, text: 'High' };
    return { color: 'success', icon: <CheckCircleIcon />, text: 'Normal' };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!currentUsage) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No usage data available. Usage tracking will begin once your subscription is active.
      </Alert>
    );
  }

  const status = getUsageStatus(currentUsage.usagePercentage);

  return (
    <Box>
      {/* Current Usage Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <DataUsageIcon color="primary" fontSize="large" />
              <Typography variant="h5" fontWeight="bold">
                Current Usage
              </Typography>
            </Box>
            <Chip
              label={status.text}
              color={status.color as any}
              icon={status.icon}
              size="small"
            />
          </Box>

          <Typography variant="body2" color="text.secondary" gutterBottom>
            Billing Period: {formatDate(currentUsage.billingCycle.start)} - {formatDate(currentUsage.billingCycle.end)}
          </Typography>

          <Box mt={3} mb={2}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body1" fontWeight="medium">
                Data Consumed: {formatBytes(currentUsage.totalUsage)}
              </Typography>
            </Box>
            <LinearProgress
              variant="indeterminate"
              color="primary"
              sx={{ height: 10, borderRadius: 5 }}
            />
          </Box>

          {/* Usage Breakdown */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mt={2}>
            <Box flex={1}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 2 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <DownloadIcon color="primary" />
                  <Typography variant="subtitle2" color="text.secondary">
                    Download
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight="bold">
                  {formatBytes(currentUsage.downloadUsage)}
                </Typography>
              </Paper>
            </Box>
            <Box flex={1}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'secondary.50', borderRadius: 2 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <UploadIcon color="secondary" />
                  <Typography variant="subtitle2" color="text.secondary">
                    Upload
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight="bold">
                  {formatBytes(currentUsage.uploadUsage)}
                </Typography>
              </Paper>
            </Box>
          </Stack>

          <Typography variant="caption" color="text.secondary" display="block" mt={2}>
            Last updated: {formatDate(currentUsage.lastUpdated)} {new Date(currentUsage.lastUpdated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        </CardContent>
      </Card>

      {/* Usage Warnings */}
      {currentUsage.usagePercentage >= 75 && (
        <Alert
          severity={currentUsage.usagePercentage >= 90 ? 'error' : 'warning'}
          icon={<WarningIcon />}
          sx={{ mb: 3 }}
        >
          <Typography variant="body2" fontWeight="medium">
            {currentUsage.usagePercentage >= 90
              ? 'You have used over 90% of your data allowance! Consider upgrading your plan.'
              : 'You have used over 75% of your data allowance. Monitor your usage to avoid overages.'}
          </Typography>
        </Alert>
      )}

      {/* Usage History */}
      {usageHistory.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Usage History (Last 7 Days)
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell align="right"><strong>Download</strong></TableCell>
                    <TableCell align="right"><strong>Upload</strong></TableCell>
                    <TableCell align="right"><strong>Total</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usageHistory.map((day, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{new Date(day.date).toLocaleDateString()}</TableCell>
                      <TableCell align="right">{formatBytes(day.download)}</TableCell>
                      <TableCell align="right">{formatBytes(day.upload)}</TableCell>
                      <TableCell align="right">
                        <strong>{formatBytes(day.total)}</strong>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default UsageTracking;

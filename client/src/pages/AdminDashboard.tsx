import React, { useState, useEffect, useCallback } from 'react';
import * as MUI from '@mui/material';
import * as Icons from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { adminService } from '../services/adminService';
import { User, Subscription, DashboardStats } from '../types/index';
import StatCard from '../components/StatCard';
import UserManagementContainer from '../components/UserManagementContainer';
import SubscriptionsPage from './SubscriptionsPage';
import FeedbackManagement from '../components/FeedbackManagement';

// API Response type that matches what backend actually returns
interface DashboardStatsResponse {
  totalUsers: number;
  totalCustomers: number;
  totalPlans: number;
  activeSubscriptions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  newUsersThisMonth: number;
  userGrowthRate: number;
  expiringSoon: number;
  subscriptionsByStatus: Array<{ _id: string; count: number }>;
  popularPlansThisMonth: any[];
  recentUsers: any[];
  recentSubscriptions: any[];
}

const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState<Partial<DashboardStatsResponse>>({
    totalUsers: 0,
    totalCustomers: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    newUsersThisMonth: 0,
    expiringSoon: 0,
    userGrowthRate: 0
  });
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch dashboard stats
      const stats = await adminService.getDashboardStats() as unknown as DashboardStatsResponse;
      
      console.log('Dashboard stats received:', stats);
      
      setDashboardData({
        totalUsers: stats.totalUsers || 0,
        totalCustomers: stats.totalCustomers || 0,
        activeSubscriptions: stats.activeSubscriptions || 0,
        totalRevenue: stats.totalRevenue || 0,
        monthlyRevenue: stats.monthlyRevenue || 0,
        newUsersThisMonth: stats.newUsersThisMonth || 0,
        expiringSoon: stats.expiringSoon || 0,
        userGrowthRate: stats.userGrowthRate || 0
      });

      // Fetch initial users (for the Users section)
      if (activeSection === 'users') {
        const usersData = await adminService.getAllUsers(1, 20);
        setUsers(usersData.users || []);
      }

      // Fetch initial subscriptions (for the Subscriptions section)
      if (activeSection === 'subscriptions') {
        const subsData = await adminService.getAllSubscriptions({ page: 1, limit: 20 });
        setSubscriptions(subsData.data || []);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeSection]);

  // Function to refresh dashboard stats only (for real-time updates)
  const refreshDashboardStats = useCallback(async () => {
    try {
      const stats = await adminService.getDashboardStats() as unknown as DashboardStatsResponse;
      setDashboardData({
        totalUsers: stats.totalUsers || 0,
        totalCustomers: stats.totalCustomers || 0,
        activeSubscriptions: stats.activeSubscriptions || 0,
        totalRevenue: stats.totalRevenue || 0,
        monthlyRevenue: stats.monthlyRevenue || 0,
        newUsersThisMonth: stats.newUsersThisMonth || 0,
        expiringSoon: stats.expiringSoon || 0,
        userGrowthRate: stats.userGrowthRate || 0
      });
    } catch (err) {
      console.error('Failed to refresh dashboard stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    if (section === 'users' && users.length === 0) {
      fetchUsers();
    } else if (section === 'subscriptions' && subscriptions.length === 0) {
      fetchSubscriptions();
    }
  };

  const fetchUsers = async () => {
    try {
      const usersData = await adminService.getAllUsers(1, 20);
      setUsers(usersData.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users');
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const subsData = await adminService.getAllSubscriptions({ page: 1, limit: 20 });
      setSubscriptions(subsData.data || []);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError('Failed to fetch subscriptions');
    }
  };

  const handleRetry = () => {
    fetchDashboardData();
  };

  const drawerWidth = 280;

  const menuItems = [
    { text: 'Dashboard', icon: <Icons.Dashboard />, section: 'dashboard' },
    { text: 'Users', icon: <Icons.People />, section: 'users' },
    { text: 'Subscriptions', icon: <Icons.Subscriptions />, section: 'subscriptions' },
    { text: 'Support', icon: <Icons.Support />, section: 'support' },
    { text: 'AI Pricing', icon: <Icons.Psychology />, section: 'ai-pricing' },
    { text: 'Logout', icon: <Icons.ExitToApp />, section: 'logout' }
  ];

  const handleMenuClick = (section: string) => {
    if (section === 'logout') {
      logout();
      return;
    }
    handleSectionChange(section);
    setMobileOpen(false);
  };

  const drawer = (
    <div>
      <MUI.Toolbar>
        <MUI.Typography variant="h6" noWrap component="div" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          Admin Panel
        </MUI.Typography>
      </MUI.Toolbar>
      <MUI.Divider />
      <MUI.List>
        {menuItems.map((item) => (
          <MUI.ListItem key={item.text} disablePadding>
            <MUI.ListItemButton 
              selected={activeSection === item.section}
              onClick={() => handleMenuClick(item.section)}
            >
              <MUI.ListItemIcon sx={{ color: activeSection === item.section ? 'primary.main' : 'inherit' }}>
                {item.icon}
              </MUI.ListItemIcon>
              <MUI.ListItemText primary={item.text} />
            </MUI.ListItemButton>
          </MUI.ListItem>
        ))}
      </MUI.List>
    </div>
  );

  const renderError = () => (
    <MUI.Alert 
      severity="error" 
      action={
        <MUI.Button color="inherit" size="small" onClick={handleRetry}>
          Retry
        </MUI.Button>
      }
      sx={{ mb: 2 }}
    >
      {error}
    </MUI.Alert>
  );

  const renderDashboard = () => (
    <MUI.Container maxWidth="xl">
      <MUI.Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>
        Dashboard Overview
      </MUI.Typography>
      
      {error && renderError()}

      <MUI.Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr 1fr' },
          gap: 3,
          mb: 4 
        }}
      >
        <MUI.Box>
          <StatCard
            title="Total Users"
            value={dashboardData.totalUsers || 0}
            icon={<Icons.People />}
            color="primary"
          />
        </MUI.Box>
        <MUI.Box>
          <StatCard
            title="Total Customers"
            value={dashboardData.totalCustomers || 0}
            icon={<Icons.PersonAdd />}
            color="secondary"
          />
        </MUI.Box>
        <MUI.Box>
          <StatCard
            title="Active Subscriptions"
            value={dashboardData.activeSubscriptions || 0}
            icon={<Icons.Subscriptions />}
            color="success"
          />
        </MUI.Box>
        <MUI.Box>
          <StatCard
            title="Total Revenue"
            value={`$${(dashboardData.totalRevenue || 0).toLocaleString()}`}
            icon={<Icons.AttachMoney />}
            color="info"
          />
        </MUI.Box>
        <MUI.Box>
          <StatCard
            title="Monthly Revenue"
            value={`$${(dashboardData.monthlyRevenue || 0).toLocaleString()}`}
            icon={<Icons.TrendingUp />}
            color="warning"
          />
        </MUI.Box>
      </MUI.Box>

      <MUI.Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3 
        }}
      >
        <MUI.Box>
          <MUI.Card sx={{ p: 3 }}>
            <MUI.Typography variant="h6" gutterBottom>
              Quick Stats
            </MUI.Typography>
            <MUI.List>
              <MUI.ListItem>
                <MUI.ListItemText 
                  primary="New Users This Month" 
                  secondary={dashboardData.newUsersThisMonth} 
                />
              </MUI.ListItem>
              <MUI.ListItem>
                <MUI.ListItemText 
                  primary="User Growth Rate" 
                  secondary={`${(dashboardData.userGrowthRate || 0).toFixed(1)}%`} 
                />
              </MUI.ListItem>
              <MUI.ListItem>
                <MUI.ListItemText 
                  primary="Expiring Soon" 
                  secondary={dashboardData.expiringSoon} 
                />
              </MUI.ListItem>
            </MUI.List>
          </MUI.Card>
        </MUI.Box>
        
        <MUI.Box>
          <MUI.Card sx={{ p: 3 }}>
            <MUI.Typography variant="h6" gutterBottom>
              Actions
            </MUI.Typography>
            <MUI.Stack spacing={2}>
              <MUI.Button
                variant="outlined"
                startIcon={<Icons.People />}
                onClick={() => handleSectionChange('users')}
                fullWidth
              >
                Manage Users
              </MUI.Button>
              <MUI.Button
                variant="outlined"
                startIcon={<Icons.Subscriptions />}
                onClick={() => handleSectionChange('subscriptions')}
                fullWidth
              >
                View Subscriptions
              </MUI.Button>
              <MUI.Button
                variant="outlined"
                startIcon={<Icons.Psychology />}
                onClick={() => handleSectionChange('ai-pricing')}
                fullWidth
              >
                AI Pricing
              </MUI.Button>
            </MUI.Stack>
          </MUI.Card>
        </MUI.Box>
      </MUI.Box>
    </MUI.Container>
  );

  const renderAIPricing = () => (
    <MUI.Container maxWidth="xl">
      <MUI.Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>
        AI Pricing Management
      </MUI.Typography>
      
      <MUI.Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
          mb: 4 
        }}
      >
        <MUI.Box>
          <MUI.Card sx={{ p: 3 }}>
            <MUI.Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icons.Psychology color="primary" />
              ML Pricing Engine
            </MUI.Typography>
            <MUI.Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              AI-powered dynamic pricing based on market conditions, demand, and competitor analysis.
            </MUI.Typography>
            <MUI.Stack spacing={2}>
              <MUI.Button
                variant="contained"
                startIcon={<Icons.Analytics />}
                onClick={() => console.log('Generate ML pricing proposal')}
              >
                Generate Pricing Proposal
              </MUI.Button>
              <MUI.Button
                variant="outlined"
                startIcon={<Icons.TrendingUp />}
                onClick={() => console.log('Market analysis')}
              >
                Market Analysis
              </MUI.Button>
            </MUI.Stack>
          </MUI.Card>
        </MUI.Box>
        
        <MUI.Box>
          <MUI.Card sx={{ p: 3 }}>
            <MUI.Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icons.History color="primary" />
              Pricing History
            </MUI.Typography>
            <MUI.Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Track all pricing changes and ML recommendations with approval workflow.
            </MUI.Typography>
            <MUI.Stack spacing={2}>
              <MUI.Button
                variant="contained"
                startIcon={<Icons.Visibility />}
                onClick={() => console.log('View pricing history')}
              >
                View History
              </MUI.Button>
              <MUI.Button
                variant="outlined"
                startIcon={<Icons.PendingActions />}
                onClick={() => console.log('Pending approvals')}
              >
                Pending Approvals
              </MUI.Button>
            </MUI.Stack>
          </MUI.Card>
        </MUI.Box>
      </MUI.Box>

      <MUI.Card sx={{ p: 3 }}>
        <MUI.Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icons.Dashboard color="primary" />
          Pricing Analytics Dashboard
        </MUI.Typography>
        
        <MUI.Box 
          sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr 1fr' },
            gap: 2,
            mt: 2 
          }}
        >
          <MUI.Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
            <MUI.Typography variant="h4" color="primary.contrastText">12</MUI.Typography>
            <MUI.Typography variant="body2" color="primary.contrastText">ML Proposals</MUI.Typography>
          </MUI.Box>
          <MUI.Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
            <MUI.Typography variant="h4" color="success.contrastText">8</MUI.Typography>
            <MUI.Typography variant="body2" color="success.contrastText">Approved Changes</MUI.Typography>
          </MUI.Box>
          <MUI.Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
            <MUI.Typography variant="h4" color="warning.contrastText">3</MUI.Typography>
            <MUI.Typography variant="body2" color="warning.contrastText">Pending Review</MUI.Typography>
          </MUI.Box>
          <MUI.Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <MUI.Typography variant="h4" color="info.contrastText">94%</MUI.Typography>
            <MUI.Typography variant="body2" color="info.contrastText">ML Accuracy</MUI.Typography>
          </MUI.Box>
        </MUI.Box>

        <MUI.Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <MUI.Button
            variant="contained"
            color="primary"
            startIcon={<Icons.Settings />}
            onClick={() => console.log('Configure ML settings')}
          >
            Configure ML Settings
          </MUI.Button>
          <MUI.Button
            variant="outlined"
            startIcon={<Icons.Assessment />}
            onClick={() => console.log('Performance metrics')}
          >
            Performance Metrics
          </MUI.Button>
          <MUI.Button
            variant="outlined"
            startIcon={<Icons.Download />}
            onClick={() => console.log('Export reports')}
          >
            Export Reports
          </MUI.Button>
        </MUI.Stack>
      </MUI.Card>
    </MUI.Container>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <MUI.Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <MUI.CircularProgress />
        </MUI.Box>
      );
    }

    switch (activeSection) {
      case 'dashboard':
        return renderDashboard();
      case 'users':
        return <UserManagementContainer onDataChange={refreshDashboardStats} />;
      case 'subscriptions':
        return <SubscriptionsPage />;
      case 'support':
        return <FeedbackManagement />;
      case 'ai-pricing':
        return renderAIPricing();
      default:
        return renderDashboard();
    }
  };

  return (
    <MUI.Box sx={{ display: 'flex' }}>
      <MUI.CssBaseline />
      
      <MUI.AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <MUI.Toolbar>
          <MUI.IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <Icons.Menu />
          </MUI.IconButton>
          <MUI.Typography variant="h6" noWrap component="div">
            {menuItems.find(item => item.section === activeSection)?.text || 'Admin Dashboard'}
          </MUI.Typography>
        </MUI.Toolbar>
      </MUI.AppBar>

      <MUI.Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <MUI.Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </MUI.Drawer>
        <MUI.Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </MUI.Drawer>
      </MUI.Box>

      <MUI.Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <MUI.Toolbar />
        {renderContent()}
      </MUI.Box>
    </MUI.Box>
  );
};

export default AdminDashboard;
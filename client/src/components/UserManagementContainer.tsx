import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import UserManagement from './UserManagement';
import { adminService } from '../services/adminService';
import { User } from '../types/index';

interface UserManagementContainerProps {
  onDataChange?: () => void;
}

const UserManagementContainer: React.FC<UserManagementContainerProps> = ({ onDataChange }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading users via adminService...');
      const response = await adminService.getAllUsers(1, 100); // Load more users to get accurate count
      setUsers(response.users);
      setTotalUsers(response.total || response.users.length);
      console.log('Users loaded successfully:', response.users.length, 'users out of', response.total, 'total');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load users';
      setError(errorMessage);
      console.error('Error loading users:', err);

      // Check if it's an authentication error
      if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
        setError('Authentication failed. Please log in as admin.');
      } else {
        setError('Failed to load users. ' + errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (userData: Partial<User>): Promise<{ user: User; temporaryPassword?: string }> => {
    try {
      console.log('Creating user via adminService...');
      const response = await adminService.createUser(userData);
      setUsers(prevUsers => [...prevUsers, response.user]);
      console.log('User created successfully:', response.user.email);
      if (response.temporaryPassword) {
        console.log('Temporary password generated:', response.temporaryPassword);
      }
      // Reload users to get fresh data
      await loadUsers();
      // Refresh dashboard stats
      onDataChange?.();
      return response;
    } catch (err) {
      console.error('Error creating user:', err);
      throw err;
    }
  };

  const handleUpdateUser = async (userId: string, userData: Partial<User>): Promise<void> => {
    try {
      console.log('Updating user via adminService...');
      const updatedUser = await adminService.updateUser(userId, userData);
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user._id === userId ? updatedUser : user
        )
      );
      console.log('User updated successfully:', updatedUser.email);
      // Refresh dashboard stats
      onDataChange?.();
    } catch (err) {
      console.error('Error updating user:', err);
      throw err;
    }
  };

  const handleDeleteUser = async (userId: string): Promise<void> => {
    try {
      console.log('Deleting user via adminService...');
      await adminService.deleteUser(userId);
      setUsers(prevUsers => prevUsers.filter(user => user._id !== userId));
      console.log('User deleted successfully');
      // Refresh dashboard stats
      onDataChange?.();
    } catch (err) {
      console.error('Error deleting user:', err);
      throw err;
    }
  };

  const handleToggleUserStatus = async (userId: string, status: 'active' | 'inactive' | 'suspended'): Promise<void> => {
    try {
      console.log('Updating user status via adminService...');
      const updatedUser = await adminService.updateUserStatus(userId, status);
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user._id === userId ? updatedUser : user
        )
      );
      // Refresh dashboard stats when status changes
      onDataChange?.();
    } catch (err) {
      console.error('Error updating user status:', err);
      throw err;
    }
  };

  const handleResetPassword = async (userId: string): Promise<{ temporaryPassword?: string }> => {
    try {
      console.log('Resetting password via adminService...');
      const response = await adminService.resetUserPassword(userId);
      console.log('Password reset successfully for:', response.email);
      return { temporaryPassword: response.temporaryPassword };
    } catch (err) {
      console.error('Error resetting password:', err);
      throw err;
    }
  };

  if (loading && users.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px'
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity="error"
          action={
            <Box sx={{ ml: 2 }}>
              <button onClick={loadUsers}>Retry</button>
            </Box>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <UserManagement
      users={users}
      totalUsers={totalUsers}
      onCreateUser={handleCreateUser}
      onUpdateUser={handleUpdateUser}
      onDeleteUser={handleDeleteUser}
      onToggleUserStatus={handleToggleUserStatus}
      onResetPassword={handleResetPassword}
      loading={loading}
    />
  );
};

export default UserManagementContainer;
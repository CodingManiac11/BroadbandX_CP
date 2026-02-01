import React, { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Chip,
    IconButton,
    Tooltip,
    Menu,
    MenuItem,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Skeleton,
    Alert
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import * as Icons from '@mui/icons-material';

interface Customer {
    id: string;
    name: string;
    email: string;
    plan: string;
    planPrice: number;
    probability: number;
    riskLevel: string;
    daysSinceLogin: number;
    paymentFailures: number;
    supportTickets: number;
    npsScore: number;
    usageChange: number;
    contractAge: number;
    recommendation: string;
}

interface AtRiskCustomersTableProps {
    customers: Customer[];
    loading?: boolean;
    onRefresh?: () => void;
    onAction?: (customerId: string, action: string, notes?: string) => void;
}

const RiskChip: React.FC<{ level: string; probability: number }> = ({ level, probability }) => {
    const config = {
        High: { color: 'error' as const, icon: <Icons.Warning fontSize="small" /> },
        Medium: { color: 'warning' as const, icon: <Icons.AccessTime fontSize="small" /> },
        Low: { color: 'success' as const, icon: <Icons.CheckCircle fontSize="small" /> }
    };

    const { color, icon } = config[level as keyof typeof config] || config.Low;

    return (
        <Chip
            icon={icon}
            label={`${probability}% ${level}`}
            color={color}
            size="small"
            sx={{ fontWeight: 'bold' }}
        />
    );
};

const ActionMenu: React.FC<{
    customerId: string;
    customerName: string;
    onAction: (action: string, notes?: string) => void;
}> = ({ customerId, customerName, onAction }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState('');
    const [notes, setNotes] = useState('');

    const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleActionSelect = (action: string) => {
        setSelectedAction(action);
        setDialogOpen(true);
        handleMenuClose();
    };

    const handleActionConfirm = () => {
        onAction(selectedAction, notes);
        setDialogOpen(false);
        setNotes('');
    };

    return (
        <>
            <Tooltip title="Quick Actions">
                <IconButton size="small" onClick={handleMenuClick} color="primary">
                    <Icons.MoreVert />
                </IconButton>
            </Tooltip>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                <MenuItem onClick={() => handleActionSelect('email')}>
                    <Icons.Email fontSize="small" sx={{ mr: 1 }} /> Send Email
                </MenuItem>
                <MenuItem onClick={() => handleActionSelect('call')}>
                    <Icons.Phone fontSize="small" sx={{ mr: 1 }} /> Schedule Call
                </MenuItem>
                <MenuItem onClick={() => handleActionSelect('discount')}>
                    <Icons.LocalOffer fontSize="small" sx={{ mr: 1 }} /> Offer Discount
                </MenuItem>
                <MenuItem onClick={() => handleActionSelect('upgrade')}>
                    <Icons.Upgrade fontSize="small" sx={{ mr: 1 }} /> Offer Upgrade
                </MenuItem>
            </Menu>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedAction === 'email' && '📧 Send Retention Email'}
                    {selectedAction === 'call' && '📞 Schedule Outreach Call'}
                    {selectedAction === 'discount' && '🏷️ Apply Retention Discount'}
                    {selectedAction === 'upgrade' && '⬆️ Offer Plan Upgrade'}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Taking action for: <strong>{customerName}</strong>
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Notes (optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any notes about this action..."
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleActionConfirm}>
                        Confirm Action
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

const AtRiskCustomersTable: React.FC<AtRiskCustomersTableProps> = ({
    customers,
    loading = false,
    onRefresh,
    onAction
}) => {
    const [filterLevel, setFilterLevel] = useState<string>('all');

    const filteredCustomers = filterLevel === 'all'
        ? customers
        : customers.filter(c => c.riskLevel.toLowerCase() === filterLevel);

    const columns: GridColDef[] = [
        {
            field: 'name',
            headerName: 'Customer',
            flex: 1.2,
            minWidth: 180,
            renderCell: (params: GridRenderCellParams) => (
                <Box>
                    <Typography variant="body2" fontWeight="bold">
                        {params.row.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {params.row.email}
                    </Typography>
                </Box>
            )
        },
        {
            field: 'plan',
            headerName: 'Plan',
            width: 120,
            renderCell: (params: GridRenderCellParams) => (
                <Chip label={params.value} size="small" variant="outlined" />
            )
        },
        {
            field: 'probability',
            headerName: 'Risk Score',
            width: 150,
            renderCell: (params: GridRenderCellParams) => (
                <RiskChip level={params.row.riskLevel} probability={params.value} />
            )
        },
        {
            field: 'daysSinceLogin',
            headerName: 'Last Login',
            width: 110,
            renderCell: (params: GridRenderCellParams) => (
                <Tooltip title={`${params.value} days ago`}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Icons.AccessTime fontSize="small" color={params.value > 14 ? 'error' : 'inherit'} />
                        <Typography variant="body2" color={params.value > 14 ? 'error' : 'inherit'}>
                            {params.value}d
                        </Typography>
                    </Box>
                </Tooltip>
            )
        },
        {
            field: 'paymentFailures',
            headerName: 'Payments',
            width: 100,
            renderCell: (params: GridRenderCellParams) => (
                <Tooltip title={`${params.value} payment failures`}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Icons.CreditCard fontSize="small" color={params.value > 0 ? 'error' : 'inherit'} />
                        <Typography variant="body2" color={params.value > 0 ? 'error' : 'inherit'}>
                            {params.value}
                        </Typography>
                    </Box>
                </Tooltip>
            )
        },
        {
            field: 'supportTickets',
            headerName: 'Tickets',
            width: 90,
            renderCell: (params: GridRenderCellParams) => (
                <Tooltip title={`${params.value} support tickets`}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Icons.Support fontSize="small" color={params.value > 2 ? 'warning' : 'inherit'} />
                        <Typography variant="body2">
                            {params.value}
                        </Typography>
                    </Box>
                </Tooltip>
            )
        },
        {
            field: 'usageChange',
            headerName: 'Usage Δ',
            width: 100,
            renderCell: (params: GridRenderCellParams) => (
                <Typography
                    variant="body2"
                    sx={{
                        color: params.value < 0 ? 'error.main' : 'success.main',
                        fontWeight: 'bold'
                    }}
                >
                    {params.value > 0 ? '+' : ''}{params.value}%
                </Typography>
            )
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 80,
            sortable: false,
            renderCell: (params: GridRenderCellParams) => (
                <ActionMenu
                    customerId={params.row.id}
                    customerName={params.row.name}
                    onAction={(action, notes) => onAction?.(params.row.id, action, notes)}
                />
            )
        }
    ];

    if (loading) {
        return (
            <Box>
                <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: 1 }} />
                {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} variant="rectangular" height={52} sx={{ mb: 1, borderRadius: 1 }} />
                ))}
            </Box>
        );
    }

    return (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    🎯 At-Risk Customers ({customers.length})
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        size="small"
                        variant={filterLevel === 'all' ? 'contained' : 'outlined'}
                        onClick={() => setFilterLevel('all')}
                    >
                        All
                    </Button>
                    <Button
                        size="small"
                        variant={filterLevel === 'high' ? 'contained' : 'outlined'}
                        color="error"
                        onClick={() => setFilterLevel('high')}
                    >
                        High ({customers.filter(c => c.riskLevel === 'High').length})
                    </Button>
                    <Button
                        size="small"
                        variant={filterLevel === 'medium' ? 'contained' : 'outlined'}
                        color="warning"
                        onClick={() => setFilterLevel('medium')}
                    >
                        Medium ({customers.filter(c => c.riskLevel === 'Medium').length})
                    </Button>
                    {onRefresh && (
                        <Tooltip title="Refresh data">
                            <IconButton onClick={onRefresh} size="small">
                                <Icons.Refresh />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </Box>

            {filteredCustomers.length === 0 ? (
                <Alert severity="success" sx={{ mt: 2 }}>
                    🎉 No customers in this risk category. Great work!
                </Alert>
            ) : (
                <DataGrid
                    rows={filteredCustomers}
                    columns={columns}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 10 } },
                        sorting: { sortModel: [{ field: 'probability', sort: 'desc' }] }
                    }}
                    pageSizeOptions={[5, 10, 25]}
                    disableRowSelectionOnClick
                    autoHeight
                    sx={{
                        border: 'none',
                        '& .MuiDataGrid-cell': {
                            borderBottom: '1px solid #f0f0f0'
                        },
                        '& .MuiDataGrid-columnHeaders': {
                            backgroundColor: '#f8fafc',
                            borderBottom: '2px solid #e2e8f0'
                        },
                        '& .MuiDataGrid-row:hover': {
                            backgroundColor: '#f8fafc'
                        }
                    }}
                />
            )}
        </Paper>
    );
};

export default AtRiskCustomersTable;

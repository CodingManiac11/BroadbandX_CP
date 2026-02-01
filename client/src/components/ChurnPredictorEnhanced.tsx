import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Autocomplete,
    Slider,
    Button,
    CircularProgress,
    Alert,
    Chip,
    Divider,
    LinearProgress,
    Tooltip,
    Skeleton
} from '@mui/material';
import * as Icons from '@mui/icons-material';

interface Customer {
    id: string;
    name: string;
    email: string;
    plan: string;
}

interface PredictionResult {
    probability: number;
    riskLevel: string;
    recommendation: string;
    factors: {
        usageRisk: number;
        loginRisk: number;
        paymentRisk: number;
        ticketRisk: number;
        npsRisk: number;
        contractRisk: number;
    };
    rawInputs: {
        usageChange: number;
        daysSinceLogin: number;
        paymentFailures: number;
        supportTickets: number;
        npsScore: number;
        contractAge: number;
    };
}

interface ChurnPredictorEnhancedProps {
    customers: Customer[];
    loadingCustomers?: boolean;
    onCustomerSearch?: (search: string) => void;
    onPredict?: (customerId: string) => Promise<PredictionResult>;
    onManualPredict?: (inputs: any) => PredictionResult;
}

const RiskGauge: React.FC<{ probability: number; riskLevel: string }> = ({ probability, riskLevel }) => {
    const getColor = () => {
        if (riskLevel === 'High') return '#ef4444';
        if (riskLevel === 'Medium') return '#f59e0b';
        return '#10b981';
    };

    const getEmoji = () => {
        if (riskLevel === 'High') return '⚠️';
        if (riskLevel === 'Medium') return '⚡';
        return '✅';
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box
                sx={{
                    position: 'relative',
                    width: 160,
                    height: 160,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `conic-gradient(
            ${getColor()} ${probability * 3.6}deg,
            #e5e7eb ${probability * 3.6}deg
          )`,
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        width: 130,
                        height: 130,
                        borderRadius: '50%',
                        backgroundColor: 'white',
                    }
                }}
            >
                <Box sx={{ position: 'relative', textAlign: 'center', zIndex: 1 }}>
                    <Typography variant="h2" sx={{ fontWeight: 'bold', color: getColor() }}>
                        {probability}%
                    </Typography>
                </Box>
            </Box>
            <Typography variant="h5" sx={{ mt: 2, fontWeight: 'bold', color: getColor() }}>
                {getEmoji()} {riskLevel.toUpperCase()} RISK
            </Typography>
        </Box>
    );
};

const FactorBar: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({ label, value, icon }) => {
    const getColor = () => {
        if (value >= 70) return '#ef4444';
        if (value >= 40) return '#f59e0b';
        return '#10b981';
    };

    return (
        <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {icon}
                    <Typography variant="body2">{label}</Typography>
                </Box>
                <Typography variant="body2" fontWeight="bold" sx={{ color: getColor() }}>
                    {value}%
                </Typography>
            </Box>
            <LinearProgress
                variant="determinate"
                value={value}
                sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#e5e7eb',
                    '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        backgroundColor: getColor()
                    }
                }}
            />
        </Box>
    );
};

const ChurnPredictorEnhanced: React.FC<ChurnPredictorEnhancedProps> = ({
    customers,
    loadingCustomers = false,
    onCustomerSearch,
    onPredict,
    onManualPredict
}) => {
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [mode, setMode] = useState<'customer' | 'manual'>('customer');
    const [predicting, setPredicting] = useState(false);
    const [result, setResult] = useState<PredictionResult | null>(null);

    // Manual input state
    const [manualInputs, setManualInputs] = useState({
        usageChange: 0,
        daysSinceLogin: 5,
        paymentFailures: 0,
        supportTickets: 0,
        npsScore: 7,
        contractAge: 12
    });

    const handleCustomerPredict = async () => {
        if (!selectedCustomer || !onPredict) return;
        setPredicting(true);
        try {
            const prediction = await onPredict(selectedCustomer.id);
            setResult(prediction);
        } catch (error) {
            console.error('Prediction failed:', error);
        }
        setPredicting(false);
    };

    const handleManualPredict = () => {
        if (!onManualPredict) return;
        const prediction = onManualPredict(manualInputs);
        setResult(prediction);
    };

    const sliderInputs = [
        {
            key: 'usageChange',
            label: 'Usage Change (30d)',
            min: -50,
            max: 50,
            step: 5,
            unit: '%',
            icon: <Icons.TrendingDown fontSize="small" />,
            tooltip: 'Negative values indicate decreased usage (risk factor)'
        },
        {
            key: 'daysSinceLogin',
            label: 'Days Since Login',
            min: 0,
            max: 60,
            step: 1,
            unit: ' days',
            icon: <Icons.AccessTime fontSize="small" />,
            tooltip: 'Higher values indicate less engagement'
        },
        {
            key: 'paymentFailures',
            label: 'Payment Failures (90d)',
            min: 0,
            max: 5,
            step: 1,
            unit: '',
            icon: <Icons.CreditCardOff fontSize="small" />,
            tooltip: 'Number of failed payment attempts'
        },
        {
            key: 'supportTickets',
            label: 'Support Tickets',
            min: 0,
            max: 10,
            step: 1,
            unit: '',
            icon: <Icons.Support fontSize="small" />,
            tooltip: 'Number of support complaints'
        },
        {
            key: 'npsScore',
            label: 'NPS Score',
            min: 0,
            max: 10,
            step: 1,
            unit: '/10',
            icon: <Icons.ThumbUp fontSize="small" />,
            tooltip: 'Customer satisfaction (0-10)'
        },
        {
            key: 'contractAge',
            label: 'Contract Age',
            min: 1,
            max: 36,
            step: 1,
            unit: ' months',
            icon: <Icons.CalendarToday fontSize="small" />,
            tooltip: 'How long they have been a customer'
        }
    ];

    return (
        <Paper sx={{ p: 3, borderRadius: 2, border: '2px solid', borderColor: 'primary.main' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Icons.PersonSearch color="primary" sx={{ fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    🔮 AI Churn Predictor
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Button
                    variant={mode === 'customer' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setMode('customer')}
                    startIcon={<Icons.Person />}
                >
                    Select Customer
                </Button>
                <Button
                    variant={mode === 'manual' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setMode('manual')}
                    startIcon={<Icons.Edit />}
                >
                    Manual Input
                </Button>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
                {/* Input Section */}
                <Box>
                    {mode === 'customer' ? (
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                                Search and select a customer to analyze their churn risk
                            </Typography>
                            <Autocomplete
                                options={customers}
                                getOptionLabel={(option) => `${option.name} (${option.email})`}
                                value={selectedCustomer}
                                onChange={(_, value) => setSelectedCustomer(value)}
                                onInputChange={(_, value) => onCustomerSearch?.(value)}
                                loading={loadingCustomers}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Search Customer"
                                        placeholder="Type name or email..."
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <>
                                                    {loadingCustomers && <CircularProgress size={20} />}
                                                    {params.InputProps.endAdornment}
                                                </>
                                            )
                                        }}
                                    />
                                )}
                                renderOption={(props, option) => (
                                    <Box component="li" {...props}>
                                        <Box>
                                            <Typography variant="body2" fontWeight="bold">{option.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {option.email} • {option.plan}
                                            </Typography>
                                        </Box>
                                    </Box>
                                )}
                            />
                            {selectedCustomer && (
                                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                    <Typography variant="body2">
                                        <strong>Selected:</strong> {selectedCustomer.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {selectedCustomer.email} • Plan: {selectedCustomer.plan}
                                    </Typography>
                                </Box>
                            )}
                            <Button
                                variant="contained"
                                fullWidth
                                size="large"
                                sx={{ mt: 3 }}
                                onClick={handleCustomerPredict}
                                disabled={!selectedCustomer || predicting}
                                startIcon={predicting ? <CircularProgress size={20} /> : <Icons.Psychology />}
                            >
                                {predicting ? 'Analyzing...' : 'Predict Churn Risk'}
                            </Button>
                        </Box>
                    ) : (
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                                Adjust the parameters to simulate different customer scenarios
                            </Typography>
                            {sliderInputs.map((input) => (
                                <Box key={input.key} sx={{ mb: 3 }}>
                                    <Tooltip title={input.tooltip} placement="top">
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            {input.icon}
                                            <Typography variant="body2">
                                                {input.label}:
                                                <strong> {manualInputs[input.key as keyof typeof manualInputs]}{input.unit}</strong>
                                            </Typography>
                                        </Box>
                                    </Tooltip>
                                    <Slider
                                        value={manualInputs[input.key as keyof typeof manualInputs]}
                                        onChange={(_, value) => setManualInputs(prev => ({ ...prev, [input.key]: value as number }))}
                                        min={input.min}
                                        max={input.max}
                                        step={input.step}
                                        marks={[
                                            { value: input.min, label: `${input.min}` },
                                            { value: input.max, label: `${input.max}` }
                                        ]}
                                        valueLabelDisplay="auto"
                                        sx={{ mx: 1 }}
                                    />
                                </Box>
                            ))}
                            <Button
                                variant="contained"
                                fullWidth
                                size="large"
                                onClick={handleManualPredict}
                                startIcon={<Icons.Psychology />}
                            >
                                Calculate Churn Risk
                            </Button>
                        </Box>
                    )}
                </Box>

                {/* Result Section */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {result ? (
                        <Box sx={{ width: '100%' }}>
                            <RiskGauge probability={result.probability} riskLevel={result.riskLevel} />

                            <Divider sx={{ my: 3 }} />

                            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                                📊 Risk Factor Breakdown
                            </Typography>

                            <FactorBar label="Usage Risk" value={result.factors.usageRisk} icon={<Icons.TrendingDown fontSize="small" />} />
                            <FactorBar label="Login Activity" value={result.factors.loginRisk} icon={<Icons.AccessTime fontSize="small" />} />
                            <FactorBar label="Payment Risk" value={result.factors.paymentRisk} icon={<Icons.CreditCard fontSize="small" />} />
                            <FactorBar label="Support Issues" value={result.factors.ticketRisk} icon={<Icons.Support fontSize="small" />} />
                            <FactorBar label="Satisfaction" value={result.factors.npsRisk} icon={<Icons.SentimentDissatisfied fontSize="small" />} />

                            <Alert
                                severity={result.riskLevel === 'High' ? 'error' : result.riskLevel === 'Medium' ? 'warning' : 'success'}
                                sx={{ mt: 3 }}
                                icon={result.riskLevel === 'High' ? <Icons.Warning /> : result.riskLevel === 'Medium' ? <Icons.AccessTime /> : <Icons.CheckCircle />}
                            >
                                <Typography variant="body2">
                                    <strong>Recommendation:</strong> {result.recommendation}
                                </Typography>
                            </Alert>
                        </Box>
                    ) : (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Icons.HelpOutline sx={{ fontSize: 80, opacity: 0.3, color: 'grey.400' }} />
                            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                                {mode === 'customer'
                                    ? 'Select a customer and click "Predict Churn Risk"'
                                    : 'Adjust parameters and click "Calculate Churn Risk"'}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Box>
        </Paper>
    );
};

export default ChurnPredictorEnhanced;

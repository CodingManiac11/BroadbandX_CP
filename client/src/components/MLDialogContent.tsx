import React from 'react';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    LinearProgress,
    Card,
    CardContent,
    Divider
} from '@mui/material';
import * as Icons from '@mui/icons-material';

interface MLDialogContentProps {
    type: 'pricing' | 'market' | 'performance' | 'history' | 'pending' | 'config' | 'scan';
    data: any;
}

const PricingProposalContent: React.FC<{ data: any }> = ({ data }) => (
    <Box>
        <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
            <Typography variant="subtitle2" color="primary.contrastText" gutterBottom>
                Dynamic Pricing Formula
            </Typography>
            <Typography variant="h6" fontFamily="monospace" color="primary.contrastText">
                {data.formula}
            </Typography>
        </Box>

        <Typography variant="subtitle2" sx={{ mb: 2 }}>
            📊 Weight Parameters
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Chip label={`α (Demand): ${data.weights.alpha}`} color="primary" />
            <Chip label={`β (Elasticity): ${data.weights.beta}`} color="secondary" />
            <Chip label={`γ (Churn Risk): ${data.weights.gamma}`} color="warning" />
        </Box>

        {/* Real-time Market Conditions */}
        {data.marketConditions && (
            <>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    📈 Real-Time Market Conditions
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                    <Chip
                        label={`Total Customers: ${data.marketConditions.totalCustomers}`}
                        color="default"
                        variant="outlined"
                    />
                    <Chip
                        label={`High Risk: ${data.marketConditions.highRisk}`}
                        color="error"
                        variant="outlined"
                    />
                    <Chip
                        label={`Medium Risk: ${data.marketConditions.mediumRisk}`}
                        color="warning"
                        variant="outlined"
                    />
                    <Chip
                        label={`Low Risk: ${data.marketConditions.lowRisk}`}
                        color="success"
                        variant="outlined"
                    />
                    <Chip
                        label={`Demand Factor: ${data.marketConditions.demandFactor}`}
                        color="info"
                        variant="filled"
                    />
                </Box>
            </>
        )}

        <Typography variant="subtitle2" sx={{ mb: 2 }}>
            💰 Dynamic Pricing Adjustments
        </Typography>
        <TableContainer component={Paper} variant="outlined">
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell><strong>Plan</strong></TableCell>
                        <TableCell align="right"><strong>Base Price</strong></TableCell>
                        <TableCell align="right"><strong>AI Suggested</strong></TableCell>
                        <TableCell align="center"><strong>Change</strong></TableCell>
                        <TableCell><strong>Reason</strong></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.samplePricing.map((item: any, index: number) => (
                        <TableRow key={index}>
                            <TableCell>{item.plan}</TableCell>
                            <TableCell align="right">₹{item.basePrice}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                ₹{item.dynamicPrice}
                            </TableCell>
                            <TableCell align="center">
                                <Chip
                                    label={item.change}
                                    size="small"
                                    color={item.change.includes('-') ? 'success' : item.change === '0%' ? 'default' : 'warning'}
                                />
                            </TableCell>
                            <TableCell>
                                <Typography variant="caption">{item.reason}</Typography>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    </Box>
);

const MarketAnalysisContent: React.FC<{ data: any }> = ({ data }) => (
    <Box>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
            👥 Customer Segments & Price Elasticity
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
            {data.segments.map((segment: any, index: number) => (
                <Card key={index} variant="outlined">
                    <CardContent sx={{ py: 1.5 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                            {segment.name}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Population</Typography>
                                <Typography variant="body1" fontWeight="bold">{segment.population}%</Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="caption" color="text.secondary">Elasticity</Typography>
                                <Typography
                                    variant="body1"
                                    fontWeight="bold"
                                    color={segment.elasticity < -1 ? 'error.main' : 'success.main'}
                                >
                                    {segment.elasticity}
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            ))}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 2 }}>
            🚀 Projected Impact
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {data.insights.map((insight: string, index: number) => (
                <Chip
                    key={index}
                    icon={<Icons.TrendingUp />}
                    label={insight}
                    color="success"
                    variant="outlined"
                />
            ))}
        </Box>
    </Box>
);

const PerformanceContent: React.FC<{ data: any }> = ({ data }) => (
    <Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            {/* Churn Model */}
            <Card variant="outlined">
                <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        🤖 {data.churnModel.name}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                        {[
                            { label: 'Accuracy', value: data.churnModel.accuracy },
                            { label: 'Precision', value: data.churnModel.precision },
                            { label: 'Recall', value: data.churnModel.recall },
                            { label: 'F1 Score', value: data.churnModel.f1Score },
                            { label: 'AUC-ROC', value: data.churnModel.aucRoc }
                        ].map((metric, i) => {
                            // Handle both number (0.878) and string ("87.8%") formats
                            const numValue = typeof metric.value === 'number'
                                ? metric.value
                                : parseFloat(String(metric.value).replace('%', ''));
                            const displayValue = typeof metric.value === 'number'
                                ? `${(metric.value * 100).toFixed(1)}%`
                                : metric.value;
                            const progressValue = typeof metric.value === 'number'
                                ? metric.value * 100
                                : parseFloat(String(metric.value).replace('%', ''));

                            return (
                                <Box key={i} sx={{ mb: 1.5 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="body2">{metric.label}</Typography>
                                        <Typography variant="body2" fontWeight="bold">{displayValue}</Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={Math.min(progressValue, 100)}
                                        sx={{
                                            height: 8,
                                            borderRadius: 4,
                                            bgcolor: 'grey.200',
                                            '& .MuiLinearProgress-bar': {
                                                bgcolor: progressValue > 80 ? 'success.main' : 'primary.main'
                                            }
                                        }}
                                    />
                                </Box>
                            );
                        })}
                    </Box>
                </CardContent>
            </Card>

            {/* Segmentation */}
            <Card variant="outlined">
                <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        📊 {data.segmentation.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <Box sx={{ textAlign: 'center', flex: 1, p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                            <Typography variant="h3" color="primary.contrastText" fontWeight="bold">
                                {data.segmentation.clusters}
                            </Typography>
                            <Typography variant="body2" color="primary.contrastText">
                                Clusters
                            </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center', flex: 1, p: 2, bgcolor: 'secondary.light', borderRadius: 2 }}>
                            <Typography variant="h3" color="secondary.contrastText" fontWeight="bold">
                                {data.segmentation.silhouetteScore.toFixed(2)}
                            </Typography>
                            <Typography variant="body2" color="secondary.contrastText">
                                Silhouette
                            </Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </Box>

        {/* Feature Importance */}
        <Card variant="outlined" sx={{ mt: 3 }}>
            <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    📈 Top Features by Importance
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                    {data.featureImportance.map((f: any, i: number) => (
                        <Chip
                            key={i}
                            label={`${f.feature}: ${typeof f.weight === 'number' ? f.weight.toFixed(1) + '%' : f.weight}`}
                            color={i === 0 ? 'primary' : 'default'}
                            variant={i === 0 ? 'filled' : 'outlined'}
                        />
                    ))}
                </Box>
            </CardContent>
        </Card>
    </Box>
);

const HistoryContent: React.FC<{ data: any }> = ({ data }) => (
    <TableContainer component={Paper} variant="outlined">
        <Table>
            <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>Plan</strong></TableCell>
                    <TableCell align="right"><strong>Old Price</strong></TableCell>
                    <TableCell align="right"><strong>New Price</strong></TableCell>
                    <TableCell align="center"><strong>Status</strong></TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {data.recentChanges.map((item: any, index: number) => (
                    <TableRow key={index}>
                        <TableCell>{item.date}</TableCell>
                        <TableCell>{item.plan}</TableCell>
                        <TableCell align="right">₹{item.oldPrice}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>₹{item.newPrice}</TableCell>
                        <TableCell align="center">
                            <Chip
                                size="small"
                                label={item.status}
                                color={item.status === 'Implemented' ? 'success' : 'error'}
                            />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </TableContainer>
);

const PendingContent: React.FC<{ data: any }> = ({ data }) => (
    <Box>
        {data.pendingItems.map((item: any, index: number) => (
            <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="subtitle1" fontWeight="bold">
                                {item.plan} Plan
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {item.reason}
                            </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h5" color="primary.main" fontWeight="bold">
                                ₹{item.proposedPrice}
                            </Typography>
                            <Chip size="small" label={`${item.confidence} confidence`} color="info" />
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        ))}
    </Box>
);

const ConfigContent: React.FC<{ data: any }> = ({ data }) => (
    <Box>
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Pricing Formula</Typography>
            <Typography variant="h6" fontFamily="monospace">
                {data.pricingFormula}
            </Typography>
        </Box>

        <Typography variant="subtitle2" sx={{ mb: 2 }}>⚙️ Weight Configuration</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
            {Object.entries(data.weights).map(([key, weight]: [string, any]) => (
                <Card key={key} variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">{weight.name}</Typography>
                        <Typography variant="h4" color="primary.main" fontWeight="bold">
                            {weight.value}
                        </Typography>
                        <Typography variant="caption">{key}</Typography>
                    </CardContent>
                </Card>
            ))}
        </Box>

        <Typography variant="subtitle2" sx={{ mb: 2 }}>🚧 Price Constraints</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
            <Chip icon={<Icons.ArrowDownward />} label={`Max Discount: ${data.constraints.maxDiscount}`} color="success" />
            <Chip icon={<Icons.ArrowUpward />} label={`Max Premium: ${data.constraints.maxPremium}`} color="warning" />
        </Box>
    </Box>
);

const ScanResultContent: React.FC<{ data: any }> = ({ data }) => (
    <Box>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Card sx={{ flex: 1, minWidth: 120, bgcolor: 'grey.100' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h4" fontWeight="bold">{data.totalCustomers}</Typography>
                    <Typography variant="caption">Total Scanned</Typography>
                </CardContent>
            </Card>
            <Card sx={{ flex: 1, minWidth: 120, bgcolor: 'error.light' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h4" fontWeight="bold" color="error.dark">{data.highRisk}</Typography>
                    <Typography variant="caption" color="error.dark">High Risk</Typography>
                </CardContent>
            </Card>
            <Card sx={{ flex: 1, minWidth: 120, bgcolor: 'warning.light' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h4" fontWeight="bold" color="warning.dark">{data.mediumRisk}</Typography>
                    <Typography variant="caption" color="warning.dark">Medium Risk</Typography>
                </CardContent>
            </Card>
            <Card sx={{ flex: 1, minWidth: 120, bgcolor: 'success.light' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h4" fontWeight="bold" color="success.dark">{data.lowRisk}</Typography>
                    <Typography variant="caption" color="success.dark">Low Risk</Typography>
                </CardContent>
            </Card>
        </Box>

        <Typography variant="caption" color="text.secondary">
            Scan completed at: {new Date(data.timestamp).toLocaleString()}
        </Typography>

        {data.atRiskCustomers && data.atRiskCustomers.length > 0 && (
            <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    🚨 At-Risk Customers (Top 10)
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                                <TableCell>Customer</TableCell>
                                <TableCell align="right">Risk</TableCell>
                                <TableCell>Level</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.atRiskCustomers.slice(0, 10).map((c: any, i: number) => (
                                <TableRow key={i}>
                                    <TableCell>
                                        <Typography variant="body2">{c.userName}</Typography>
                                        <Typography variant="caption" color="text.secondary">{c.email}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography fontWeight="bold">{c.probability}%</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={c.riskLevel}
                                            color={c.riskLevel === 'High' ? 'error' : 'warning'}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </>
        )}
    </Box>
);

const MLDialogContent: React.FC<MLDialogContentProps> = ({ type, data }) => {
    switch (type) {
        case 'pricing':
            return <PricingProposalContent data={data} />;
        case 'market':
            return <MarketAnalysisContent data={data} />;
        case 'performance':
            return <PerformanceContent data={data} />;
        case 'history':
            return <HistoryContent data={data} />;
        case 'pending':
            return <PendingContent data={data} />;
        case 'config':
            return <ConfigContent data={data} />;
        case 'scan':
            return <ScanResultContent data={data} />;
        default:
            return (
                <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflow: 'auto' }}>
                    {JSON.stringify(data, null, 2)}
                </pre>
            );
    }
};

export default MLDialogContent;

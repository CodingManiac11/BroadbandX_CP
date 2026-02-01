import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LabelList
} from 'recharts';
import { Box, Typography, Paper, Skeleton } from '@mui/material';

interface FeatureData {
    feature: string;
    weight: number;
    key: string;
}

interface FeatureImportanceChartProps {
    data: FeatureData[];
    loading?: boolean;
    title?: string;
}

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff'];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <Paper
                elevation={3}
                sx={{
                    p: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                }}
            >
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {payload[0].payload.feature}
                </Typography>
                <Typography variant="body2" color="primary">
                    Importance: {payload[0].value.toFixed(1)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    This feature contributes {payload[0].value.toFixed(1)}% to churn prediction
                </Typography>
            </Paper>
        );
    }
    return null;
};

const FeatureImportanceChart: React.FC<FeatureImportanceChartProps> = ({
    data,
    loading = false,
    title = 'ML Model Feature Importance'
}) => {
    if (loading) {
        return (
            <Box sx={{ width: '100%', height: 300 }}>
                <Skeleton variant="text" width="50%" sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2 }} />
            </Box>
        );
    }

    // Sort by weight descending for better visualization
    const sortedData = [...data].sort((a, b) => b.weight - a.weight);

    return (
        <Box sx={{ width: '100%', height: 420, pb: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1a1a2e' }}>
                🧠 {title}
            </Typography>
            <ResponsiveContainer width="100%" height={360}>
                <BarChart
                    data={sortedData}
                    layout="vertical"
                    margin={{ top: 5, right: 80, left: 20, bottom: 30 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" horizontal={true} vertical={false} />
                    <XAxis
                        type="number"
                        domain={[0, 20]}
                        tick={{ fill: '#666', fontSize: 12 }}
                        axisLine={{ stroke: '#e0e0e0' }}
                        tickLine={{ stroke: '#e0e0e0' }}
                        tickFormatter={(value) => `${value}%`}
                    />
                    <YAxis
                        type="category"
                        dataKey="feature"
                        tick={{ fill: '#666', fontSize: 11 }}
                        axisLine={{ stroke: '#e0e0e0' }}
                        tickLine={{ stroke: '#e0e0e0' }}
                        width={120}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                        dataKey="weight"
                        radius={[0, 8, 8, 0]}
                        barSize={28}
                    >
                        {sortedData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        <LabelList
                            dataKey="weight"
                            position="right"
                            formatter={(value: any) => typeof value === 'number' ? `${value.toFixed(1)}%` : value}
                            style={{ fill: '#666', fontSize: 12, fontWeight: 500 }}
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </Box>
    );
};

export default FeatureImportanceChart;

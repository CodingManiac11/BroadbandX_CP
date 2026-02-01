import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts';
import { Box, Typography, Paper, Skeleton } from '@mui/material';

interface TrendDataPoint {
    date: string;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    total: number;
}

interface ChurnTrendChartProps {
    data: TrendDataPoint[];
    loading?: boolean;
    title?: string;
}

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
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {label}
                </Typography>
                {payload.map((entry: any, index: number) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Box
                            sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: entry.color,
                            }}
                        />
                        <Typography variant="body2" sx={{ color: entry.color }}>
                            {entry.name}: {entry.value} customers
                        </Typography>
                    </Box>
                ))}
            </Paper>
        );
    }
    return null;
};

const ChurnTrendChart: React.FC<ChurnTrendChartProps> = ({
    data,
    loading = false,
    title = 'Churn Risk Trend (Last 7 Days)'
}) => {
    if (loading) {
        return (
            <Box sx={{ width: '100%', height: 300 }}>
                <Skeleton variant="text" width="40%" sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2 }} />
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', height: 350 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1a1a2e' }}>
                📈 {title}
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                >
                    <defs>
                        <linearGradient id="colorHighRisk" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorMediumRisk" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorLowRisk" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                        dataKey="date"
                        tick={{ fill: '#666', fontSize: 12 }}
                        axisLine={{ stroke: '#e0e0e0' }}
                        tickLine={{ stroke: '#e0e0e0' }}
                    />
                    <YAxis
                        tick={{ fill: '#666', fontSize: 12 }}
                        axisLine={{ stroke: '#e0e0e0' }}
                        tickLine={{ stroke: '#e0e0e0' }}
                        label={{
                            value: 'Customers',
                            angle: -90,
                            position: 'insideLeft',
                            style: { textAnchor: 'middle', fill: '#666' }
                        }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        wrapperStyle={{
                            paddingTop: '20px'
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="highRisk"
                        name="High Risk"
                        stroke="#ef4444"
                        fill="url(#colorHighRisk)"
                        strokeWidth={2}
                        dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="mediumRisk"
                        name="Medium Risk"
                        stroke="#f59e0b"
                        fill="url(#colorMediumRisk)"
                        strokeWidth={2}
                        dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="lowRisk"
                        name="Low Risk"
                        stroke="#10b981"
                        fill="url(#colorLowRisk)"
                        strokeWidth={2}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </Box>
    );
};

export default ChurnTrendChart;

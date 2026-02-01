import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend
} from 'recharts';
import { Box, Typography, Paper, Skeleton } from '@mui/material';

interface SegmentData {
    name: string;
    value: number;
    color: string;
    percentage?: string;
    [key: string]: string | number | undefined;
}

interface CustomerSegmentChartProps {
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    loading?: boolean;
    title?: string;
}

const RISK_COLORS = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#10b981'
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0];
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Box
                        sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: data.payload.color,
                        }}
                    />
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {data.name}
                    </Typography>
                </Box>
                <Typography variant="body2">
                    {data.value} customers ({data.payload.percentage}%)
                </Typography>
            </Paper>
        );
    }
    return null;
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't show label for small segments

    return (
        <text
            x={x}
            y={y}
            fill="white"
            textAnchor="middle"
            dominantBaseline="central"
            style={{ fontSize: '14px', fontWeight: 'bold' }}
        >
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

const CustomerSegmentChart: React.FC<CustomerSegmentChartProps> = ({
    highRisk,
    mediumRisk,
    lowRisk,
    loading = false,
    title = 'Customer Risk Distribution'
}) => {
    if (loading) {
        return (
            <Box sx={{ width: '100%', height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Skeleton variant="text" width="50%" sx={{ mb: 2 }} />
                <Skeleton variant="circular" width={200} height={200} />
            </Box>
        );
    }

    const total = highRisk + mediumRisk + lowRisk;

    const data: SegmentData[] = [
        {
            name: 'High Risk',
            value: highRisk,
            color: RISK_COLORS.high,
        },
        {
            name: 'Medium Risk',
            value: mediumRisk,
            color: RISK_COLORS.medium,
        },
        {
            name: 'Low Risk',
            value: lowRisk,
            color: RISK_COLORS.low,
        },
    ].map(item => ({
        ...item,
        percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
    })) as any;

    return (
        <Box sx={{ width: '100%', height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', pb: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1a1a2e', alignSelf: 'flex-start' }}>
                📊 {title}
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                {data.map((item: any) => (
                    <Box key={item.name} sx={{ textAlign: 'center' }}>
                        <Box
                            sx={{
                                px: 2,
                                py: 1,
                                borderRadius: 2,
                                backgroundColor: item.color + '20',
                                border: `2px solid ${item.color}`,
                            }}
                        >
                            <Typography variant="h5" sx={{ fontWeight: 'bold', color: item.color }}>
                                {item.value}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {item.name}
                            </Typography>
                        </Box>
                    </Box>
                ))}
            </Box>

            <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={90}
                        innerRadius={50}
                        fill="#8884d8"
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={800}
                    >
                        {data.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                </PieChart>
            </ResponsiveContainer>

            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                Total: {total} active customers
            </Typography>
        </Box>
    );
};

export default CustomerSegmentChart;

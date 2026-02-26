import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import {
    ArrowDownward as DownloadIcon,
    ArrowUpward as UploadIcon,
    Speed as SpeedIcon,
    FiberManualRecord as DotIcon,
} from '@mui/icons-material';
import webSocketService from '../services/webSocketService';

interface UsageData {
    downloadToday: number;
    uploadToday: number;
    currentDownloadSpeed: number;
    currentUploadSpeed: number;
    status: 'excellent' | 'good' | 'fair';
}

const RealTimeUsageCounter: React.FC<{ dataLimitGB?: number }> = ({ dataLimitGB = 100 }) => {
    const [usage, setUsage] = useState<UsageData>({
        downloadToday: 0,
        uploadToday: 0,
        currentDownloadSpeed: 0,
        currentUploadSpeed: 0,
        status: 'good',
    });
    const [isConnected, setIsConnected] = useState(false);
    const animationRef = useRef<{ download: number; upload: number }>({ download: 0, upload: 0 });
    const [displayValues, setDisplayValues] = useState({ download: 0, upload: 0 });
    const rafRef = useRef<number | null>(null);

    // Animate counter values smoothly
    const animateValues = useCallback(() => {
        const targetDownload = usage.downloadToday;
        const targetUpload = usage.uploadToday;
        const current = animationRef.current;

        const easing = 0.08;
        let changed = false;

        if (Math.abs(current.download - targetDownload) > 0.001) {
            current.download += (targetDownload - current.download) * easing;
            changed = true;
        } else {
            current.download = targetDownload;
        }

        if (Math.abs(current.upload - targetUpload) > 0.001) {
            current.upload += (targetUpload - current.upload) * easing;
            changed = true;
        } else {
            current.upload = targetUpload;
        }

        if (changed) {
            setDisplayValues({ download: current.download, upload: current.upload });
            rafRef.current = requestAnimationFrame(animateValues);
        }
    }, [usage.downloadToday, usage.uploadToday]);

    useEffect(() => {
        rafRef.current = requestAnimationFrame(animateValues);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [animateValues]);

    // Socket.IO connection for live updates
    useEffect(() => {
        const socket = (webSocketService as any).socket;
        if (!socket) return;

        const handleTick = (data: any) => {
            setIsConnected(true);
            setUsage(prev => ({
                downloadToday: prev.downloadToday + (data.downloadIncrement || 0) / (1024 * 1024 * 1024), // Convert to GB
                uploadToday: prev.uploadToday + (data.uploadIncrement || 0) / (1024 * 1024 * 1024),
                currentDownloadSpeed: data.currentDownloadSpeed || 0,
                currentUploadSpeed: data.currentUploadSpeed || 0,
                status: data.status || 'good',
            }));
        };

        socket.on('usage_tick', handleTick);
        socket.emit('start_usage_tracking');

        return () => {
            socket.off('usage_tick', handleTick);
            socket.emit('stop_usage_tracking');
        };
    }, []);

    const totalGB = displayValues.download + displayValues.upload;
    const usagePercent = Math.min((totalGB / dataLimitGB) * 100, 100);

    // Dynamic color based on usage percentage
    const getColor = (pct: number) => {
        if (pct < 50) return '#00e676';
        if (pct < 75) return '#ffc107';
        if (pct < 90) return '#ff9800';
        return '#f44336';
    };

    const gaugeColor = getColor(usagePercent);
    const radius = 80;
    const stroke = 10;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (usagePercent / 100) * circumference;

    const statusConfig = {
        excellent: { label: 'Excellent', color: '#00e676' },
        good: { label: 'Good', color: '#ffc107' },
        fair: { label: 'Fair', color: '#ff9800' },
    };

    const currentStatus = statusConfig[usage.status] || statusConfig.good;

    const formatGB = (gb: number) => {
        if (gb < 0.01) return `${(gb * 1024).toFixed(1)} MB`;
        return `${gb.toFixed(2)} GB`;
    };

    return (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                borderRadius: 4,
                background: 'linear-gradient(145deg, #0a0e27 0%, #1a1f3a 50%, #0d1230 100%)',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(102, 126, 234, 0.2)',
            }}
        >
            {/* Animated background glow */}
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: 220,
                    height: 220,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${gaugeColor}15 0%, transparent 70%)`,
                    transform: 'translate(-50%, -60%)',
                    animation: 'bgPulse 3s ease-in-out infinite',
                    '@keyframes bgPulse': {
                        '0%, 100%': { opacity: 0.5, transform: 'translate(-50%, -60%) scale(1)' },
                        '50%': { opacity: 1, transform: 'translate(-50%, -60%) scale(1.1)' },
                    },
                }}
            />

            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} position="relative">
                <Typography variant="subtitle2" sx={{ opacity: 0.7, letterSpacing: 1.5, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    Live Usage Monitor
                </Typography>
                <Chip
                    icon={<DotIcon sx={{ fontSize: 10, color: isConnected ? '#00e676' : '#f44336', animation: isConnected ? 'blink 1.5s infinite' : 'none', '@keyframes blink': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />}
                    label={isConnected ? 'LIVE' : 'CONNECTING'}
                    size="small"
                    sx={{
                        bgcolor: isConnected ? 'rgba(0,230,118,0.1)' : 'rgba(244,67,54,0.1)',
                        color: isConnected ? '#00e676' : '#f44336',
                        fontSize: '0.65rem',
                        height: 22,
                        border: `1px solid ${isConnected ? 'rgba(0,230,118,0.3)' : 'rgba(244,67,54,0.3)'}`,
                    }}
                />
            </Box>

            {/* Circular Gauge */}
            <Box display="flex" justifyContent="center" position="relative" mb={2}>
                <svg width={200} height={200} viewBox="0 0 200 200">
                    {/* Background circle */}
                    <circle
                        cx="100" cy="100" r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth={stroke}
                    />
                    {/* Animated progress arc */}
                    <circle
                        cx="100" cy="100" r={radius}
                        fill="none"
                        stroke={gaugeColor}
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        transform="rotate(-90 100 100)"
                        style={{
                            transition: 'stroke-dashoffset 1.5s ease-out, stroke 0.5s ease',
                            filter: `drop-shadow(0 0 8px ${gaugeColor}80)`,
                        }}
                    />
                    {/* Glow effect */}
                    <circle
                        cx="100" cy="100" r={radius}
                        fill="none"
                        stroke={gaugeColor}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        transform="rotate(-90 100 100)"
                        style={{
                            transition: 'stroke-dashoffset 1.5s ease-out',
                            filter: `drop-shadow(0 0 16px ${gaugeColor})`,
                            opacity: 0.4,
                        }}
                    />
                    {/* Center text */}
                    <text x="100" y="85" textAnchor="middle" fill="#fff" fontSize="28" fontWeight="bold" fontFamily="Inter, sans-serif">
                        {formatGB(totalGB)}
                    </text>
                    <text x="100" y="108" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="11" fontFamily="Inter, sans-serif">
                        of {dataLimitGB} GB used today
                    </text>
                    <text x="100" y="128" textAnchor="middle" fill={gaugeColor} fontSize="13" fontWeight="600" fontFamily="Inter, sans-serif">
                        {usagePercent.toFixed(1)}%
                    </text>
                </svg>
            </Box>

            {/* Speed & Usage Stats Grid */}
            <Box
                display="grid"
                gridTemplateColumns="1fr 1fr"
                gap={1.5}
                position="relative"
            >
                {/* Download */}
                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'rgba(102, 126, 234, 0.1)',
                        border: '1px solid rgba(102, 126, 234, 0.15)',
                    }}
                >
                    <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                        <DownloadIcon sx={{ fontSize: 14, color: '#667eea' }} />
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>
                            Download
                        </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.9rem' }}>
                        {formatGB(displayValues.download)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#667eea', fontSize: '0.7rem' }}>
                        {usage.currentDownloadSpeed.toFixed(1)} Mbps
                    </Typography>
                </Box>

                {/* Upload */}
                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'rgba(118, 75, 162, 0.1)',
                        border: '1px solid rgba(118, 75, 162, 0.15)',
                    }}
                >
                    <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                        <UploadIcon sx={{ fontSize: 14, color: '#764ba2' }} />
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>
                            Upload
                        </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.9rem' }}>
                        {formatGB(displayValues.upload)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#764ba2', fontSize: '0.7rem' }}>
                        {usage.currentUploadSpeed.toFixed(1)} Mbps
                    </Typography>
                </Box>

                {/* Speed */}
                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'rgba(0, 230, 118, 0.06)',
                        border: '1px solid rgba(0, 230, 118, 0.12)',
                    }}
                >
                    <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                        <SpeedIcon sx={{ fontSize: 14, color: '#00e676' }} />
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>
                            Current Speed
                        </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={700} sx={{ fontSize: '0.9rem' }}>
                        {usage.currentDownloadSpeed.toFixed(1)}
                        <Typography component="span" variant="caption" sx={{ ml: 0.3, opacity: 0.6 }}>Mbps</Typography>
                    </Typography>
                </Box>

                {/* Connection Status */}
                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: `${currentStatus.color}08`,
                        border: `1px solid ${currentStatus.color}20`,
                    }}
                >
                    <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                        <DotIcon sx={{ fontSize: 10, color: currentStatus.color }} />
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>
                            Connection
                        </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={700} sx={{ color: currentStatus.color, fontSize: '0.9rem' }}>
                        {currentStatus.label}
                    </Typography>
                </Box>
            </Box>
        </Paper>
    );
};

export default RealTimeUsageCounter;

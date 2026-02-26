// NeuroGuard — Mock Data Generator for demo mode
import { Alert, SessionData, DailyTrend, VitalStats, BurnoutPrediction, DeviceStatus, UserProfile, Report, AlertRule } from '@/types';

// Generate realistic ECG waveform (PQRST complex)
export function generateECGPoint(t: number): number {
    const hr = 72;
    const period = 60 / hr;
    const phase = (t % period) / period;
    let v = 0;
    // P wave
    if (phase > 0.1 && phase < 0.2) v = 0.15 * Math.sin(((phase - 0.1) / 0.1) * Math.PI);
    // QRS complex
    else if (phase > 0.25 && phase < 0.28) v = -0.2 * Math.sin(((phase - 0.25) / 0.03) * Math.PI);
    else if (phase > 0.28 && phase < 0.33) v = 1.2 * Math.sin(((phase - 0.28) / 0.05) * Math.PI);
    else if (phase > 0.33 && phase < 0.36) v = -0.3 * Math.sin(((phase - 0.33) / 0.03) * Math.PI);
    // T wave
    else if (phase > 0.45 && phase < 0.6) v = 0.25 * Math.sin(((phase - 0.45) / 0.15) * Math.PI);
    // Add noise
    v += (Math.random() - 0.5) * 0.03;
    return v;
}

// Generate realistic EMG signal
export function generateEMGPoint(t: number): number {
    const base = Math.sin(t * 2 * Math.PI * 50) * 20;
    const burst = Math.sin(t * 0.5) > 0.3 ? Math.random() * 60 - 30 : 0;
    const noise = (Math.random() - 0.5) * 15;
    return base + burst + noise;
}

export function generateVitalStats(): VitalStats {
    return {
        heartRate: 68 + Math.floor(Math.random() * 12),
        hrv: 38 + Math.floor(Math.random() * 15),
        rmssd: 32 + Math.floor(Math.random() * 15),
        sdnn: 45 + Math.floor(Math.random() * 18),
        lfHfRatio: +(1.2 + Math.random() * 1.2).toFixed(1),
        emgRms: +(30 + Math.random() * 30).toFixed(1),
        emgMedianFreq: 75 + Math.floor(Math.random() * 25),
        emgMav: +(25 + Math.random() * 25).toFixed(1),
        emgVariance: +(100 + Math.random() * 120).toFixed(1),
    };
}

export function generateBurnoutPrediction(): BurnoutPrediction {
    const score = Math.floor(20 + Math.random() * 45);
    return {
        score,
        classification: score < 40 ? 'normal' : score < 70 ? 'high_stress' : 'burnout_risk',
        confidence: +(0.82 + Math.random() * 0.15).toFixed(2),
        features: [
            { name: 'Heart Rate', value: 72, contribution: 12 + Math.floor(Math.random() * 8) },
            { name: 'HRV', value: 42, contribution: 15 + Math.floor(Math.random() * 10) },
            { name: 'RMSSD', value: 38, contribution: 10 + Math.floor(Math.random() * 8) },
            { name: 'SDNN', value: 52, contribution: 8 + Math.floor(Math.random() * 7) },
            { name: 'LF/HF', value: 1.8, contribution: 18 + Math.floor(Math.random() * 12) },
            { name: 'EMG RMS', value: 45.2, contribution: 14 + Math.floor(Math.random() * 8) },
        ],
    };
}

const alertMessages: { severity: Alert['severity']; message: string; source: Alert['source'] }[] = [
    { severity: 'critical', message: 'Burnout score exceeded 75% threshold — immediate rest recommended', source: 'ML' },
    { severity: 'critical', message: 'Heart rate sustained above 110 BPM for 8 minutes', source: 'ECG' },
    { severity: 'warning', message: 'HRV dropped below 25ms — moderate stress detected', source: 'ECG' },
    { severity: 'warning', message: 'EMG fatigue index declining — median frequency below 75Hz', source: 'EMG' },
    { severity: 'info', message: 'Recording session completed — 42 minutes', source: 'System' },
    { severity: 'success', message: 'Device reconnected successfully', source: 'Device' },
    { severity: 'warning', message: 'LF/HF ratio elevated above 2.5 for 10 minutes', source: 'ECG' },
    { severity: 'info', message: 'Daily health report generated automatically', source: 'System' },
    { severity: 'success', message: 'Calibration completed successfully', source: 'Device' },
    { severity: 'critical', message: 'Burnout risk detected — 3 consecutive high-stress days', source: 'ML' },
];

export function generateAlerts(count = 6): Alert[] {
    return alertMessages.slice(0, count).map((a, i) => ({
        id: `alert-${i}`,
        ...a,
        timestamp: new Date(Date.now() - i * 900000 - Math.random() * 600000),
        read: i > 3,
    }));
}

/**
 * Generate a 1000-sample (10s at 100Hz) ADC ECG buffer for demo sessions.
 * Uses generateECGPoint() to produce realistic PQRST waveforms, then maps
 * the float mV values back to 10-bit ADC units (0-1023) as the device sends.
 */
function generateRawECGBuffer(bpmOffset = 0): number[] {
    const hr = 72 + bpmOffset;
    const result: number[] = [];
    for (let i = 0; i < 1000; i++) {
        const t = i / 100; // seconds
        const period = 60 / hr;
        const phase = (t % period) / period;
        let v = 0;
        if (phase > 0.1 && phase < 0.2) v = 0.15 * Math.sin(((phase - 0.1) / 0.1) * Math.PI);
        else if (phase > 0.25 && phase < 0.28) v = -0.2 * Math.sin(((phase - 0.25) / 0.03) * Math.PI);
        else if (phase > 0.28 && phase < 0.33) v = 1.2 * Math.sin(((phase - 0.28) / 0.05) * Math.PI);
        else if (phase > 0.33 && phase < 0.36) v = -0.3 * Math.sin(((phase - 0.33) / 0.03) * Math.PI);
        else if (phase > 0.45 && phase < 0.6) v = 0.25 * Math.sin(((phase - 0.45) / 0.15) * Math.PI);
        v += (Math.random() - 0.5) * 0.03;
        // Map mV back to 10-bit ADC: adc = (v / 1.5) * (1023/2) + 511
        const adc = Math.round((v / 1.5) * 511.5 + 511.5);
        result.push(Math.max(0, Math.min(1023, adc)));
    }
    return result;
}

export function generateSessionHistory(count = 10): SessionData[] {
    return Array.from({ length: count }, (_, i) => {
        const score = 20 + Math.floor(Math.random() * 55);
        const bpmOffsets = [0, 5, -3, 8, -5, 12, -8, 3, -2, 6];
        return {
            id: `session-${i}`,
            date: new Date(Date.now() - i * 86400000),
            duration: 1200 + Math.floor(Math.random() * 3000),
            avgHR: 65 + Math.floor(Math.random() * 20),
            avgHRV: 30 + Math.floor(Math.random() * 25),
            burnoutScore: score,
            classification: score < 40 ? 'normal' as const : score < 70 ? 'high_stress' as const : 'burnout_risk' as const,
            rawECG: generateRawECGBuffer(bpmOffsets[i % bpmOffsets.length]),
        };
    });
}

export function generateWeeklyTrends(): DailyTrend[] {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
        date: day,
        avgHR: 68 + Math.floor(Math.random() * 12),
        avgHRV: 35 + Math.floor(Math.random() * 18),
        burnoutScore: 25 + Math.floor(Math.random() * 35),
        emgFatigueIndex: 75 + Math.floor(Math.random() * 20),
    }));
}

export function generateDeviceStatus(): DeviceStatus {
    return {
        connected: true,
        deviceName: 'Arduino Uno R3',
        serialPort: 'COM3',
        baudRate: 115200,
        firmwareVersion: 'v2.1.3',
        bioAmpVersion: 'EXG Pill v1.0',
        ecgQuality: 82 + Math.floor(Math.random() * 15),
        emgQuality: 58 + Math.floor(Math.random() * 20),
        ecgSnr: +(16 + Math.random() * 5).toFixed(1),
        emgSnr: +(11 + Math.random() * 4).toFixed(1),
        uptime: 8100,
    };
}

export function getUserProfile(): UserProfile {
    return {
        name: 'Manish Rai',
        email: 'manish@neuroguard.io',
        occupation: 'Student',
        memberSince: new Date('2026-02-01'),
        age: 22,
        gender: 'Male',
        restingHR: 68,
        avgSleep: 7.5,
        stressBaseline: 4,
        totalSessions: 47,
        avgScore: 34,
        streak: 12,
    };
}

export function generateReports(): Report[] {
    return [
        { id: 'r1', name: 'Weekly Health Report', dateRange: { from: new Date('2026-02-03'), to: new Date('2026-02-09') }, type: 'weekly', generatedOn: new Date('2026-02-09'), status: 'ready' },
        { id: 'r2', name: 'Daily Summary', dateRange: { from: new Date('2026-02-09'), to: new Date('2026-02-09') }, type: 'daily', generatedOn: new Date('2026-02-09'), status: 'ready' },
        { id: 'r3', name: 'Full Assessment', dateRange: { from: new Date('2026-01-15'), to: new Date('2026-02-09') }, type: 'full', generatedOn: new Date('2026-02-10'), status: 'ready' },
    ];
}

export function generateAlertRules(): AlertRule[] {
    return [
        { id: 'ar1', condition: 'HR > 100 BPM for more than 5 minutes', active: true },
        { id: 'ar2', condition: 'Burnout Score > 60% for 3 consecutive days', active: true },
        { id: 'ar3', condition: 'HRV drops 30% below baseline', active: false },
        { id: 'ar4', condition: 'EMG Median Frequency < 70 Hz', active: true },
    ];
}

export function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
}

export function formatTime(date: Date): string {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
}

export function getClassColor(c: string): string {
    if (c === 'normal') return 'var(--accent-green)';
    if (c === 'high_stress') return 'var(--accent-yellow)';
    return 'var(--accent-red)';
}

export function getClassLabel(c: string): string {
    if (c === 'normal') return 'Normal';
    if (c === 'high_stress') return 'High Stress';
    return 'Burnout Risk';
}

export function getClassBadge(c: string): string {
    if (c === 'normal') return 'badge-green';
    if (c === 'high_stress') return 'badge-yellow';
    return 'badge-red';
}

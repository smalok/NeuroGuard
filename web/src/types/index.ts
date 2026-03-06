// NeuroGuard System — TypeScript Types

export interface ECGData {
    timestamp: number;
    value: number;        // mV
    rPeak?: boolean;
}

export interface EEGData {
    timestamp: number;
    value: number;        // µV
    channel?: string;     // electrode placement (e.g. Fp1, Fp2)
}

export interface VitalStats {
    heartRate: number;          // BPM
    hrv: number;                // ms (RMSSD)
    rmssd: number;              // ms
    sdnn: number;               // ms
    lfHfRatio: number;          // ratio
    eegAlphaPower: number;      // µV² (8-13 Hz)
    eegBetaPower: number;       // µV² (13-30 Hz)
    eegThetaBetaRatio: number;  // ratio (focus metric)
    eegSignalQuality: number;   // 0-100
}

export interface BurnoutPrediction {
    score: number;              // 0-100
    classification: 'normal' | 'high_stress' | 'burnout_risk';
    confidence: number;         // 0-1
    features: FeatureContribution[];
}

export interface FeatureContribution {
    name: string;
    value: number;
    contribution: number;       // percentage
}

export interface Alert {
    id: string;
    severity: 'critical' | 'warning' | 'info' | 'success';
    message: string;
    source: 'ECG' | 'EEG' | 'ML' | 'System' | 'Device';
    timestamp: Date;
    read: boolean;
}

export interface SessionData {
    id: string;
    date: Date;
    duration: number;           // seconds
    avgHR: number;
    avgHRV: number;
    burnoutScore: number;
    classification: 'normal' | 'high_stress' | 'burnout_risk';
    rawECG?: number[];
    rawEEG?: number[];
}

export interface DailyTrend {
    date: string;
    avgHR: number;
    avgHRV: number;
    burnoutScore: number;
    eegFocusIndex: number;
}

export interface DeviceStatus {
    connected: boolean;
    deviceName: string;
    serialPort: string;
    baudRate: number;
    firmwareVersion: string;
    bioAmpVersion: string;
    ecgQuality: number;        // 0-100
    eegQuality: number;        // 0-100
    ecgSnr: number;             // dB
    eegSnr: number;             // dB
    uptime: number;             // seconds
    ecgDeviceIp?: string;
    eegDeviceIp?: string;
}

export interface UserProfile {
    name: string;
    email: string;
    avatar?: string;
    occupation: string;
    memberSince: Date;
    age: number;
    gender: string;
    restingHR: number;
    avgSleep: number;
    stressBaseline: number;
    totalSessions: number;
    avgScore: number;
    streak: number;
}

export interface Report {
    id: string;
    name: string;
    dateRange: { from: Date; to: Date };
    type: 'daily' | 'weekly' | 'full';
    generatedOn: Date;
    status: 'ready' | 'generating';
    dataSnapshot?: {
        avgHR: number;
        avgHRV: number;
        burnoutScore: number;
        ecgSample?: number[];
        eegSample?: number[];
    };
}

export interface AlertRule {
    id: string;
    condition: string;
    active: boolean;
}

export type NavItem = {
    icon: string;
    label: string;
    href: string;
    badge?: number;
};

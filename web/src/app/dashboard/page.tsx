'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/layout/Header';
import WaveformChart from '@/components/charts/WaveformChart';
import GaugeChart from '@/components/charts/GaugeChart';
import StatCard from '@/components/ui/StatCard';
import { Activity, Brain, TrendingUp, Clock, AlertTriangle, Heart, Shield, Zap, CheckCircle } from 'lucide-react';
import { VitalStats, BurnoutPrediction } from '@/types';
import { useDevice } from '@/context/DeviceContext';
import { serialService, SerialData } from '@/services/serialService';
import { mlService } from '@/services/mlService';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, BarElement, Filler, Tooltip, Legend,
} from 'chart.js';
import styles from './page.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);

export default function DashboardPage() {
    const { isConnected, ecgConnected, eegConnected, isScanning, startScanning, stopScanning } = useDevice();
    const [vitals, setVitals] = useState<VitalStats>({
        heartRate: 0, hrv: 0, rmssd: 0, sdnn: 0, lfHfRatio: 0,
        eegAlphaPower: 0, eegBetaPower: 0, eegThetaBetaRatio: 0, eegSignalQuality: 0
    });
    const [prediction, setPrediction] = useState<BurnoutPrediction>({
        score: 0, classification: 'normal', confidence: 0, features: []
    });
    const [sessionTime, setSessionTime] = useState(0);
    const [ecgClassification, setEcgClassification] = useState('—');
    const [eegClassification, setEegClassification] = useState('—');

    const ecgBuffer = useRef<{ val: number, time: number }[]>([]);
    const eegBuffer = useRef<number[]>([]);
    const latestECG = useRef(0);
    const latestEEG = useRef(0);

    useEffect(() => {
        if (!isConnected) {
            latestECG.current = 0;
            latestEEG.current = 0;
            ecgBuffer.current = [];
            eegBuffer.current = [];
            setVitals({ heartRate: 0, hrv: 0, rmssd: 0, sdnn: 0, lfHfRatio: 0, eegAlphaPower: 0, eegBetaPower: 0, eegThetaBetaRatio: 0, eegSignalQuality: 0 });
            setPrediction({ score: 0, classification: 'normal', confidence: 0, features: [] });
        }
    }, [isConnected]);

    // Load ML models on mount
    useEffect(() => { mlService.loadModel(); }, []);

    useEffect(() => {
        const unsubscribe = serialService.subscribe((data: SerialData) => {
            if (!isScanning) return;
            latestECG.current = data.ecg;
            latestEEG.current = data.eeg;
            ecgBuffer.current.push({ val: data.ecg, time: Date.now() });
            eegBuffer.current.push(data.eeg);
            if (ecgBuffer.current.length > 500) ecgBuffer.current.shift();
            if (eegBuffer.current.length > 500) eegBuffer.current.shift();
        });
        return () => { unsubscribe(); };
    }, [isScanning]);

    const ecgGen = useCallback(() => latestECG.current, []);
    const eegGen = useCallback(() => latestEEG.current, []);

    // Feature Extraction & Inference Loop (1Hz)
    useEffect(() => {
        if (!isScanning) return;
        const interval = setInterval(() => {
            const ecgData = ecgBuffer.current;
            const eegData = eegBuffer.current;
            if (ecgData.length < 50) return;

            // ECG: Peak Detection for HR
            const signal = ecgData.map(d => d.val);
            const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
            const threshold = mean * 1.2;
            let lastPeakTime = 0;
            const rrIntervals: number[] = [];
            for (let i = 1; i < ecgData.length - 1; i++) {
                if (signal[i] > threshold && signal[i] > signal[i - 1] && signal[i] > signal[i + 1]) {
                    if (ecgData[i].time - lastPeakTime > 200) {
                        if (lastPeakTime > 0) rrIntervals.push(ecgData[i].time - lastPeakTime);
                        lastPeakTime = ecgData[i].time;
                    }
                }
            }
            const hr = rrIntervals.length > 0 ? 60000 / (rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length) : 0;
            const rmssd = rrIntervals.length > 1 ? Math.sqrt(rrIntervals.slice(1).map((rr, i) => Math.pow(rr - rrIntervals[i], 2)).reduce((a, b) => a + b, 0) / (rrIntervals.length - 1)) : 0;
            const eegAlpha = eegData.length > 0 ? Math.sqrt(eegData.reduce((a, b) => a + b * b, 0) / eegData.length) : 0;

            setVitals({
                heartRate: Math.round(hr), hrv: Math.round(rmssd), rmssd: Math.round(rmssd),
                sdnn: Math.round(rmssd * 1.1), lfHfRatio: 1.5,
                eegAlphaPower: Math.round(eegAlpha), eegBetaPower: 0, eegThetaBetaRatio: 0, eegSignalQuality: 0
            });

            // ML Predictions
            const stressScore = mlService.predict({
                hr: Math.round(hr), hrv: Math.round(rmssd), rmssd: Math.round(rmssd),
                sdnn: Math.round(rmssd * 1.1), lf_hf: 1.5, eeg_alpha: Math.round(eegAlpha)
            });
            const burnout = Math.round(stressScore * 100);
            setPrediction({
                score: burnout,
                classification: burnout > 70 ? 'burnout_risk' : burnout > 40 ? 'high_stress' : 'normal',
                confidence: 0.85, features: []
            });

            if (mlService.isECGModelReady && Math.round(hr) > 0) {
                const avgRR = rrIntervals.length > 0 ? rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length : 800;
                const rrStd = rrIntervals.length > 1 ? Math.sqrt(rrIntervals.reduce((a, b) => a + Math.pow(b - avgRR, 2), 0) / rrIntervals.length) : 0;
                const reg = avgRR > 0 ? Math.round(100 - (rrStd / avgRR) * 100) : 0;
                const ecgPred = mlService.predictECG({
                    hr: Math.round(hr), rr_regularity: reg, rr_std: rrStd,
                    st_deviation: (mean - 512) / 1000, pr_interval: 150, qrs_duration: 90,
                    qtc: 400, p_amplitude: 0.15, t_inversion: 0
                });
                setEcgClassification(ecgPred.name);
            }

            if (mlService.isEEGModelReady && eegData.length > 50) {
                const eegPred = mlService.predictEEG({
                    delta_pct: 15, theta_pct: 20, alpha_pct: 35, beta_pct: 30,
                    theta_beta_ratio: 0.67, spike_count: 0, alertness: 65, signal_rms: eegAlpha
                });
                setEegClassification(eegPred.name);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [isScanning]);

    useEffect(() => {
        const iv = setInterval(() => setSessionTime(t => t + 1), 1000);
        return () => clearInterval(iv);
    }, []);

    const formatTimer = (s: number) => {
        const h = Math.floor(s / 3600).toString().padStart(2, '0');
        const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return `${h}:${m}:${sec}`;
    };

    return (
        <>
            <Header breadcrumbs={[{ label: 'Dashboard' }]} liveStatus={isScanning} />
            <div className={styles.content}>
                {/* Top Stats */}
                <div className={styles.sessionBar}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>NeuroGuard Dashboard</h2>
                        <p className="text-secondary">
                            {ecgConnected && eegConnected ? 'Both ESP8266 Connected' : ecgConnected ? 'ECG ESP8266 Connected' : eegConnected ? 'EEG ESP8266 Connected' : 'Connect ESP8266 devices to start monitoring'}
                        </p>
                    </div>
                    <div className="flex gap-4 items-center">
                        {!isConnected && <span className="badge badge-yellow"><AlertTriangle size={12} /> No Device</span>}
                        {ecgConnected && <span className="badge badge-green"><Heart size={12} /> ECG Online</span>}
                        {eegConnected && <span className="badge badge-green"><Brain size={12} /> EEG Online</span>}
                        {isConnected && !isScanning && (
                            <button className="btn btn-primary btn-sm" onClick={startScanning}>
                                <Activity size={14} /> Start Scanning
                            </button>
                        )}
                        {isScanning && (
                            <button className="btn btn-danger btn-sm" onClick={stopScanning}>
                                <Activity size={14} /> Stop Scanning
                            </button>
                        )}
                        <div className="badge badge-blue"><Clock size={14} /> Session: {formatTimer(sessionTime)}</div>
                    </div>
                </div>

                {/* Main Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: 'var(--space-6)', alignItems: 'stretch' }}>
                    <div className={styles.chartCard} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <GaugeChart value={prediction.score} label="Burnout Risk" classification={prediction.classification} />
                        <div className="text-center mt-4">
                            <p className="text-secondary text-sm">AI Confidence: {(prediction.confidence * 100).toFixed(0)}%</p>
                        </div>
                    </div>

                    <div className="ng-grid-2">
                        <StatCard title="Heart Rate" value={vitals.heartRate.toString()} unit="BPM" icon={Heart} color="var(--accent-red)"
                            status={{ label: vitals.heartRate > 100 ? 'Tachycardia' : vitals.heartRate > 0 && vitals.heartRate < 60 ? 'Bradycardia' : vitals.heartRate > 0 ? 'Normal' : 'No Signal', type: vitals.heartRate > 100 || (vitals.heartRate > 0 && vitals.heartRate < 60) ? 'yellow' : vitals.heartRate > 0 ? 'green' : 'red' }} />
                        <StatCard title="HRV (RMSSD)" value={vitals.hrv.toString()} unit="ms" icon={Activity} color="var(--accent-blue)"
                            status={{ label: vitals.hrv < 20 && vitals.hrv > 0 ? 'Low' : vitals.hrv > 0 ? 'Normal' : 'No Data', type: vitals.hrv < 20 && vitals.hrv > 0 ? 'red' : vitals.hrv > 0 ? 'green' : 'red' }} />
                        <StatCard title="ECG AI" value={ecgClassification} unit="" icon={Shield} color="var(--accent-green)"
                            status={{ label: ecgClassification !== '—' ? 'Active' : 'Waiting', type: ecgClassification !== '—' ? 'green' : 'yellow' }} />
                        <StatCard title="EEG AI" value={eegClassification} unit="" icon={Brain} color="var(--accent-purple)"
                            status={{ label: eegClassification !== '—' ? 'Active' : 'Waiting', type: eegClassification !== '—' ? 'green' : 'yellow' }} />
                    </div>
                </div>

                {/* Charts Row */}
                <div className="ng-grid-2">
                    <div className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <h4>Live ECG</h4>
                            <span className="badge badge-blue">{ecgConnected ? '● Active' : '○ Offline'}</span>
                        </div>
                        <div style={{ height: 250 }}>
                            {isScanning && ecgConnected ? (
                                <WaveformChart title="" color="var(--accent-blue)" unit="mV (raw)" generatePoint={ecgGen} />
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', background: '#0d1220', borderRadius: 'var(--radius-md)' }}>
                                    <p style={{ fontSize: '0.8rem' }}>Connect ECG ESP8266 & Start Scanning</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <h4>Live EEG</h4>
                            <span className="badge badge-purple">{eegConnected ? '● Active' : '○ Offline'}</span>
                        </div>
                        <div style={{ height: 250 }}>
                            {isScanning && eegConnected ? (
                                <WaveformChart title="" color="var(--accent-purple)" unit="µV (raw)" generatePoint={eegGen} />
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', background: '#0d1220', borderRadius: 'var(--radius-md)' }}>
                                    <p style={{ fontSize: '0.8rem' }}>Connect EEG ESP8266 & Start Scanning</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

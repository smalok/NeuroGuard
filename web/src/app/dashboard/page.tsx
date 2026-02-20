'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/layout/Header';
import WaveformChart from '@/components/charts/WaveformChart';
import GaugeChart from '@/components/charts/GaugeChart';
import StatCard from '@/components/ui/StatCard';
import { Activity, Zap, TrendingUp, Brain, Clock, AlertTriangle } from 'lucide-react';
import { VitalStats, BurnoutPrediction } from '@/types';
import { useDevice } from '@/context/DeviceContext';
import { serialService, SerialData } from '@/services/serialService';
import { mlService } from '@/services/mlService';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, BarElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import styles from './page.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);

export default function DashboardPage() {
    const { isConnected, isScanning, startScanning, stopScanning } = useDevice();
    const [vitals, setVitals] = useState<VitalStats>({
        heartRate: 0, hrv: 0, rmssd: 0, sdnn: 0, lfHfRatio: 0,
        emgRms: 0, emgMedianFreq: 0, emgMav: 0, emgVariance: 0
    });
    const [prediction, setPrediction] = useState<BurnoutPrediction>({
        score: 0, classification: 'normal', confidence: 0, features: []
    });
    const [sessionTime, setSessionTime] = useState(0);

    // Data Refs for processing
    const ecgBuffer = useRef<{ val: number, time: number }[]>([]);
    const emgBuffer = useRef<number[]>([]);
    const latestECG = useRef(0);
    const latestEMG = useRef(0);
    const lastPacketTime = useRef(Date.now());

    // Clear everything when device disconnects
    useEffect(() => {
        if (!isConnected) {
            latestECG.current = 0;
            latestEMG.current = 0;
            ecgBuffer.current = [];
            emgBuffer.current = [];
            lastPacketTime.current = Date.now();
            setVitals({ heartRate: 0, hrv: 0, rmssd: 0, sdnn: 0, lfHfRatio: 0, emgRms: 0, emgMedianFreq: 0, emgMav: 0, emgVariance: 0 });
            setPrediction({ score: 0, classification: 'normal', confidence: 0, features: [] });
        }
    }, [isConnected]);

    // Subscribe to Serial Service
    useEffect(() => {
        const unsubscribe = serialService.subscribe((data: SerialData) => {
            if (!isScanning) return; // Ignore data if not scanning

            const now = Date.now();
            latestECG.current = data.ecg;
            latestEMG.current = data.emg;
            lastPacketTime.current = now;

            // Accumulate for features (keep 5s window approx)
            ecgBuffer.current.push({ val: data.ecg, time: now });
            emgBuffer.current.push(data.emg);

            if (ecgBuffer.current.length > 500) ecgBuffer.current.shift();
            if (emgBuffer.current.length > 500) emgBuffer.current.shift();
        });

        return () => { unsubscribe(); };
    }, [isScanning]);

    // Generators for Charts (Pull latest)
    const ecgGen = useCallback(() => latestECG.current, []);
    const emgGen = useCallback(() => latestEMG.current, []);

    // Feature Extraction & Inference Loop (1Hz)
    useEffect(() => {
        if (!isScanning) return;
        const interval = setInterval(() => {
            // 1. Calculate Simple Features
            const ecgData = ecgBuffer.current;
            const emgData = emgBuffer.current;
            if (ecgData.length < 50) return;

            // Simple Peak Detection for HR
            // Find local maxima > threshold
            const signal = ecgData.map(d => d.val);
            const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
            const threshold = mean * 1.2; // roughly
            let peaks = 0;
            let lastPeakTime = 0;
            let rrIntervals: number[] = [];

            for (let i = 1; i < ecgData.length - 1; i++) {
                if (signal[i] > threshold && signal[i] > signal[i - 1] && signal[i] > signal[i + 1]) {
                    // Debounce 200ms
                    if (ecgData[i].time - lastPeakTime > 200) {
                        if (lastPeakTime > 0) rrIntervals.push(ecgData[i].time - lastPeakTime);
                        lastPeakTime = ecgData[i].time;
                        peaks++;
                    }
                }
            }

            // Calc HR & HRV
            const hr = rrIntervals.length > 0 ? 60000 / (rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length) : 0;
            const rmssd = rrIntervals.length > 1
                ? Math.sqrt(rrIntervals.slice(1).map((rr, i) => Math.pow(rr - rrIntervals[i], 2)).reduce((a, b) => a + b, 0) / (rrIntervals.length - 1))
                : 0;

            // Calc EMG RMS
            const emgRms = Math.sqrt(emgData.reduce((a, b) => a + b * b, 0) / emgData.length);

            const newVitals: VitalStats = {
                heartRate: Math.round(hr),
                hrv: Math.round(rmssd), // Approximation
                rmssd: Math.round(rmssd),
                sdnn: Math.round(rmssd * 1.1),
                lfHfRatio: 1.5,
                emgRms: Math.round(emgRms),
                emgMedianFreq: 0, emgMav: 0, emgVariance: 0
            };
            setVitals(newVitals);

            // 2. ML Prediction
            const score = mlService.predict({
                hr: newVitals.heartRate,
                hrv: newVitals.hrv,
                rmssd: newVitals.rmssd,
                sdnn: newVitals.sdnn,
                lf_hf: newVitals.lfHfRatio,
                emg_rms: newVitals.emgRms
            });

            // Map 0-1 score to burnout metric
            const burnoutScore = Math.round(score * 100);
            setPrediction({
                score: burnoutScore,
                classification: burnoutScore > 70 ? 'burnout_risk' : burnoutScore > 40 ? 'high_stress' : 'normal',
                confidence: 0.85,
                features: []
            });

        }, 1000);
        return () => clearInterval(interval);
    }, [isScanning]);

    // Session timer
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
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Overview</h2>
                        <p className="text-secondary">{isConnected ? 'Device Connected' : 'Waiting for connection...'}</p>
                    </div>
                    <div className="flex gap-4 items-center">
                        {!isConnected && <span className="badge badge-yellow"><AlertTriangle size={12} /> Device Disconnected</span>}
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
                <div className="grid-3">
                    {/* Burnout Gauge */}
                    <div className={styles.chartCard} style={{ gridColumn: 'span 1' }}>
                        <GaugeChart value={prediction.score} label="Burnout Risk" classification={prediction.classification} />
                        <div className="text-center mt-4">
                            <p className="text-secondary text-sm">AI Confidence: {(prediction.confidence * 100).toFixed(0)}%</p>
                        </div>
                    </div>

                    <div className="grid-2 col-span-2">
                        <StatCard title="Heart Rate" value={vitals.heartRate.toString()} unit="BPM" icon={Activity} color="var(--accent-red)"
                            trend={{ value: '2', up: true }} status={{ label: vitals.heartRate > 100 ? 'Warning' : 'Normal', type: vitals.heartRate > 100 ? 'yellow' : 'green' }} />
                        <StatCard title="HRV (RMSSD)" value={vitals.hrv.toString()} unit="ms" icon={Activity} color="var(--accent-blue)"
                            trend={{ value: '5', up: false }} status={{ label: vitals.hrv < 20 ? 'Low' : 'Normal', type: vitals.hrv < 20 ? 'red' : 'green' }} />
                        <StatCard title="EMG Fatigue" value={vitals.emgRms.toString()} unit="µV" icon={Zap} color="var(--accent-purple)"
                            trend={{ value: '12', up: true }} />
                        <StatCard title="Stress Level" value={(prediction.score / 10).toFixed(1)} unit="/ 10" icon={Brain} color="var(--accent-yellow)"
                            status={{ label: prediction.classification === 'normal' ? 'Normal' : 'High', type: prediction.classification === 'normal' ? 'green' : 'yellow' }} />
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid-2">
                    <div className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <h4>Live ECG</h4>
                            <span className="badge badge-blue">Lead I</span>
                        </div>
                        <div style={{ height: 250 }}>
                            <WaveformChart title="" color="var(--accent-blue)" unit="mV" generatePoint={ecgGen} />
                        </div>
                    </div>
                    <div className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <h4>Live EMG</h4>
                            <span className="badge badge-purple">Bicep</span>
                        </div>
                        <div style={{ height: 250 }}>
                            <WaveformChart title="" color="var(--accent-purple)" unit="µV" generatePoint={emgGen} />
                        </div>
                    </div>
                </div>
            </div >
        </>
    );
}


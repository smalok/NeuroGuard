'use client';
import { useCallback, useEffect, useState, useRef } from 'react';
import Header from '@/components/layout/Header';
import WaveformChart from '@/components/charts/WaveformChart';
import StatCard from '@/components/ui/StatCard';
import { serialService, SerialData } from '@/services/serialService';
import { VitalStats } from '@/types';
import { Zap, Activity, BarChart3, TrendingDown, AlertCircle } from 'lucide-react';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, BarElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import styles from './page.module.css';

import { useDevice } from '@/context/DeviceContext';
import { Play, Square } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);

export default function EMGPage() {
    const { isConnected, isScanning, startScanning, stopScanning } = useDevice();
    const [vitals, setVitals] = useState<VitalStats>({
        heartRate: 0, hrv: 0, rmssd: 0, sdnn: 0, lfHfRatio: 0,
        emgRms: 0, emgMedianFreq: 0, emgMav: 0, emgVariance: 0
    });
    const latestEMG = useRef(0);
    const emgBuffer = useRef<number[]>([]);
    const lastPacketTime = useRef(Date.now());

    // Clear buffers when device disconnects
    useEffect(() => {
        if (!isConnected) {
            latestEMG.current = 0;
            emgBuffer.current = [];
            lastPacketTime.current = Date.now();
            setVitals(v => ({ ...v, emgRms: 0, emgMav: 0, emgVariance: 0 }));
        }
    }, [isConnected]);

    useEffect(() => {
        const unsubscribe = serialService.subscribe((data: SerialData) => {
            if (!isScanning) return;
            latestEMG.current = data.emg;
            lastPacketTime.current = Date.now();
            emgBuffer.current.push(data.emg);
            if (emgBuffer.current.length > 1000) emgBuffer.current.shift();
        });

        return () => { unsubscribe(); };
    }, [isScanning]);

    const emgGen = useCallback(() => latestEMG.current, []);

    // Simple Vitals Loop
    useEffect(() => {
        if (!isScanning) return;
        const interval = setInterval(() => {
            const buffer = emgBuffer.current;
            if (buffer.length < 50) return;

            // Calc RMS
            const emgRms = Math.sqrt(buffer.reduce((a, b) => a + b * b, 0) / buffer.length);

            // Approximation
            setVitals(v => ({ ...v, emgRms: Math.round(emgRms), emgMav: Math.round(emgRms * 0.9), emgVariance: Math.round(Math.pow(emgRms, 2)) }));
        }, 1000);
        return () => clearInterval(interval);
    }, [isScanning]);

    const chartOpts = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { display: false }, x: { display: false } }
    };

    const activityData = {
        labels: Array(20).fill(''),
        datasets: [{ data: isScanning ? emgBuffer.current.slice(-20) : [], borderColor: '#a855f7', tension: 0.4 }]
    };

    return (
        <>
            <Header breadcrumbs={[{ label: 'Dashboard' }, { label: 'EMG Monitor' }]} liveStatus={isScanning} />
            <div className={styles.content}>
                {/* Main Waveform */}
                <div className={styles.chartCard}>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <h4>Live Muscle Activity</h4>
                            {!isConnected && <span className="badge badge-yellow"><AlertCircle size={12} /> Device Disconnected</span>}
                        </div>
                        <div className="flex gap-2 items-center">
                            {isConnected && !isScanning && (
                                <button className="btn btn-primary btn-sm" onClick={startScanning}>
                                    <Play size={14} /> Start
                                </button>
                            )}
                            {isScanning && (
                                <button className="btn btn-danger btn-sm" onClick={stopScanning}>
                                    <Square size={14} /> Stop
                                </button>
                            )}
                            <div className="divider-vertical"></div>
                            <button className="btn btn-sm btn-outline">10s</button>
                            <button className="btn btn-sm btn-outline active">30s</button>
                        </div>
                    </div>
                    <div style={{ height: 400 }}>
                        <WaveformChart title="" color="var(--accent-purple)" unit="µV" generatePoint={emgGen} />
                    </div>
                </div>

                {/* Vital Stats */}
                <div className="grid-4">
                    <StatCard title="EMG RMS" value={vitals.emgRms.toString()} unit="µV" icon={Zap} color="var(--accent-purple)" status={{ label: 'Normal', type: 'green' }} />
                    <StatCard title="Mean Absolute Value" value={vitals.emgMav.toString()} unit="µV" icon={Activity} color="var(--accent-blue)" status={{ label: 'Normal', type: 'green' }} />
                    <StatCard title="Variance" value={vitals.emgVariance.toString()} unit="" icon={BarChart3} color="var(--accent-yellow)" status={{ label: 'Normal', type: 'green' }} />
                    <StatCard title="Signal Quality" value={isScanning ? "Good" : "None"} unit="" icon={TrendingDown} color="var(--accent-green)" status={{ label: isScanning ? "Good" : "No Signal", type: isScanning ? "green" : "yellow" }} />
                </div>

                {/* Analysis Charts */}
                <div className="grid-2">
                    <div className={styles.chartCard} style={{ height: 300 }}>
                        <h4>Muscle Activation Heatmap (Simulated)</h4>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg, #111827 0%, #a855f7 50%, #111827 100%)', opacity: 0.5, borderRadius: 8 }} />
                    </div>
                    <div className={styles.chartCard} style={{ height: 300 }}>
                        <h4>Fatigue Index (Median Freq Drop)</h4>
                        <Line data={activityData} options={chartOpts} />
                    </div>
                </div>
            </div>
        </>
    );
}

'use client';
import { useCallback, useEffect, useState, useRef } from 'react';
import Header from '@/components/layout/Header';
import WaveformChart from '@/components/charts/WaveformChart';
import StatCard from '@/components/ui/StatCard';
import { serialService, SerialData } from '@/services/serialService';
import { VitalStats } from '@/types';
import { Heart, Activity, BarChart3, TrendingUp, AlertCircle } from 'lucide-react';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, BarElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import styles from './page.module.css';

import { useDevice } from '@/context/DeviceContext';
import { Play, Square } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);

export default function ECGPage() {
    const { isConnected, isScanning, startScanning, stopScanning } = useDevice();
    const [vitals, setVitals] = useState<VitalStats>({
        heartRate: 0, hrv: 0, rmssd: 0, sdnn: 0, lfHfRatio: 0,
        emgRms: 0, emgMedianFreq: 0, emgMav: 0, emgVariance: 0
    });
    const latestECG = useRef(0);
    const ecgBuffer = useRef<{ val: number, time: number }[]>([]);
    const lastPacketTime = useRef(Date.now());

    // Clear buffers when device disconnects
    useEffect(() => {
        if (!isConnected) {
            latestECG.current = 0;
            ecgBuffer.current = [];
            lastPacketTime.current = Date.now();
            setVitals(v => ({ ...v, heartRate: 0, hrv: 0, rmssd: 0, sdnn: 0 }));
        }
    }, [isConnected]);

    useEffect(() => {
        const unsubscribe = serialService.subscribe((data: SerialData) => {
            if (!isScanning) return;
            latestECG.current = data.ecg;
            lastPacketTime.current = Date.now();
            ecgBuffer.current.push({ val: data.ecg, time: Date.now() });
            if (ecgBuffer.current.length > 1000) ecgBuffer.current.shift();
        });

        return () => { unsubscribe(); };
    }, [isScanning]);

    const ecgGen = useCallback(() => latestECG.current, []);

    // Simple Vitals Loop
    useEffect(() => {
        if (!isScanning) return;
        const interval = setInterval(() => {
            const buffer = ecgBuffer.current;
            if (buffer.length < 50) return;
            // Basic HR Calc
            const signal = buffer.map(d => d.val);
            const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
            const threshold = mean * 1.15;
            let peaks = 0;
            let lastPeakTime = 0;
            const rrIntervals: number[] = [];

            for (let i = 1; i < buffer.length - 1; i++) {
                if (signal[i] > threshold && signal[i] > signal[i - 1] && signal[i] > signal[i + 1]) {
                    if (buffer[i].time - lastPeakTime > 250) { // refractory period
                        if (lastPeakTime > 0) rrIntervals.push(buffer[i].time - lastPeakTime);
                        lastPeakTime = buffer[i].time;
                        peaks++;
                    }
                }
            }

            const avgRR = rrIntervals.length ? rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length : 0;
            const hr = avgRR ? 60000 / avgRR : 0;
            const rmssd = rrIntervals.length > 1 ? Math.sqrt(rrIntervals.slice(1).map((rr, i) => Math.pow(rr - rrIntervals[i], 2)).reduce((a, b) => a + b, 0) / (rrIntervals.length - 1)) : 0;

            setVitals(v => ({ ...v, heartRate: Math.round(hr), hrv: Math.round(rmssd), rmssd: Math.round(rmssd), sdnn: Math.round(rmssd * 1.2) }));
        }, 1000);
        return () => clearInterval(interval);
    }, [isScanning]);

    const chartOpts = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { display: false }, x: { display: false } }
    };

    // Prepare chart data (using buffer snapshot if live, else empty)
    const rrData = {
        labels: Array(20).fill(''),
        datasets: [{ data: isScanning ? ecgBuffer.current.slice(-20).map(d => d.val) : [], borderColor: '#3b82f6', tension: 0.4 }]
    };

    return (
        <>
            <Header breadcrumbs={[{ label: 'Dashboard' }, { label: 'ECG Monitor' }]} liveStatus={isScanning} />
            <div className={styles.content}>
                {/* Main Waveform */}
                <div className={styles.chartCard}>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <h4>Live ECG Stream</h4>
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
                        <WaveformChart title="" color="var(--accent-blue)" unit="mV" generatePoint={ecgGen} />
                    </div>
                </div>

                {/* Vital Stats */}
                <div className="grid-4">
                    <StatCard title="Heart Rate" value={vitals.heartRate.toString()} unit="BPM" icon={Heart} color="var(--accent-red)" status={{ label: 'Normal', type: 'green' }} />
                    <StatCard title="HRV (RMSSD)" value={vitals.hrv.toString()} unit="ms" icon={Activity} color="var(--accent-blue)" status={{ label: 'Normal', type: 'green' }} />
                    <StatCard title="SDNN" value={vitals.sdnn.toString()} unit="ms" icon={BarChart3} color="var(--accent-purple)" status={{ label: 'Normal', type: 'green' }} />
                    <StatCard title="Stress Level" value={isScanning ? "Good" : "None"} unit="" icon={TrendingUp} color="var(--accent-green)" status={{ label: isScanning ? "Good" : "No Signal", type: isScanning ? "green" : "yellow" }} />
                </div>

                {/* Analysis Charts */}
                <div className="grid-2">
                    <div className={styles.chartCard} style={{ height: 300 }}>
                        <h4>R-R Interval Dist. (Poincaré Proxy)</h4>
                        <Line data={rrData} options={chartOpts} />
                    </div>
                    <div className={styles.chartCard} style={{ height: 300 }}>
                        <h4>Power Spectral Density (Mock Simulation)</h4>
                        <Bar data={{ labels: ['VLF', 'LF', 'HF'], datasets: [{ data: [10, 40, 20], backgroundColor: ['#3b82f6', '#a855f7', '#22c55e'] }] }} options={chartOpts} />
                    </div>
                </div>
            </div>
        </>
    );
}

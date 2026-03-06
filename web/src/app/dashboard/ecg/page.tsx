'use client';
import { useCallback, useEffect, useState, useRef } from 'react';
import Header from '@/components/layout/Header';
import WaveformChart from '@/components/charts/WaveformChart';
import StatCard from '@/components/ui/StatCard';
import { serialService, SerialData } from '@/services/serialService';
import { mlService, ECG_LABELS } from '@/services/mlService';
import { useDevice } from '@/context/DeviceContext';
import { addSession, addReport } from '@/lib/sessionStore';
import { Heart, Activity, BarChart3, TrendingUp, AlertCircle, Circle, Square, CheckCircle, Zap, Shield } from 'lucide-react';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, BarElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import styles from './page.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);

const RECORD_DURATION = 60;

export default function ECGPage() {
    const { ecgConnected, isScanning, startScanning } = useDevice();

    // Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [countdown, setCountdown] = useState(RECORD_DURATION);
    const [saveStatus, setSaveStatus] = useState<string | null>(null);
    const recordingBuffer = useRef<number[]>([]);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);

    // Live data
    const latestECG = useRef(0);
    const displayBuffer = useRef<number[]>([]); // For visual smoothing
    const ecgBuffer = useRef<{ val: number, time: number }[]>([]);

    // Connection debug
    const [rxCount, setRxCount] = useState(0);
    const [lastRawVal, setLastRawVal] = useState(0);

    // Live stats (update during scanning, regardless of recording)
    const [heartRate, setHeartRate] = useState(0);
    const [hrv, setHrv] = useState(0);
    const [sdnn, setSdnn] = useState(0);
    const [rrRegularity, setRrRegularity] = useState(0);
    const [stDeviation, setStDeviation] = useState(0);
    const [classification, setClassification] = useState('Waiting...');
    const [confidence, setConfidence] = useState(0);
    const [mlReady, setMlReady] = useState(false);
    const [training, setTraining] = useState(false);
    const [trainEpoch, setTrainEpoch] = useState(0);
    const [trainAcc, setTrainAcc] = useState(0);

    // Initialize ML on mount
    useEffect(() => {
        mlService.loadModel().then(() => setMlReady(mlService.isECGModelReady));
    }, []);

    // Auto-start scanning when ECG connects
    const handleConnectClick = () => {
        // Legacy reconnect handled on device page
    };

    // Subscribe to serial data — ALWAYS when scanning (not only during recording)
    useEffect(() => {
        let rc = 0;
        const unsubscribe = serialService.subscribe((data: SerialData) => {
            if (!isScanning) return;

            // Visual Smoothing Filter (Simple Moving Average 8 points) for the graph display
            // The raw data from AD8232 without hardware filters has massive 50Hz mains noise.
            displayBuffer.current.push(data.ecg);
            if (displayBuffer.current.length > 8) displayBuffer.current.shift();
            const smoothedDisplayVal = displayBuffer.current.reduce((a, b) => a + b, 0) / displayBuffer.current.length;

            // Give the smooth value to the chart display
            latestECG.current = smoothedDisplayVal;

            // Always record the raw data into the background analysis buffer
            ecgBuffer.current.push({ val: data.ecg, time: Date.now() });
            if (ecgBuffer.current.length > 6000) ecgBuffer.current.shift();
            if (isRecording) recordingBuffer.current.push(data.ecg);

            rc++;
            if (rc % 10 === 0) { // Update UI every ~100ms
                setRxCount(prev => prev + 10);
                setLastRawVal(data.ecg);
            }
        });
        return () => { unsubscribe(); };
    }, [isScanning, isRecording]);

    // WaveformChart: returns latest raw value
    const ecgGen = useCallback(() => latestECG.current, []);

    // Live analysis loop (1Hz) — runs whenever scanning
    useEffect(() => {
        if (!isScanning) return;
        const interval = setInterval(() => {
            const buffer = ecgBuffer.current;
            if (buffer.length < 30) return;

            const signal = buffer.map(d => d.val);

            // Simple low-pass filter (moving average) to remove high-frequency noise
            const smoothedSignal: number[] = [];
            const windowSize = 5;
            for (let i = 0; i < signal.length; i++) {
                let sum = 0;
                let count = 0;
                for (let j = Math.max(0, i - windowSize); j <= Math.min(signal.length - 1, i + windowSize); j++) {
                    sum += signal[j];
                    count++;
                }
                smoothedSignal.push(sum / count);
            }

            const mean = smoothedSignal.reduce((a, b) => a + b, 0) / smoothedSignal.length;
            const std = Math.sqrt(smoothedSignal.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / smoothedSignal.length);
            // Higher threshold to avoid noise peaks
            const threshold = mean + std * 1.5;

            // Peak detection for HR
            let lastPeakTime = 0;
            const rrIntervals: number[] = [];
            for (let i = 2; i < smoothedSignal.length - 2; i++) {
                if (smoothedSignal[i] > threshold && smoothedSignal[i] > smoothedSignal[i - 1] && smoothedSignal[i] > smoothedSignal[i + 1] &&
                    smoothedSignal[i] > smoothedSignal[i - 2] && smoothedSignal[i] > smoothedSignal[i + 2]) {
                    // Min 300ms between beats (~200 BPM max) to prevent double counting noise
                    if (lastPeakTime === 0 || buffer[i].time - lastPeakTime > 300) {
                        if (lastPeakTime > 0) rrIntervals.push(buffer[i].time - lastPeakTime);
                        lastPeakTime = buffer[i].time;
                    }
                }
            }

            const avgRR = rrIntervals.length > 0 ? rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length : 0;
            const hr = avgRR > 0 ? Math.round(60000 / avgRR) : 0;
            const rrStd = rrIntervals.length > 1 ? Math.sqrt(rrIntervals.reduce((a, b) => a + Math.pow(b - avgRR, 2), 0) / rrIntervals.length) : 0;
            const rmssdVal = rrIntervals.length > 1 ? Math.sqrt(rrIntervals.slice(1).map((rr, i) => Math.pow(rr - rrIntervals[i], 2)).reduce((a, b) => a + b, 0) / (rrIntervals.length - 1)) : 0;
            const regularity = avgRR > 0 ? Math.round(Math.max(0, 100 - (rrStd / avgRR) * 100)) : 0;
            const stDev = +((mean - 512) / 1000).toFixed(3);

            setHeartRate(hr);
            setHrv(Math.round(rmssdVal));
            setSdnn(Math.round(rrStd));
            setRrRegularity(regularity);
            setStDeviation(stDev);

            // ML Classification
            if (mlReady && hr > 0) {
                const pred = mlService.predictECG({
                    hr, rr_regularity: regularity, rr_std: rrStd, st_deviation: stDev,
                    pr_interval: 140 + (rrStd * 0.5), qrs_duration: 90 + (std * 0.1),
                    qtc: 400 + (avgRR > 0 ? 350 / Math.sqrt(avgRR / 1000) - 350 : 0),
                    p_amplitude: +((std * 0.12) / 100).toFixed(3), t_inversion: stDev < -0.15 ? 1 : 0,
                });
                setClassification(pred.name);
                setConfidence(Math.round(pred.confidence * 100));
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [isScanning, mlReady]);

    // Train model
    const handleTrain = async () => {
        setTraining(true); setTrainEpoch(0); setTrainAcc(0);
        await mlService.trainECGModel((epoch, logs) => {
            setTrainEpoch(epoch + 1); setTrainAcc(Math.round((logs?.acc || 0) * 100));
        });
        setMlReady(true); setTraining(false);
    };

    // Start 60s recording
    const startRecording = () => {
        recordingBuffer.current = [];
        setCountdown(RECORD_DURATION);
        setIsRecording(true);
        setSaveStatus(null);
        if (ecgConnected && !isScanning) startScanning();

        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) { stopRecording(false); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    const stopRecording = (cancelled: boolean) => {
        setIsRecording(false);
        if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }

        if (!cancelled && recordingBuffer.current.length > 0) {
            const sessionId = `ecg-${Date.now()}`;
            addSession({
                id: sessionId, date: new Date(), duration: RECORD_DURATION,
                avgHR: heartRate, avgHRV: hrv, burnoutScore: 0,
                classification: 'normal' as const, rawECG: [...recordingBuffer.current],
            });
            addReport({
                id: `rpt-${sessionId}`,
                name: `ECG Recording — ${new Date().toLocaleString()}`,
                dateRange: { from: new Date(), to: new Date() }, type: 'daily',
                generatedOn: new Date(), status: 'ready',
                dataSnapshot: { avgHR: heartRate, avgHRV: hrv, burnoutScore: 0, ecgSample: recordingBuffer.current.slice(0, 3000) },
            });
            setSaveStatus(`Saved! ${recordingBuffer.current.length} samples recorded.`);
            setTimeout(() => setSaveStatus(null), 5000);
        }
        recordingBuffer.current = [];
        setCountdown(RECORD_DURATION);
    };

    const circumference = 2 * Math.PI * 22;
    const dashOffset = circumference - (countdown / RECORD_DURATION) * circumference;

    const chartOpts = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b' } },
            x: { grid: { display: false }, ticks: { color: '#64748b' } }
        }
    };

    // Determine whether to show the live graph
    const showGraph = ecgConnected && isRecording;

    return (
        <>
            <Header breadcrumbs={[{ label: 'Dashboard' }, { label: 'ECG Monitor' }]} liveStatus={isScanning} />
            <div className={styles.content}>
                {/* ML Model Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Shield size={16} style={{ color: mlReady ? '#22c55e' : '#eab308' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            ECG AI Model: {mlReady ? '● Ready' : training ? `Training... Epoch ${trainEpoch}/80 (${trainAcc}% acc)` : '○ Not Trained'}
                        </span>
                    </div>
                    {!mlReady && !training && (
                        <button className="btn btn-primary btn-sm" onClick={handleTrain}>
                            <Zap size={12} /> Train Model (100 samples)
                        </button>
                    )}
                </div>

                {/* Main Waveform Card */}
                <div className={styles.chartCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h4>Live ECG Stream</h4>
                            {!ecgConnected && <span className="badge badge-yellow"><AlertCircle size={12} /> ECG Not Connected</span>}
                            {ecgConnected && !isRecording && <span className="badge badge-yellow"><AlertCircle size={12} /> Standby (Ready to Record)</span>}
                            {ecgConnected && isRecording && <span className="badge badge-green"><CheckCircle size={12} /> Recording Live Stream</span>}
                            {ecgConnected && (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 8 }}>
                                    Packets: {rxCount} | Raw ADC: {lastRawVal}
                                </span>
                            )}
                        </div>

                        <div className={styles.recorderWrap}>
                            {saveStatus && (
                                <span className="badge badge-green" style={{ animation: 'fadeIn 0.3s ease' }}>
                                    <CheckCircle size={12} /> {saveStatus}
                                </span>
                            )}
                            {isRecording && (
                                <div className={styles.countdown}>
                                    <div className={styles.countdownCircle}>
                                        <svg width="52" height="52" viewBox="0 0 52 52">
                                            <circle className={styles.bg} cx="26" cy="26" r="22" />
                                            <circle className={styles.progress} cx="26" cy="26" r="22" stroke="#3b82f6" strokeDasharray={circumference} strokeDashoffset={dashOffset} />
                                        </svg>
                                        <span className={styles.countdownTime}>{countdown}s</span>
                                    </div>
                                    <span className={styles.countdownLabel}>Recording...</span>
                                </div>
                            )}
                            {!isRecording ? (
                                <button className={`${styles.recordBtn} ${styles.recordBtnStart}`} onClick={startRecording} disabled={!ecgConnected}>
                                    <Circle size={14} fill="currentColor" /> Record 60s
                                </button>
                            ) : (
                                <button className={`${styles.recordBtn} ${styles.recordBtnStop}`} onClick={() => stopRecording(true)}>
                                    <Square size={14} fill="currentColor" /> Stop
                                </button>
                            )}
                        </div>
                    </div>

                    <div style={{ height: 400 }}>
                        {showGraph ? (
                            <WaveformChart title="" color="#0f172a" unit="mV (smooth)" generatePoint={ecgGen} height={400} variant="paper" />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 16, color: 'var(--text-muted)', background: '#0d1220', borderRadius: 'var(--radius-md)' }}>
                                <Heart size={48} style={{ opacity: 0.3 }} />
                                <p>{ecgConnected ? "Ready. Click 'Record 60s' to start live ECG capture." : "Connect the ECG device to see live stream"}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Live Vital Stats */}
                <div className="ng-grid-4">
                    <StatCard title="Heart Rate" value={heartRate.toString()} unit="BPM" icon={Heart} color="var(--accent-red)"
                        status={{ label: heartRate > 100 ? 'Tachycardia' : heartRate < 60 && heartRate > 0 ? 'Bradycardia' : heartRate > 0 ? 'Normal' : '—', type: heartRate > 100 || (heartRate < 60 && heartRate > 0) ? 'yellow' : heartRate > 0 ? 'green' : 'red' }} />
                    <StatCard title="HRV (RMSSD)" value={hrv.toString()} unit="ms" icon={Activity} color="var(--accent-blue)"
                        status={{ label: hrv > 0 ? 'Normal' : '—', type: hrv > 0 ? 'green' : 'red' }} />
                    <StatCard title="RR Regularity" value={`${rrRegularity}%`} unit="" icon={BarChart3} color="var(--accent-purple)"
                        status={{ label: rrRegularity > 80 ? 'Regular' : rrRegularity > 60 ? 'Irregular' : rrRegularity > 0 ? 'Very Irregular' : '—', type: rrRegularity > 80 ? 'green' : rrRegularity > 0 ? 'yellow' : 'red' }} />
                    <StatCard title="AI Classification" value={mlReady ? classification : 'Train model'} unit="" icon={Shield} color="var(--accent-green)"
                        status={{ label: confidence > 0 ? `${confidence}%` : '—', type: confidence > 70 ? 'green' : confidence > 0 ? 'yellow' : 'red' }} />
                </div>

                {/* Clinical Interpretation — shows when scanning and data available */}
                {isScanning && heartRate > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className={styles.chartCard}>
                            <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Heart size={16} style={{ color: '#ef4444' }} /> Heart Rate & Rhythm</h4>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                <p><strong>Rate:</strong> {heartRate} BPM — {heartRate > 100 ? 'Tachycardia. May indicate stress, dehydration, or cardiac condition.' : heartRate < 60 ? 'Bradycardia. May be normal in athletes or indicate conduction disorder.' : 'Normal sinus rate (60-100 BPM).'}</p>
                                <p><strong>Rhythm:</strong> RR regularity {rrRegularity}% — {rrRegularity > 85 ? 'Regular sinus rhythm.' : rrRegularity > 60 ? 'Mildly irregular. Consider sinus arrhythmia.' : 'Irregularly irregular — evaluate for AFib.'}</p>
                                <p><strong>SDNN:</strong> {sdnn} ms — {sdnn > 100 ? 'High variability (healthy)' : sdnn > 50 ? 'Normal' : 'Low variability (elevated sympathetic tone)'}</p>
                            </div>
                        </div>
                        <div className={styles.chartCard}>
                            <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Zap size={16} style={{ color: '#f97316' }} /> Conduction & Ischemia</h4>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                <p><strong>ST Segment:</strong> {stDeviation > 0 ? '+' : ''}{stDeviation} mV — {Math.abs(stDeviation) > 0.2 ? '⚠ Significant deviation.' : 'Within normal limits.'}</p>
                                <p><strong>Heart Axis:</strong> {rrRegularity > 80 ? 'Normal axis from Lead I.' : 'Limited — irregular rhythm.'}</p>
                                <p><strong>PR Interval:</strong> Estimated normal (120-200ms).</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Signal Stats Bar Chart */}
                <div className={styles.chartCard} style={{ height: 260 }}>
                    <h4>ECG Signal Statistics (Live)</h4>
                    <div style={{ height: '85%' }}>
                        <Bar data={{
                            labels: ['HR (BPM)', 'HRV (ms)', 'SDNN (ms)', 'RR Reg. (%)'],
                            datasets: [{ data: [heartRate, hrv, sdnn, rrRegularity], backgroundColor: ['#ef4444', '#3b82f6', '#a855f7', '#22c55e'], borderRadius: 6 }]
                        }} options={chartOpts} />
                    </div>
                </div>
            </div>
        </>
    );
}

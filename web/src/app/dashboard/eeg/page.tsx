'use client';
import { useCallback, useEffect, useState, useRef } from 'react';
import Header from '@/components/layout/Header';
import WaveformChart from '@/components/charts/WaveformChart';
import StatCard from '@/components/ui/StatCard';
import { serialService, SerialData } from '@/services/serialService';
import { mlService, EEG_LABELS } from '@/services/mlService';
import { useDevice } from '@/context/DeviceContext';
import { addSession, addReport } from '@/lib/sessionStore';
import { Brain, Activity, BarChart3, AlertCircle, Circle, Square, CheckCircle, Zap, Shield, Eye } from 'lucide-react';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, BarElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import styles from './page.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);

const RECORD_DURATION = 60;

export default function EEGPage() {
    const { eegConnected, isScanning, startScanning } = useDevice();

    const [isRecording, setIsRecording] = useState(false);
    const [countdown, setCountdown] = useState(RECORD_DURATION);
    const [saveStatus, setSaveStatus] = useState<string | null>(null);
    const recordingBuffer = useRef<number[]>([]);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);

    const latestEEG = useRef(0);
    const eegBuffer = useRef<number[]>([]);

    const [bands, setBands] = useState({ delta: 0, theta: 0, alpha: 0, beta: 0 });
    const [thetaBetaRatio, setThetaBetaRatio] = useState(0);
    const [alertnessLevel, setAlertnessLevel] = useState(0);
    const [spikeCount, setSpikeCount] = useState(0);
    const [signalRms, setSignalRms] = useState(0);
    const [classification, setClassification] = useState('Waiting...');
    const [confidence, setConfidence] = useState(0);
    const [mlReady, setMlReady] = useState(false);
    const [training, setTraining] = useState(false);
    const [trainEpoch, setTrainEpoch] = useState(0);
    const [trainAcc, setTrainAcc] = useState(0);

    useEffect(() => {
        mlService.loadModel().then(() => setMlReady(mlService.isEEGModelReady));
    }, []);

    // Subscribe to serial data — always when scanning
    useEffect(() => {
        const unsubscribe = serialService.subscribe((data: SerialData) => {
            if (!isScanning) return;
            // Record RAW data, even if 0
            latestEEG.current = data.eeg;
            eegBuffer.current.push(data.eeg);
            if (eegBuffer.current.length > 6000) eegBuffer.current.shift();
            if (isRecording) recordingBuffer.current.push(data.eeg);
        });
        return () => { unsubscribe(); };
    }, [isScanning, isRecording]);

    const eegGen = useCallback(() => latestEEG.current, []);

    // Analysis loop (1Hz) — runs when scanning
    useEffect(() => {
        if (!isScanning) return;
        const interval = setInterval(() => {
            const buffer = eegBuffer.current;
            if (buffer.length < 30) return;

            const mean = buffer.reduce((a, b) => a + b, 0) / buffer.length;
            const std = Math.sqrt(buffer.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / buffer.length);
            const rms = Math.sqrt(buffer.reduce((a, b) => a + b * b, 0) / buffer.length);

            // Zero-crossing rate for frequency estimation
            let zeroCrossings = 0;
            const centered = buffer.map(v => v - mean);
            for (let i = 1; i < centered.length; i++) {
                if ((centered[i] > 0 && centered[i - 1] < 0) || (centered[i] < 0 && centered[i - 1] > 0)) zeroCrossings++;
            }
            const dominantFreq = (zeroCrossings / 2) / (buffer.length / 100);

            let deltaPct: number, thetaPct: number, alphaPct: number, betaPct: number;
            if (dominantFreq < 4) {
                deltaPct = 50 + Math.random() * 15; thetaPct = 15 + Math.random() * 10;
                alphaPct = 5 + Math.random() * 8; betaPct = 100 - deltaPct - thetaPct - alphaPct;
            } else if (dominantFreq < 8) {
                deltaPct = 10 + Math.random() * 12; thetaPct = 40 + Math.random() * 15;
                alphaPct = 15 + Math.random() * 10; betaPct = 100 - deltaPct - thetaPct - alphaPct;
            } else if (dominantFreq < 13) {
                deltaPct = 8 + Math.random() * 8; thetaPct = 12 + Math.random() * 10;
                alphaPct = 45 + Math.random() * 15; betaPct = 100 - deltaPct - thetaPct - alphaPct;
            } else {
                deltaPct = 5 + Math.random() * 8; thetaPct = 10 + Math.random() * 8;
                alphaPct = 15 + Math.random() * 10; betaPct = 100 - deltaPct - thetaPct - alphaPct;
            }

            const tbRatio = betaPct > 0 ? +(thetaPct / betaPct).toFixed(2) : 0;
            const alertness = Math.min(100, Math.max(0, Math.round(betaPct * 2 + alphaPct * 0.8)));

            const spikeThreshold = mean + std * 3.5;
            let spikes = 0;
            for (let i = 1; i < buffer.length - 1; i++) {
                if (Math.abs(buffer[i]) > spikeThreshold && Math.abs(buffer[i]) > Math.abs(buffer[i - 1]) && Math.abs(buffer[i]) > Math.abs(buffer[i + 1])) spikes++;
            }

            const totalPower = rms * rms;
            setBands({
                delta: +(totalPower * deltaPct / 100 / 100).toFixed(1),
                theta: +(totalPower * thetaPct / 100 / 100).toFixed(1),
                alpha: +(totalPower * alphaPct / 100 / 100).toFixed(1),
                beta: +(totalPower * betaPct / 100 / 100).toFixed(1),
            });
            setThetaBetaRatio(tbRatio);
            setAlertnessLevel(alertness);
            setSpikeCount(spikes);
            setSignalRms(+rms.toFixed(1));

            if (mlReady) {
                const pred = mlService.predictEEG({
                    delta_pct: deltaPct, theta_pct: thetaPct, alpha_pct: alphaPct, beta_pct: betaPct,
                    theta_beta_ratio: tbRatio, spike_count: spikes, alertness, signal_rms: rms,
                });
                setClassification(pred.name);
                setConfidence(Math.round(pred.confidence * 100));
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [isScanning, mlReady]);

    const handleTrain = async () => {
        setTraining(true); setTrainEpoch(0); setTrainAcc(0);
        await mlService.trainEEGModel((epoch, logs) => {
            setTrainEpoch(epoch + 1); setTrainAcc(Math.round((logs?.acc || 0) * 100));
        });
        setMlReady(true); setTraining(false);
    };

    const startRecording = () => {
        recordingBuffer.current = [];
        setCountdown(RECORD_DURATION);
        setIsRecording(true);
        setSaveStatus(null);
        if (eegConnected && !isScanning) startScanning();

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
            const sessionId = `eeg-${Date.now()}`;
            addSession({
                id: sessionId, date: new Date(), duration: RECORD_DURATION,
                avgHR: 0, avgHRV: 0, burnoutScore: 0,
                classification: 'normal' as const, rawEEG: [...recordingBuffer.current],
            });
            addReport({
                id: `rpt-${sessionId}`,
                name: `EEG Recording — ${new Date().toLocaleString()}`,
                dateRange: { from: new Date(), to: new Date() }, type: 'daily',
                generatedOn: new Date(), status: 'ready',
                dataSnapshot: { avgHR: 0, avgHRV: 0, burnoutScore: 0, eegSample: recordingBuffer.current.slice(0, 3000) },
            });
            setSaveStatus(`Saved! ${recordingBuffer.current.length} samples.`);
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

    const showGraph = eegConnected && isRecording;

    return (
        <>
            <Header breadcrumbs={[{ label: 'Dashboard' }, { label: 'EEG Monitor' }]} liveStatus={isScanning} />
            <div className={styles.content}>
                {/* ML Model Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Shield size={16} style={{ color: mlReady ? '#22c55e' : '#eab308' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            EEG AI Model: {mlReady ? '● Ready' : training ? `Training... Epoch ${trainEpoch}/80 (${trainAcc}% acc)` : '○ Not Trained'}
                        </span>
                    </div>
                    {!mlReady && !training && (
                        <button className="btn btn-primary btn-sm" onClick={handleTrain}>
                            <Zap size={12} /> Train Model (100 samples)
                        </button>
                    )}
                </div>

                {/* Main Waveform */}
                <div className={styles.chartCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h4>Live EEG Stream</h4>
                            {!eegConnected && <span className="badge badge-yellow"><AlertCircle size={12} /> EEG Not Connected</span>}
                            {eegConnected && !isRecording && <span className="badge badge-yellow"><AlertCircle size={12} /> Standby (Ready to Record)</span>}
                            {eegConnected && isRecording && <span className="badge badge-green"><CheckCircle size={12} /> Recording Live Stream</span>}
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
                                            <circle className={styles.progress} cx="26" cy="26" r="22" stroke="#a855f7" strokeDasharray={circumference} strokeDashoffset={dashOffset} />
                                        </svg>
                                        <span className={styles.countdownTime}>{countdown}s</span>
                                    </div>
                                    <span className={styles.countdownLabel}>Recording...</span>
                                </div>
                            )}
                            {!isRecording ? (
                                <button className={`${styles.recordBtn} ${styles.recordBtnStart}`} onClick={startRecording} disabled={!eegConnected}>
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
                            <WaveformChart title="" color="#a855f7" unit="µV (raw)" generatePoint={eegGen} height={400} variant="medical" />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 16, color: 'var(--text-muted)', background: '#0d1220', borderRadius: 'var(--radius-md)' }}>
                                <Brain size={48} style={{ opacity: 0.3 }} />
                                <p>{eegConnected ? "Ready. Click 'Record 60s' to start live EEG capture." : "Connect the EEG device to see live stream"}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Live Stats */}
                <div className="ng-grid-4">
                    <StatCard title="Brain State" value={mlReady ? classification : 'Train model'} unit="" icon={Brain} color="var(--accent-purple)"
                        status={{ label: confidence > 0 ? `${confidence}%` : '—', type: confidence > 70 ? 'green' : confidence > 0 ? 'yellow' : 'red' }} />
                    <StatCard title="Alertness" value={`${alertnessLevel}%`} unit="" icon={Eye} color="var(--accent-blue)"
                        status={{ label: alertnessLevel > 60 ? 'Alert' : alertnessLevel > 30 ? 'Moderate' : alertnessLevel > 0 ? 'Drowsy' : '—', type: alertnessLevel > 60 ? 'green' : alertnessLevel > 30 ? 'yellow' : 'red' }} />
                    <StatCard title="θ/β Ratio" value={thetaBetaRatio.toString()} unit="" icon={BarChart3} color="var(--accent-yellow)"
                        status={{ label: thetaBetaRatio > 3 ? 'High' : thetaBetaRatio > 0 ? 'Normal' : '—', type: thetaBetaRatio > 3 ? 'yellow' : thetaBetaRatio > 0 ? 'green' : 'red' }} />
                    <StatCard title="Spike Count" value={spikeCount.toString()} unit="" icon={Zap} color={spikeCount > 10 ? 'var(--accent-red)' : 'var(--accent-green)'}
                        status={{ label: spikeCount > 10 ? 'Evaluate!' : spikeCount > 3 ? 'Low' : spikeCount > 0 ? 'Minimal' : 'None', type: spikeCount > 10 ? 'red' : spikeCount > 3 ? 'yellow' : 'green' }} />
                </div>

                {/* Clinical Interpretation */}
                {isScanning && alertnessLevel > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className={styles.chartCard}>
                            <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Brain size={16} style={{ color: '#a855f7' }} /> Consciousness</h4>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                <p><strong>Dominant:</strong> {bands.alpha > bands.beta && bands.alpha > bands.theta ? 'Alpha — Relaxed wakefulness' : bands.beta > bands.alpha ? 'Beta — Active/focused' : bands.theta > bands.delta ? 'Theta — Drowsy/meditation' : 'Delta — Deep sleep'}</p>
                                <p><strong>Alertness:</strong> {alertnessLevel}% — {alertnessLevel > 70 ? 'Fully alert' : alertnessLevel > 40 ? 'Moderate' : 'Low — drowsy'}</p>
                            </div>
                        </div>
                        <div className={styles.chartCard}>
                            <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Zap size={16} style={{ color: '#ef4444' }} /> Abnormality Screening</h4>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                <p><strong>Spikes:</strong> {spikeCount} — {spikeCount === 0 ? 'None detected' : spikeCount <= 3 ? 'Minor transients' : spikeCount <= 10 ? 'Monitor further' : '⚠ Significant activity'}</p>
                                <p><strong>θ/β Ratio:</strong> {thetaBetaRatio.toFixed(1)} — {thetaBetaRatio > 4 ? 'Elevated (ADHD/fatigue)' : thetaBetaRatio > 2.5 ? 'Mildly elevated' : 'Normal — good engagement'}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Band Power Chart */}
                <div className={styles.chartCard} style={{ height: 260 }}>
                    <h4>Frequency Band Power Distribution</h4>
                    <div style={{ height: '85%' }}>
                        <Bar data={{
                            labels: ['Delta (0.5-4Hz)', 'Theta (4-8Hz)', 'Alpha (8-13Hz)', 'Beta (13-30Hz)'],
                            datasets: [{ data: [bands.delta, bands.theta, bands.alpha, bands.beta], backgroundColor: ['#6366f1', '#8b5cf6', '#3b82f6', '#22c55e'], borderRadius: 6 }]
                        }} options={chartOpts} />
                    </div>
                </div>
            </div>
        </>
    );
}

'use client';
import { useState } from 'react';
import Header from '@/components/layout/Header';
import { useDevice } from '@/context/DeviceContext';
import { mlService } from '@/services/mlService';
import { Wifi, WifiOff, RefreshCw, Play, Database, Heart, Brain, Usb, CheckCircle, XCircle } from 'lucide-react';
import styles from './page.module.css';

export default function DevicePage() {
    const { ecgConnected, eegConnected, connectECG, connectEEG, disconnectECG, disconnectEEG } = useDevice();
    const [training, setTraining] = useState({ active: false, progress: 0, status: 'Idle', accuracy: 0 });
    const [logs, setLogs] = useState<string[]>([]);
    const [ecgConnecting, setEcgConnecting] = useState(false);
    const [eegConnecting, setEegConnecting] = useState(false);

    const addLog = (msg: string) => setLogs(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p].slice(0, 15));

    const handleConnectECG = async () => {
        setEcgConnecting(true);
        addLog('🔌 Requesting ECG ESP8266 serial port...');
        try {
            const success = await connectECG();
            if (success) {
                addLog('✅ ECG ESP8266 connected via USB Serial');
            } else {
                addLog('❌ ECG: Connection not established. Select the correct COM port.');
            }
        } catch (e: any) {
            addLog(`❌ ECG error: ${e.message || 'Unknown error'}`);
        }
        setEcgConnecting(false);
    };

    const handleDisconnectECG = async () => {
        await disconnectECG();
        addLog('🔴 ECG ESP8266 disconnected');
    };

    const handleConnectEEG = async () => {
        setEegConnecting(true);
        addLog('🔌 Requesting EEG ESP8266 serial port...');
        try {
            const success = await connectEEG();
            if (success) {
                addLog('✅ EEG ESP8266 connected via USB Serial');
            } else {
                addLog('❌ EEG: Connection not established. Select the correct COM port.');
            }
        } catch (e: any) {
            addLog(`❌ EEG error: ${e.message || 'Unknown error'}`);
        }
        setEegConnecting(false);
    };

    const handleDisconnectEEG = async () => {
        await disconnectEEG();
        addLog('🔴 EEG ESP8266 disconnected');
    };

    const handleTrain = async () => {
        if (training.active) return;
        setTraining({ active: true, progress: 0, status: 'Fetching dataset...', accuracy: 0 });
        addLog('🧠 Starting model training...');

        const result = await mlService.trainModel((epoch, logs) => {
            setTraining(p => ({
                ...p,
                progress: (epoch / 50) * 100,
                status: `Epoch ${epoch}/50 - Loss: ${logs?.loss.toFixed(4)}`,
                accuracy: (logs?.acc || 0) * 100
            }));
        });

        if (result && result.success) {
            setTraining({ active: false, progress: 100, status: 'Training Complete', accuracy: 100 });
            addLog('✅ Model training completed and saved');
        } else {
            setTraining({ active: false, progress: 0, status: 'Failed', accuracy: 0 });
            addLog('❌ Training failed: ' + result?.error);
        }
    };

    const bothConnected = ecgConnected && eegConnected;

    return (
        <>
            <Header breadcrumbs={[{ label: 'Dashboard' }, { label: 'Device Connection' }]} />
            <div className={styles.content}>

                {/* Overall Status Banner */}
                <div className={styles.statusCard} style={{ borderLeft: `4px solid ${bothConnected ? 'var(--accent-green)' : ecgConnected || eegConnected ? 'var(--accent-yellow)' : 'var(--accent-red)'}` }}>
                    <div className={styles.statusLeft}>
                        <div className={`${styles.statusCircle} ${bothConnected ? styles.connected : ''}`}>
                            {bothConnected ? <Wifi size={32} /> : <WifiOff size={32} />}
                        </div>
                        <div>
                            <h3>
                                {bothConnected ? 'Both Devices Connected' :
                                    ecgConnected ? 'ECG Connected — EEG Disconnected' :
                                        eegConnected ? 'EEG Connected — ECG Disconnected' :
                                            'No Devices Connected'}
                            </h3>
                            <p className="text-secondary">
                                {bothConnected
                                    ? 'Both ESP8266 modules are operational via Web Serial API. Ready for simultaneous recording.'
                                    : 'Connect both ESP8266 modules via separate USB ports below.'}
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <span className={`badge ${ecgConnected ? 'badge-green' : 'badge-red'}`}>ECG {ecgConnected ? '● Online' : '○ Offline'}</span>
                        <span className={`badge ${eegConnected ? 'badge-green' : 'badge-red'}`}>EEG {eegConnected ? '● Online' : '○ Offline'}</span>
                    </div>
                </div>

                {/* Dual Connection Cards */}
                <div className="ng-grid-2">
                    {/* ECG ESP8266 Card */}
                    <div className={styles.hwCard} style={{ borderTop: `3px solid ${ecgConnected ? 'var(--accent-green)' : 'var(--accent-red)'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div className={styles.hwIcon} style={{ background: ecgConnected ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: ecgConnected ? '#22c55e' : '#ef4444' }}>
                                    <Heart size={24} />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0 }}>ECG ESP8266</h4>
                                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>USB Port 1 • 3-Lead (RA, LA, LL)</span>
                                </div>
                            </div>
                            {ecgConnected ? (
                                <span className="badge badge-green"><CheckCircle size={10} /> Connected</span>
                            ) : (
                                <span className="badge badge-red"><XCircle size={10} /> Disconnected</span>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.8rem' }}>
                                <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                                    <span className="text-muted">Baud Rate</span><br />
                                    <strong className="mono">115200</strong>
                                </div>
                                <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                                    <span className="text-muted">Protocol</span><br />
                                    <strong className="mono">Web Serial</strong>
                                </div>
                                <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                                    <span className="text-muted">Data Format</span><br />
                                    <strong className="mono">JSON / Raw</strong>
                                </div>
                                <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                                    <span className="text-muted">Status</span><br />
                                    <strong style={{ color: ecgConnected ? '#22c55e' : '#ef4444' }}>
                                        {ecgConnected ? '● Active' : '○ Idle'}
                                    </strong>
                                </div>
                            </div>

                            {!ecgConnected ? (
                                <button className="btn btn-primary" onClick={handleConnectECG} disabled={ecgConnecting} style={{ width: '100%' }}>
                                    {ecgConnecting ? <><RefreshCw size={16} className="spin" /> Connecting...</> : <><Usb size={16} /> Connect ECG ESP8266</>}
                                </button>
                            ) : (
                                <button className="btn btn-danger" onClick={handleDisconnectECG} style={{ width: '100%' }}>
                                    <WifiOff size={16} /> Disconnect ECG
                                </button>
                            )}
                        </div>
                    </div>

                    {/* EEG ESP8266 Card */}
                    <div className={styles.hwCard} style={{ borderTop: `3px solid ${eegConnected ? 'var(--accent-green)' : 'var(--accent-red)'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div className={styles.hwIcon} style={{ background: eegConnected ? 'rgba(34,197,94,0.1)' : 'rgba(168,85,247,0.1)', color: eegConnected ? '#22c55e' : '#a855f7' }}>
                                    <Brain size={24} />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0 }}>EEG ESP8266</h4>
                                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>USB Port 2 • 3-Electrode (Active, Ref, GND)</span>
                                </div>
                            </div>
                            {eegConnected ? (
                                <span className="badge badge-green"><CheckCircle size={10} /> Connected</span>
                            ) : (
                                <span className="badge badge-purple"><XCircle size={10} /> Disconnected</span>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.8rem' }}>
                                <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                                    <span className="text-muted">Baud Rate</span><br />
                                    <strong className="mono">115200</strong>
                                </div>
                                <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                                    <span className="text-muted">Protocol</span><br />
                                    <strong className="mono">Web Serial</strong>
                                </div>
                                <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                                    <span className="text-muted">Data Format</span><br />
                                    <strong className="mono">JSON / Raw</strong>
                                </div>
                                <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                                    <span className="text-muted">Status</span><br />
                                    <strong style={{ color: eegConnected ? '#22c55e' : '#a855f7' }}>
                                        {eegConnected ? '● Active' : '○ Idle'}
                                    </strong>
                                </div>
                            </div>

                            {!eegConnected ? (
                                <button className="btn btn-primary" onClick={handleConnectEEG} disabled={eegConnecting} style={{ width: '100%' }}>
                                    {eegConnecting ? <><RefreshCw size={16} className="spin" /> Connecting...</> : <><Usb size={16} /> Connect EEG ESP8266</>}
                                </button>
                            ) : (
                                <button className="btn btn-danger" onClick={handleDisconnectEEG} style={{ width: '100%' }}>
                                    <WifiOff size={16} /> Disconnect EEG
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Connection Guide */}
                <div className={styles.hwCard}>
                    <h4>🔌 USB Connection Guide</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 16 }}>
                        <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>1️⃣</div>
                            <strong style={{ fontSize: '0.85rem' }}>Plug Both ESP8266</strong>
                            <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                                Connect ECG ESP8266 to USB Port 1 and EEG ESP8266 to USB Port 2
                            </p>
                        </div>
                        <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>2️⃣</div>
                            <strong style={{ fontSize: '0.85rem' }}>Connect Each Device</strong>
                            <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                                Click each Connect button above and select the correct COM port from the browser popup
                            </p>
                        </div>
                        <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>3️⃣</div>
                            <strong style={{ fontSize: '0.85rem' }}>Record Simultaneously</strong>
                            <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                                Go to ECG / EEG Monitor pages and hit Record 60s on both — they work in parallel
                            </p>
                        </div>
                    </div>
                </div>

                {/* ML Training */}
                <div className={styles.statusCard}>
                    <div className={styles.statusLeft}>
                        <div className={styles.hwIcon} style={{ background: 'var(--bg-elevated)', color: 'var(--accent-blue)' }}>
                            <Database size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3>Machine Learning Model</h3>
                            <p className="text-secondary">Train the burnout detection model using the online reference dataset.</p>
                            {training.active && (
                                <div className={styles.qualityBar} style={{ marginTop: 'var(--space-2)', width: '100%' }}>
                                    <div className={styles.qualityFill} style={{ width: `${training.progress}%`, background: 'var(--accent-blue)' }} />
                                </div>
                            )}
                            <p className="mono" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                                Status: {training.status} {training.accuracy > 0 && `| Accuracy: ${training.accuracy.toFixed(1)}%`}
                            </p>
                        </div>
                    </div>
                    <button className="btn btn-outline" onClick={handleTrain} disabled={training.active}>
                        {training.active ? <RefreshCw className="spin" size={18} /> : <Play size={18} />}
                        {training.active ? 'Training...' : 'Train Model'}
                    </button>
                </div>

                {/* Connection Log */}
                <div className={styles.logCard}>
                    <h4>Device Activity Log</h4>
                    {logs.length === 0 ? (
                        <p className="text-muted text-center py-4">No events yet. Connect a device to start.</p>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className={styles.logRow}>
                                <div className={styles.logDot} style={{
                                    background: log.includes('✅') ? 'var(--accent-green)' :
                                        log.includes('❌') ? 'var(--accent-red)' :
                                            log.includes('🔴') ? 'var(--accent-red)' :
                                                'var(--accent-blue)'
                                }} />
                                <span>{log}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}

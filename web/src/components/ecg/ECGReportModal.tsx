'use client';
import { useEffect, useRef, useMemo, useCallback } from 'react';
import { SessionData } from '@/types';
import { getProfile } from '@/lib/sessionStore';
import {
    generateECGReport,
    ECGReportData,
    SAMPLE_RATE,
} from '@/lib/ecgAnalysis';
import { Printer, X, Heart, Activity, Clock, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import styles from './ECGReportModal.module.css';

// ─── ECG Canvas Renderer ──────────────────────────────────────────────────────

/**
 * Draw a standard medical ECG grid + signal on an HTML5 Canvas.
 *
 * Medical paper standard:
 *   Paper speed : 25 mm/s
 *   Gain        : 10 mm/mV  (1 large square = 0.5 mV)
 *   Small square: 1 mm  = 40 ms × 0.1 mV
 *   Large square: 5 mm  = 200 ms × 0.5 mV
 *
 * We map those physical mm values to pixels using a configurable scale
 * (default 4 px/mm ≈ ~96 DPI).
 */
function drawECGGrid(
    canvas: HTMLCanvasElement,
    signal: number[],
    rPeakIndices: number[],
    startSample = 0,
    durationSamples = 1000,
    pxPerMm = 3.8,
) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Physical canvas size in mm
    const totalWidthMm = 250;   // 10 seconds at 25mm/s
    const totalHeightMm = 30;   // ±1.5 mV visible at 10mm/mV

    const W = Math.round(totalWidthMm * pxPerMm);
    const H = Math.round(totalHeightMm * pxPerMm);
    canvas.width = W;
    canvas.height = H;

    const smallMm = 1 * pxPerMm;   // 1 mm small square
    const largeMm = 5 * pxPerMm;   // 5 mm large square

    // ── Background
    ctx.fillStyle = '#fff9f7';
    ctx.fillRect(0, 0, W, H);

    // ── Minor grid (1 mm)
    ctx.beginPath();
    ctx.strokeStyle = '#f4bfbf';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= W; x += smallMm) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y <= H; y += smallMm) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();

    // ── Major grid (5 mm)
    ctx.beginPath();
    ctx.strokeStyle = '#e07070';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += largeMm) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y <= H; y += largeMm) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();

    // ── Isoelectric baseline (centre)
    const baseline = H / 2;

    // Baseline line (slightly darker)
    ctx.beginPath();
    ctx.strokeStyle = '#c06060';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([4, 4]);
    ctx.moveTo(0, baseline);
    ctx.lineTo(W, baseline);
    ctx.stroke();
    ctx.setLineDash([]);

    if (signal.length === 0) return;

    // ── Calibration pulse (1mV square wave left side, 5mm wide, 10mm tall)
    const calWidth = largeMm;
    const calHeight = 10 * pxPerMm; // 1 mV at 10mm/mV
    ctx.beginPath();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5;
    ctx.moveTo(0, baseline);
    ctx.lineTo(0, baseline - calHeight);
    ctx.lineTo(calWidth, baseline - calHeight);
    ctx.lineTo(calWidth, baseline);
    ctx.stroke();

    // ── Signal samples to draw
    const slice = signal.slice(startSample, startSample + durationSamples);
    const signalStartX = calWidth + smallMm * 2; // after cal pulse

    // mV → px: 1 mV = 10mm = 10*pxPerMm px (upward)
    const mvToPx = (mv: number) => baseline - mv * 10 * pxPerMm;

    // Sample → X pixel
    // 25mm/s, 100Hz → 1 sample = 10ms = 0.25mm
    const sampleToX = (s: number) => signalStartX + s * 0.25 * pxPerMm;

    // ── Draw waveform
    ctx.beginPath();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    slice.forEach((mv, i) => {
        const x = sampleToX(i);
        const y = mvToPx(mv);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // ── R-peak markers
    ctx.fillStyle = '#dc2626';
    ctx.font = `${Math.round(pxPerMm * 2.5)}px sans-serif`;
    ctx.textAlign = 'center';
    for (const peakIdx of rPeakIndices) {
        const relIdx = peakIdx - startSample;
        if (relIdx < 0 || relIdx >= durationSamples) continue;
        const x = sampleToX(relIdx);
        const y = mvToPx(slice[relIdx]);
        // Small inverted triangle above peak
        ctx.beginPath();
        ctx.moveTo(x, y - 4 * pxPerMm);
        ctx.lineTo(x - 1.5 * pxPerMm, y - 6 * pxPerMm);
        ctx.lineTo(x + 1.5 * pxPerMm, y - 6 * pxPerMm);
        ctx.closePath();
        ctx.fill();
    }

    // ── Scale annotations (left margin)
    ctx.fillStyle = '#555';
    ctx.font = `${Math.round(pxPerMm * 2)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('1mV', 2, baseline - 10 * pxPerMm - 2);
    ctx.textAlign = 'right';
    ctx.fillText('+1.5mV', W - 2, mvToPx(1.5) + 8);
    ctx.fillText('0mV', W - 2, baseline + 8);
    ctx.fillText('-1.5mV', W - 2, mvToPx(-1.5) - 2);
}

// ─── Helper: status badge ─────────────────────────────────────────────────────

type StatusType = 'normal' | 'warning' | 'critical';

function statusIcon(s: StatusType) {
    if (s === 'normal') return <CheckCircle size={14} className={styles.iconGreen} />;
    if (s === 'warning') return <AlertTriangle size={14} className={styles.iconYellow} />;
    return <AlertCircle size={14} className={styles.iconRed} />;
}

function hrStatus(bpm: number): StatusType {
    if (bpm >= 60 && bpm <= 100) return 'normal';
    if (bpm < 40 || bpm > 150) return 'critical';
    return 'warning';
}
function prStatus(ms: number): StatusType {
    if (ms >= 120 && ms <= 200) return 'normal';
    if (ms > 300 || ms < 80) return 'critical';
    return 'warning';
}
function qrsStatus(ms: number): StatusType {
    if (ms >= 60 && ms <= 100) return 'normal';
    if (ms > 150) return 'critical';
    return 'warning';
}
function qtcStatus(ms: number): StatusType {
    if (ms >= 350 && ms <= 450) return 'normal';
    if (ms > 500 || ms < 300) return 'critical';
    return 'warning';
}
function stStatus(mv: number): StatusType {
    if (Math.abs(mv) < 0.1) return 'normal';
    if (Math.abs(mv) > 0.2) return 'critical';
    return 'warning';
}
function rhythmStatus(type: string): StatusType {
    if (type === 'sinus_rhythm') return 'normal';
    if (type === 'sinus_bradycardia' || type === 'sinus_tachycardia') return 'warning';
    if (type === 'irregular') return 'critical';
    return 'warning';
}

function rhythmLabel(type: string) {
    const map: Record<string, string> = {
        sinus_rhythm: 'Normal Sinus Rhythm',
        sinus_bradycardia: 'Sinus Bradycardia',
        sinus_tachycardia: 'Sinus Tachycardia',
        irregular: 'Irregular Rhythm',
        insufficient_data: 'Insufficient Data',
    };
    return map[type] ?? type;
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ECGReportModalProps {
    session: SessionData;
    onClose: () => void;
}

export default function ECGReportModal({ session, onClose }: ECGReportModalProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const profile = useMemo(() => getProfile(), []);

    // Run clinical analysis on rawECG
    const report = useMemo<ECGReportData | null>(() => {
        if (!session.rawECG || session.rawECG.length < SAMPLE_RATE) return null;
        return generateECGReport(session.rawECG);
    }, [session.rawECG]);

    // Draw ECG canvas whenever report is ready
    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !report) return;
        const rPeakIndices = report.rPeaks.map(p => p.index);
        drawECGGrid(canvas, report.filteredSignal, rPeakIndices);
    }, [report]);

    useEffect(() => {
        drawCanvas();
    }, [drawCanvas]);

    // Handle keyboard close
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const handlePrint = () => window.print();

    const recordingDate = session.date instanceof Date ? session.date : new Date(session.date);
    const durationMin = Math.floor(session.duration / 60);
    const durationSec = session.duration % 60;

    const iv = report?.intervals;
    const rt = report?.rhythm;
    const st = report?.stSegment;

    return (
        <>
            {/* Overlay */}
            <div className={styles.overlay} onClick={onClose} />

            {/* Modal */}
            <div className={styles.modal} role="dialog" aria-modal="true" aria-label="ECG Report">
                {/* Modal toolbar (hidden on print) */}
                <div className={styles.toolbar}>
                    <div className={styles.toolbarLeft}>
                        <Heart size={18} className={styles.iconRed} />
                        <span className={styles.toolbarTitle}>ECG Report — Lead I (3-Electrode)</span>
                    </div>
                    <div className={styles.toolbarRight}>
                        <button className={styles.btnPrint} onClick={handlePrint}>
                            <Printer size={16} /> Print / Save PDF
                        </button>
                        <button className={styles.btnClose} onClick={onClose} aria-label="Close">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* ════════════════════ PRINTABLE REPORT ════════════════════ */}
                <div className={styles.report} id="ecg-print-root">

                    {/* ── Page Header ── */}
                    <div className={styles.reportHeader}>
                        <div className={styles.reportHeaderLeft}>
                            <div className={styles.reportLogo}>
                                <Heart size={20} className={styles.iconRed} />
                                <span className={styles.reportLogoText}>NeuroGuard ECG</span>
                            </div>
                            <div className={styles.reportSubtitle}>
                                Single-Lead Electrocardiogram Report · 3-Electrode Configuration
                            </div>
                        </div>
                        <div className={styles.reportHeaderRight}>
                            <div className={styles.reportMeta}>
                                <span className={styles.metaLabel}>Recorded:</span>
                                <span>{recordingDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                <span className={styles.metaLabel}>Time:</span>
                                <span>{recordingDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className={styles.reportMeta}>
                                <span className={styles.metaLabel}>Duration:</span>
                                <span>{durationMin}m {durationSec}s</span>
                                <span className={styles.metaLabel}>Session ID:</span>
                                <span className={styles.mono}>{session.id}</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.divider} />

                    {/* ── Patient Info + Device Info ── */}
                    <div className={styles.infoRow}>
                        <div className={styles.infoBlock}>
                            <div className={styles.infoTitle}>Patient Information</div>
                            <div className={styles.infoGrid}>
                                <span className={styles.infoLabel}>Name</span>
                                <span className={styles.infoValue}>{profile.name}</span>
                                <span className={styles.infoLabel}>Age / Gender</span>
                                <span className={styles.infoValue}>{profile.age} yrs / {profile.gender}</span>
                                <span className={styles.infoLabel}>Resting HR</span>
                                <span className={styles.infoValue}>{profile.restingHR} BPM (baseline)</span>
                                <span className={styles.infoLabel}>Occupation</span>
                                <span className={styles.infoValue}>{profile.occupation}</span>
                            </div>
                        </div>
                        <div className={styles.infoBlock}>
                            <div className={styles.infoTitle}>Acquisition Details</div>
                            <div className={styles.infoGrid}>
                                <span className={styles.infoLabel}>Device</span>
                                <span className={styles.infoValue}>AD8232 + Arduino Uno</span>
                                <span className={styles.infoLabel}>Lead Config</span>
                                <span className={styles.infoValue}>Lead I (RA → LA, RL-GND)</span>
                                <span className={styles.infoLabel}>Sample Rate</span>
                                <span className={styles.infoValue}>100 Hz (10 ms/sample)</span>
                                <span className={styles.infoLabel}>ADC Resolution</span>
                                <span className={styles.infoValue}>10-bit (0–1023)</span>
                            </div>
                        </div>
                        <div className={styles.infoBlock}>
                            <div className={styles.infoTitle}>ECG Parameters</div>
                            <div className={styles.infoGrid}>
                                <span className={styles.infoLabel}>Paper Speed</span>
                                <span className={styles.infoValue}>25 mm/s (standard)</span>
                                <span className={styles.infoLabel}>Gain</span>
                                <span className={styles.infoValue}>10 mm/mV (standard)</span>
                                <span className={styles.infoLabel}>Display Window</span>
                                <span className={styles.infoValue}>{report ? report.durationSec.toFixed(1) : '—'} seconds</span>
                                <span className={styles.infoLabel}>Samples Analyzed</span>
                                <span className={styles.infoValue}>{report?.totalSamples ?? '—'}</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.divider} />

                    {/* ── Clinical Measurements Table ── */}
                    <div className={styles.sectionTitle}>
                        <Activity size={14} /> Clinical Measurements
                    </div>
                    <table className={styles.metricsTable}>
                        <thead>
                            <tr>
                                <th>Parameter</th>
                                <th>Measured Value</th>
                                <th>Normal Range</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Heart Rate</td>
                                <td className={styles.metricValue}>{iv?.hrBPM ?? session.avgHR} BPM</td>
                                <td className={styles.normal}>60 – 100 BPM</td>
                                <td>{statusIcon(hrStatus(iv?.hrBPM ?? session.avgHR))}</td>
                            </tr>
                            <tr>
                                <td>PR Interval</td>
                                <td className={styles.metricValue}>{iv?.prInterval ?? '—'} ms</td>
                                <td className={styles.normal}>120 – 200 ms</td>
                                <td>{iv ? statusIcon(prStatus(iv.prInterval)) : '—'}</td>
                            </tr>
                            <tr>
                                <td>QRS Duration</td>
                                <td className={styles.metricValue}>{iv?.qrsDuration ?? '—'} ms</td>
                                <td className={styles.normal}>60 – 100 ms</td>
                                <td>{iv ? statusIcon(qrsStatus(iv.qrsDuration)) : '—'}</td>
                            </tr>
                            <tr>
                                <td>QTc Interval (Bazett)</td>
                                <td className={styles.metricValue}>{iv?.qtcInterval ?? '—'} ms</td>
                                <td className={styles.normal}>350 – 450 ms</td>
                                <td>{iv ? statusIcon(qtcStatus(iv.qtcInterval)) : '—'}</td>
                            </tr>
                            <tr>
                                <td>Mean R-R Interval</td>
                                <td className={styles.metricValue}>{iv?.meanRR ?? '—'} ms</td>
                                <td className={styles.normal}>600 – 1000 ms</td>
                                <td>{iv ? (iv.meanRR >= 600 && iv.meanRR <= 1000 ? statusIcon('normal') : statusIcon('warning')) : '—'}</td>
                            </tr>
                            <tr>
                                <td>HR Variability (SDNN)</td>
                                <td className={styles.metricValue}>{iv?.sdRR ?? session.avgHRV} ms</td>
                                <td className={styles.normal}>&gt; 20 ms</td>
                                <td>{statusIcon((iv?.sdRR ?? session.avgHRV) >= 20 ? 'normal' : 'warning')}</td>
                            </tr>
                            <tr>
                                <td>ST Deviation</td>
                                <td className={styles.metricValue}>{st ? `${st.deviation >= 0 ? '+' : ''}${st.deviation.toFixed(2)} mV` : '—'}</td>
                                <td className={styles.normal}>&lt; ±0.1 mV (isoelectric)</td>
                                <td>{st ? statusIcon(stStatus(st.deviation)) : '—'}</td>
                            </tr>
                            <tr>
                                <td>R-Peaks Detected</td>
                                <td className={styles.metricValue}>{report?.rPeaks.length ?? '—'}</td>
                                <td className={styles.normal}>—</td>
                                <td>{report?.rPeaks && report.rPeaks.length >= 3 ? statusIcon('normal') : statusIcon('warning')}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className={styles.divider} />

                    {/* ── ECG Waveform ── */}
                    <div className={styles.sectionTitle}>
                        <Heart size={14} /> Lead I — Electrocardiogram (25 mm/s · 10 mm/mV)
                    </div>
                    <div className={styles.ecgWrap}>
                        {report ? (
                            <>
                                <canvas ref={canvasRef} className={styles.ecgCanvas} />
                                <div className={styles.ecgScaleBar}>
                                    <span>◀ 0</span>
                                    <span>2s</span>
                                    <span>4s</span>
                                    <span>6s</span>
                                    <span>8s</span>
                                    <span>10s ▶</span>
                                </div>
                                <div className={styles.ecgLegend}>
                                    <span className={styles.legendPeak}>▼ R-Peak</span>
                                    <span className={styles.legendGrid}>□ 1 sq = 200ms × 0.5mV</span>
                                    <span className={styles.legendCal}>⊓ Cal: 1mV</span>
                                </div>
                            </>
                        ) : (
                            <div className={styles.noSignal}>
                                <AlertCircle size={24} className={styles.iconYellow} />
                                <p>Insufficient ECG data in this session (minimum 1 second required).</p>
                            </div>
                        )}
                    </div>

                    <div className={styles.divider} />

                    {/* ── Rhythm Analysis ── */}
                    <div className={styles.sectionTitle}>
                        <Clock size={14} /> Rhythm Analysis &amp; Interpretation
                    </div>
                    {rt ? (
                        <div className={styles.rhythmBlock}>
                            <div className={styles.rhythmHeader}>
                                <span className={`${styles.rhythmBadge} ${styles[`rhythm_${rt.type}`]}`}>
                                    {rhythmLabel(rt.type)}
                                </span>
                                <span className={styles.rhythmRegular}>
                                    {rt.regular ? '✓ Regular' : '⚠ Irregular'} &nbsp;·&nbsp;
                                    {rt.pWavePresent ? 'P-waves Present' : 'P-waves: Indeterminate'}
                                </span>
                            </div>
                            <p className={styles.rhythmDesc}>{rt.description}</p>
                            <ul className={styles.interpretList}>
                                {report?.interpretation.map((line, i) => (
                                    <li key={i} className={line.includes('⚠') ? styles.interpretWarn : styles.interpretOk}>
                                        {line.replace('⚠ ', '')}
                                    </li>
                                ))}
                                {session.burnoutScore !== undefined && (
                                    <li className={session.burnoutScore > 70 ? styles.interpretWarn : styles.interpretOk}>
                                        Burnout Score: {session.burnoutScore}% — {session.classification === 'normal' ? 'Normal' : session.classification === 'high_stress' ? 'High Stress' : 'Burnout Risk'}
                                    </li>
                                )}
                            </ul>
                        </div>
                    ) : (
                        <div className={styles.noSignal}>
                            <p>Rhythm analysis requires a minimum of 3 detected R-peaks.</p>
                        </div>
                    )}

                    <div className={styles.divider} />

                    {/* ── Limitations / Disclaimer ── */}
                    <div className={styles.disclaimer}>
                        <div className={styles.disclaimerTitle}>⚠ Important Clinical Limitations</div>
                        <ul className={styles.disclaimerList}>
                            <li>This is a <strong>single-lead (Lead I) recording</strong> from a 3-electrode (RA, LA, RL-GND) consumer-grade device.</li>
                            <li>A full <strong>12-lead ECG</strong> is mandatory for comprehensive cardiac assessment, axis deviation, chamber enlargement, or regional ischaemia.</li>
                            <li>This report is generated for <strong>screening and wellness monitoring purposes only</strong> and is not a substitute for clinical evaluation.</li>
                            <li>Signal quality may be affected by electrode placement, movement artefacts, and electromagnetic interference.</li>
                            <li>This recording should be <strong>reviewed by a licensed physician</strong> before any clinical decisions are made.</li>
                            <li>All interval measurements are computed algorithmically and may have ±10–20 ms error versus manual caliper measurement.</li>
                        </ul>
                        <div className={styles.reportFooter}>
                            <span>Generated by NeuroGuard System · AD8232 + Arduino Uno · Lead I (3-Electrode)</span>
                            <span>Report Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}

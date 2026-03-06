'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import Header from '@/components/layout/Header';
import { SessionData } from '@/types';
import { getSessions } from '@/lib/sessionStore';
import { generateSessionHistory, formatDuration } from '@/lib/mockData';
import { analyzeECG, analyzeEEG, ECGInterpretation, EEGInterpretation } from '@/lib/clinicalEngine';
import {
    Brain, Download, FileText, Heart, Activity, AlertTriangle,
    CheckCircle, ChevronDown, ChevronUp, Zap, Eye, Shield, Printer, X
} from 'lucide-react';
import styles from './page.module.css';

function downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function SeverityBadge({ level }: { level: string }) {
    const map: Record<string, { color: string; bg: string }> = {
        normal: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
        none: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
        mild: { color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
        low: { color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
        moderate: { color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
        severe: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
        high: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
        excellent: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
        good: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
        fair: { color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
        poor: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    };
    const s = map[level] || map['normal'];
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600, color: s.color, background: s.bg, textTransform: 'uppercase' }}>
            {level === 'normal' || level === 'none' || level === 'excellent' || level === 'good' ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
            {level}
        </span>
    );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = Math.min(100, (value / max) * 100);
    return (
        <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
        </div>
    );
}

function Section({ title, icon: Icon, color, children }: { title: string; icon: any; color: string; children: React.ReactNode }) {
    const [open, setOpen] = useState(true);
    return (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <button onClick={() => setOpen(!open)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                <Icon size={16} style={{ color }} /> {title}
                <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
            </button>
            {open && <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>}
        </div>
    );
}

function MetricRow({ label, value, unit, severity }: { label: string; value: string | number; unit?: string; severity?: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.85rem' }}>{value}{unit && <span style={{ fontSize: '0.7rem', fontWeight: 400, marginLeft: 2, color: 'var(--text-muted)' }}>{unit}</span>}</span>
                {severity && <SeverityBadge level={severity} />}
            </div>
        </div>
    );
}

function TextBlock({ text }: { text: string }) {
    return <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{text}</p>;
}

// ─── SVG Graph Generator for Reports ─────────────────────────────────
function generateSVGCurve(data: number[], color: string, isECG = false) {
    if (!data || data.length === 0) return null;
    // For ECG we take a 300-sample slice (3 seconds at 100Hz) to zoom in beautifully on the QRS complexes
    // For EEG we take a 400-sample chunk
    const sliceLength = isECG ? 300 : 400;
    const slice = data.slice(0, sliceLength);
    const width = 800;
    const height = 160;

    // Auto-scale to min/max of the slice
    const max = Math.max(...slice);
    const min = Math.min(...slice);
    const range = (max - min) || 1;

    let path = '';
    const step = width / (slice.length - 1);

    slice.forEach((val, i) => {
        const x = i * step;
        // Invert Y (SVG 0 is top) and add 10px padding top/bottom
        const y = 10 + (height - 20) - (((val - min) / range) * (height - 20));
        if (i === 0) path += `M ${x.toFixed(1)} ${y.toFixed(1)} `;
        else path += `L ${x.toFixed(1)} ${y.toFixed(1)} `;
    });

    const gridSvg = isECG ? `
        <pattern id="ecgGridMinor" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#fecaca" stroke-width="0.5"/>
        </pattern>
        <pattern id="ecgGridMajor" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="url(#ecgGridMinor)"/>
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f87171" stroke-width="1"/>
        </pattern>
        <rect width="100%" height="100%" fill="#fff5f5" />
        <rect width="100%" height="100%" fill="url(#ecgGridMajor)" />
    ` : `
        <rect width="100%" height="100%" fill="#f8fafc" />
        <path d="M 0 ${height / 2} L ${width} ${height / 2}" fill="none" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4,4" />
    `;

    return `
        <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; border: 1px solid var(--border, #e2e8f0); border-radius: 6px; display: block;">
            ${gridSvg}
            <path d="${path}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
        </svg>
    `;
}

// ─── ECG Report View ─────────────────────────────────────────────────
function ECGReportView({ interpretation: i, rawData }: { interpretation: ECGInterpretation, rawData?: number[] }) {
    const svgStr = rawData ? generateSVGCurve(rawData, '#0f172a', true) : null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: 16, background: i.heartRate.classification === 'normal' && i.rhythm.type === 'regular_sinus' ? 'rgba(34,197,94,0.06)' : 'rgba(234,179,8,0.06)', border: `1px solid ${i.heartRate.classification === 'normal' ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)'}`, borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Shield size={16} style={{ color: i.heartRate.classification === 'normal' ? '#22c55e' : '#eab308' }} />
                    <strong style={{ fontSize: '0.85rem' }}>Clinical Assessment — 3-Lead ECG (RA, LA, LL)</strong>
                </div>
                <TextBlock text={i.overallAssessment} />
            </div>

            {svgStr && (
                <div style={{ marginBottom: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span><strong>Lead I</strong> (Zoomed rendering)</span>
                        <span>25 mm/s · 10 mm/mV</span>
                    </div>
                    <div dangerouslySetInnerHTML={{ __html: svgStr }} />
                </div>
            )}

            <Section title="Heart Rate Analysis" icon={Heart} color="#ef4444">
                <MetricRow label="Heart Rate" value={i.heartRate.bpm} unit=" BPM" severity={i.heartRate.severity} />
                <MetricRow label="Classification" value={i.heartRate.classification} severity={i.heartRate.severity} />
                <TextBlock text={i.heartRate.description} />
            </Section>
            <Section title="Rhythm Analysis & AFib Screening" icon={Activity} color="#3b82f6">
                <MetricRow label="Rhythm Type" value={i.rhythm.type.replace(/_/g, ' ')} severity={i.rhythm.severity} />
                <MetricRow label="RR Regularity" value={`${i.rhythm.regularity}%`} />
                <TextBlock text={i.rhythm.description} />
            </Section>
            <Section title="ST-Segment & Ischemia Screening" icon={Zap} color="#f97316">
                <MetricRow label="ST Deviation" value={i.stSegment.deviation > 0 ? `+${i.stSegment.deviation}` : i.stSegment.deviation} unit=" mV" severity={i.stSegment.classification} />
                <MetricRow label="Ischemia Risk" value={i.stSegment.ischemiaRisk} severity={i.stSegment.ischemiaRisk} />
                <TextBlock text={i.stSegment.description} />
            </Section>
            <Section title="Waveform Morphology (P, QRS, T)" icon={FileText} color="#a855f7">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6 }}>P-Wave</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>{i.waveforms.pWave.amplitude}<small style={{ fontSize: '0.6rem' }}> mV</small></div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Duration: {i.waveforms.pWave.duration} ms</div>
                    </div>
                    <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6 }}>QRS Complex</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>{i.waveforms.qrsComplex.duration}<small style={{ fontSize: '0.6rem' }}> ms</small></div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Amp: {i.waveforms.qrsComplex.amplitude} mV • {i.waveforms.qrsComplex.morphology}</div>
                    </div>
                    <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6 }}>T-Wave</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>{i.waveforms.tWave.amplitude}<small style={{ fontSize: '0.6rem' }}> mV</small></div>
                        <div style={{ fontSize: '0.65rem', color: i.waveforms.tWave.inversion ? '#ef4444' : 'var(--text-secondary)' }}>{i.waveforms.tWave.inversion ? '⚠ INVERTED' : 'Upright'}</div>
                    </div>
                </div>
                <TextBlock text={i.waveforms.pWave.description} />
                <TextBlock text={i.waveforms.qrsComplex.description} />
                <TextBlock text={i.waveforms.tWave.description} />
            </Section>
            <Section title="Interval Measurements" icon={Activity} color="#22c55e">
                <MetricRow label="PR Interval" value={i.prInterval} unit=" ms" severity={i.prInterval > 200 ? 'mild' : 'normal'} />
                <MetricRow label="QT Interval" value={i.qtInterval} unit=" ms" />
                <MetricRow label="QTc (Corrected)" value={i.qtcInterval} unit=" ms" severity={i.qtcInterval > 460 ? 'moderate' : 'normal'} />
            </Section>
            <div style={{ padding: 16, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 'var(--radius-md)' }}>
                <strong style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><CheckCircle size={14} style={{ color: '#3b82f6' }} /> Clinical Recommendations</strong>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    {i.recommendations.map((r, idx) => <li key={idx}>{r}</li>)}
                </ul>
            </div>
        </div>
    );
}

// ─── EEG Report View ─────────────────────────────────────────────────
function EEGReportView({ interpretation: i, rawData }: { interpretation: EEGInterpretation, rawData?: number[] }) {
    const bandColors: Record<string, string> = { delta: '#6366f1', theta: '#8b5cf6', alpha: '#3b82f6', beta: '#22c55e' };
    const svgStr = rawData ? generateSVGCurve(rawData, '#a855f7', false) : null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: 16, background: !i.seizureScreening.detected ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${!i.seizureScreening.detected ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Shield size={16} style={{ color: !i.seizureScreening.detected ? '#22c55e' : '#ef4444' }} />
                    <strong style={{ fontSize: '0.85rem' }}>Clinical Assessment — 3-Electrode EEG (Active, Reference, Ground)</strong>
                </div>
                <TextBlock text={i.overallAssessment} />
            </div>

            {svgStr && (
                <div style={{ marginBottom: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span><strong>Raw EEG Trace</strong> (Sample Window)</span>
                        <span>100 Hz</span>
                    </div>
                    <div dangerouslySetInnerHTML={{ __html: svgStr }} />
                </div>
            )}

            <Section title="Brain State Classification" icon={Brain} color="#a855f7">
                <MetricRow label="Dominant Band" value={i.brainState.dominant.toUpperCase()} />
                <MetricRow label="State" value={i.brainState.state} />
                <MetricRow label="Alertness Level" value={`${i.brainState.alertnessLevel}%`} severity={i.brainState.alertnessLevel > 60 ? 'normal' : i.brainState.alertnessLevel > 30 ? 'mild' : 'moderate'} />
                <ProgressBar value={i.brainState.alertnessLevel} max={100} color="#a855f7" />
                <TextBlock text={i.brainState.description} />
            </Section>
            <Section title="Frequency Band Power" icon={Activity} color="#3b82f6">
                {Object.entries(i.bandPowers).map(([band, data]) => (
                    <div key={band}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: '0.8rem', color: bandColors[band], fontWeight: 600, textTransform: 'capitalize' }}>{band}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{data.power} µV² ({data.percentage}%)</span>
                        </div>
                        <ProgressBar value={data.percentage} max={60} color={bandColors[band]} />
                    </div>
                ))}
            </Section>
            <Section title="Seizure Activity Screening" icon={Zap} color="#ef4444">
                <MetricRow label="Epileptiform Spikes" value={i.seizureScreening.spikeCount} severity={i.seizureScreening.riskLevel} />
                <MetricRow label="Seizure Risk" value={i.seizureScreening.riskLevel} severity={i.seizureScreening.riskLevel} />
                <TextBlock text={i.seizureScreening.description} />
            </Section>
            <Section title="Cognitive & Emotional State" icon={Eye} color="#22c55e">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    {[
                        { label: 'Focus', value: i.cognitiveState.focus, color: '#3b82f6' },
                        { label: 'Relaxation', value: i.cognitiveState.relaxation, color: '#22c55e' },
                        { label: 'Drowsiness', value: i.cognitiveState.drowsiness, color: '#eab308' },
                    ].map(m => (
                        <div key={m.label} style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6 }}>{m.label}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: m.color }}>{m.value}%</div>
                            <div style={{ marginTop: 6 }}><ProgressBar value={m.value} max={100} color={m.color} /></div>
                        </div>
                    ))}
                </div>
                <MetricRow label="Mental Load" value={i.cognitiveState.mentalLoad} severity={i.cognitiveState.mentalLoad === 'high' ? 'moderate' : 'normal'} />
                <TextBlock text={i.cognitiveState.description} />
            </Section>
            <Section title="Signal Quality" icon={Activity} color="#64748b">
                <MetricRow label="Quality" value={i.signalQuality.quality} severity={i.signalQuality.quality} />
                <MetricRow label="Impedance" value={i.signalQuality.impedance} unit=" kΩ" />
                <MetricRow label="SNR" value={i.signalQuality.snr} unit=" dB" />
                <MetricRow label="Artifact" value={`${i.signalQuality.artifactPercentage}%`} />
            </Section>
            <div style={{ padding: 16, background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: 'var(--radius-md)' }}>
                <strong style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><CheckCircle size={14} style={{ color: '#a855f7' }} /> Clinical Recommendations</strong>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    {i.recommendations.map((r, idx) => <li key={idx}>{r}</li>)}
                </ul>
            </div>
        </div>
    );
}

// ─── Print helper ────────────────────────────────────────────────────
function printReport(session: SessionData, ecgInterp?: ECGInterpretation, eegInterp?: EEGInterpretation) {
    const d = session.date instanceof Date ? session.date : new Date(session.date);
    const hasECG = session.rawECG && session.rawECG.length > 0;
    const hasEEG = session.rawEEG && session.rawEEG.length > 0;

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>NeuroGuard Clinical Report</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1a1a2e; }
        h1 { color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
        h2 { color: #1a1a2e; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
        h3 { color: #64748b; margin-top: 20px; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .badge { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
        .badge-ecg { background: #dbeafe; color: #2563eb; }
        .badge-eeg { background: #f3e8ff; color: #9333ea; }
        .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f1f1; font-size: 0.9rem; }
        .metric-label { color: #64748b; }
        .metric-value { font-weight: 700; font-family: monospace; }
        .assessment { padding: 16px; background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px; margin: 16px 0; }
        .warning { padding: 16px; background: #fffbeb; border-left: 4px solid #eab308; border-radius: 4px; margin: 16px 0; }
        .recommendations li { margin: 6px 0; font-size: 0.9rem; }
        .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin: 12px 0; }
        .grid3 > div { padding: 12px; background: #f8fafc; border-radius: 6px; text-align: center; }
        .grid3 strong { font-family: monospace; font-size: 1.2rem; display: block; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 0.75rem; color: #94a3b8; text-align: center; }
        @media print { body { padding: 20px; } }
    </style></head><body>`;

    html += `<div class="header"><div><h1>🩺 NeuroGuard Clinical Report</h1></div></div>`;
    html += `<p><strong>Session:</strong> ${session.id} &nbsp; <strong>Date:</strong> ${d.toLocaleString()} &nbsp; <strong>Duration:</strong> ${formatDuration(session.duration)}</p>`;
    html += `<p><span class="badge ${hasECG ? 'badge-ecg' : 'badge-eeg'}">${hasECG ? '3-Lead ECG' : '3-Electrode EEG'}</span></p>`;

    if (ecgInterp) {
        const e = ecgInterp;
        const svg = session.rawECG ? generateSVGCurve(session.rawECG, '#0f172a', true) : '';
        html += `<h2>❤️ ECG Clinical Interpretation (3-Lead: RA, LA, LL)</h2>`;
        html += `<div class="${e.heartRate.classification === 'normal' ? 'assessment' : 'warning'}"><strong>Overall:</strong> ${e.overallAssessment}</div>`;
        if (svg) html += `<div style="margin: 20px 0;"><h3 style="margin-top:0;">Lead I Trace (Zoomed)</h3>${svg}</div>`;
        html += `<h3>Heart Rate</h3>`;
        html += `<div class="metric"><span class="metric-label">Heart Rate</span><span class="metric-value">${e.heartRate.bpm} BPM — ${e.heartRate.classification}</span></div>`;
        html += `<p>${e.heartRate.description}</p>`;
        html += `<h3>Rhythm & AFib Screening</h3>`;
        html += `<div class="metric"><span class="metric-label">Rhythm</span><span class="metric-value">${e.rhythm.type.replace(/_/g, ' ')} (${e.rhythm.regularity}% regularity)</span></div>`;
        html += `<p>${e.rhythm.description}</p>`;
        html += `<h3>ST-Segment & Ischemia</h3>`;
        html += `<div class="metric"><span class="metric-label">ST Deviation</span><span class="metric-value">${e.stSegment.deviation} mV — Risk: ${e.stSegment.ischemiaRisk}</span></div>`;
        html += `<p>${e.stSegment.description}</p>`;
        html += `<h3>Waveform Morphology</h3>`;
        html += `<div class="grid3">`;
        html += `<div><small>P-Wave</small><strong>${e.waveforms.pWave.amplitude} mV</strong><small>${e.waveforms.pWave.duration} ms</small></div>`;
        html += `<div><small>QRS Complex</small><strong>${e.waveforms.qrsComplex.duration} ms</strong><small>${e.waveforms.qrsComplex.morphology}</small></div>`;
        html += `<div><small>T-Wave</small><strong>${e.waveforms.tWave.amplitude} mV</strong><small>${e.waveforms.tWave.inversion ? '⚠ INVERTED' : 'Upright'}</small></div>`;
        html += `</div>`;
        html += `<h3>Intervals</h3>`;
        html += `<div class="metric"><span class="metric-label">PR Interval</span><span class="metric-value">${e.prInterval} ms</span></div>`;
        html += `<div class="metric"><span class="metric-label">QTc (Corrected)</span><span class="metric-value">${e.qtcInterval} ms</span></div>`;
        html += `<h3>Recommendations</h3><ul class="recommendations">${e.recommendations.map(r => `<li>${r}</li>`).join('')}</ul>`;
    }

    if (eegInterp) {
        const g = eegInterp;
        const svg = session.rawEEG ? generateSVGCurve(session.rawEEG, '#a855f7', false) : '';
        html += `<h2>🧠 EEG Clinical Interpretation (3-Electrode: Active, Ref, GND)</h2>`;
        html += `<div class="${!g.seizureScreening.detected ? 'assessment' : 'warning'}"><strong>Overall:</strong> ${g.overallAssessment}</div>`;
        if (svg) html += `<div style="margin: 20px 0;"><h3 style="margin-top:0;">Raw Cortex Trace (Sample)</h3>${svg}</div>`;
        html += `<h3>Brain State</h3>`;
        html += `<div class="metric"><span class="metric-label">Dominant Band</span><span class="metric-value">${g.brainState.dominant.toUpperCase()} — ${g.brainState.state}</span></div>`;
        html += `<div class="metric"><span class="metric-label">Alertness</span><span class="metric-value">${g.brainState.alertnessLevel}%</span></div>`;
        html += `<p>${g.brainState.description}</p>`;
        html += `<h3>Band Powers</h3>`;
        Object.entries(g.bandPowers).forEach(([band, data]) => {
            html += `<div class="metric"><span class="metric-label">${band.charAt(0).toUpperCase() + band.slice(1)}</span><span class="metric-value">${data.power} µV² (${data.percentage}%)</span></div>`;
        });
        html += `<h3>Seizure Screening</h3>`;
        html += `<div class="metric"><span class="metric-label">Spikes Detected</span><span class="metric-value">${g.seizureScreening.spikeCount} — Risk: ${g.seizureScreening.riskLevel}</span></div>`;
        html += `<p>${g.seizureScreening.description}</p>`;
        html += `<h3>Cognitive State</h3>`;
        html += `<div class="grid3">`;
        html += `<div><small>Focus</small><strong>${g.cognitiveState.focus}%</strong></div>`;
        html += `<div><small>Relaxation</small><strong>${g.cognitiveState.relaxation}%</strong></div>`;
        html += `<div><small>Drowsiness</small><strong>${g.cognitiveState.drowsiness}%</strong></div>`;
        html += `</div>`;
        html += `<p>${g.cognitiveState.description}</p>`;
        html += `<h3>Recommendations</h3><ul class="recommendations">${g.recommendations.map(r => `<li>${r}</li>`).join('')}</ul>`;
    }

    html += `<div class="footer">Generated by NeuroGuard System · ${new Date().toLocaleString()} · This is a simulated clinical report for educational purposes only.</div>`;
    html += `</body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    }
}

// ─── Download full clinical report as JSON ───────────────────────────
function downloadReportJSON(session: SessionData, ecgInterp?: ECGInterpretation, eegInterp?: EEGInterpretation) {
    const data = { session: { ...session, rawECG: undefined, rawEEG: undefined }, ecgInterpretation: ecgInterp || null, eegInterpretation: eegInterp || null };
    downloadFile(JSON.stringify(data, null, 2), `clinical_report_${session.id}.json`, 'application/json');
}

// ─── Download full clinical report as CSV ────────────────────────────
function downloadReportCSV(session: SessionData, ecgInterp?: ECGInterpretation, eegInterp?: EEGInterpretation) {
    const d = session.date instanceof Date ? session.date : new Date(session.date);
    let csv = 'NeuroGuard Clinical Report\n';
    csv += `Session,${session.id}\nDate,${d.toISOString()}\nDuration,${session.duration}s\n\n`;

    if (ecgInterp) {
        const e = ecgInterp;
        csv += 'ECG CLINICAL INTERPRETATION\n';
        csv += `Heart Rate,${e.heartRate.bpm} BPM,${e.heartRate.classification},${e.heartRate.severity}\n`;
        csv += `Rhythm,${e.rhythm.type},Regularity ${e.rhythm.regularity}%\n`;
        csv += `ST Deviation,${e.stSegment.deviation} mV,${e.stSegment.classification},Ischemia: ${e.stSegment.ischemiaRisk}\n`;
        csv += `P-Wave,${e.waveforms.pWave.amplitude} mV,${e.waveforms.pWave.duration} ms\n`;
        csv += `QRS,${e.waveforms.qrsComplex.duration} ms,${e.waveforms.qrsComplex.morphology}\n`;
        csv += `T-Wave,${e.waveforms.tWave.amplitude} mV,${e.waveforms.tWave.inversion ? 'INVERTED' : 'Upright'}\n`;
        csv += `PR,${e.prInterval} ms\nQTc,${e.qtcInterval} ms\n`;
        csv += `Assessment,"${e.overallAssessment}"\n\n`;
    }
    if (eegInterp) {
        const g = eegInterp;
        csv += 'EEG CLINICAL INTERPRETATION\n';
        csv += `Brain State,${g.brainState.dominant},${g.brainState.state},Alertness ${g.brainState.alertnessLevel}%\n`;
        csv += `Delta,${g.bandPowers.delta.power} µV²,${g.bandPowers.delta.percentage}%\n`;
        csv += `Theta,${g.bandPowers.theta.power} µV²,${g.bandPowers.theta.percentage}%\n`;
        csv += `Alpha,${g.bandPowers.alpha.power} µV²,${g.bandPowers.alpha.percentage}%\n`;
        csv += `Beta,${g.bandPowers.beta.power} µV²,${g.bandPowers.beta.percentage}%\n`;
        csv += `Seizure Spikes,${g.seizureScreening.spikeCount},Risk: ${g.seizureScreening.riskLevel}\n`;
        csv += `Focus,${g.cognitiveState.focus}%\nRelaxation,${g.cognitiveState.relaxation}%\nDrowsiness,${g.cognitiveState.drowsiness}%\n`;
        csv += `Assessment,"${g.overallAssessment}"\n`;
    }

    downloadFile(csv, `clinical_report_${session.id}.csv`, 'text/csv');
}

// ─── Main Reports Page ───────────────────────────────────────────────
export default function ReportsPage() {
    const [sessions, setSessions] = useState<SessionData[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        const stored = getSessions();
        setSessions(stored.length > 0 ? stored : generateSessionHistory(5));
    }, []);

    // Compute interpretations per session
    const interpretations = useMemo(() => {
        const map: Record<string, { ecg?: ECGInterpretation; eeg?: EEGInterpretation }> = {};
        sessions.forEach(s => {
            const result: { ecg?: ECGInterpretation; eeg?: EEGInterpretation } = {};
            if (s.rawECG && s.rawECG.length > 0) result.ecg = analyzeECG(s.rawECG);
            if (s.rawEEG && s.rawEEG.length > 0) result.eeg = analyzeEEG(s.rawEEG);
            map[s.id] = result;
        });
        return map;
    }, [sessions]);

    return (
        <>
            <Header breadcrumbs={[{ label: 'Dashboard' }, { label: 'Clinical Reports' }]} />
            <div className={styles.content}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Clinical Reports</h2>
                        <p className="text-secondary">
                            {sessions.length} session{sessions.length !== 1 ? 's' : ''} — Generate clinical interpretation for each recording
                        </p>
                    </div>
                </div>

                {sessions.length === 0 ? (
                    <div className={styles.previewCard} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16, border: '1px dashed var(--border)' }}>
                        <span style={{ fontSize: 32 }}>🩺</span>
                        <h3>No Sessions Yet</h3>
                        <p className="text-secondary text-center" style={{ maxWidth: 450 }}>
                            Record a 60-second ECG or EEG session to generate clinical reports with full interpretation.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {sessions.map(s => {
                            const d = s.date instanceof Date ? s.date : new Date(s.date);
                            const hasECG = s.rawECG && s.rawECG.length > 0;
                            const hasEEG = s.rawEEG && s.rawEEG.length > 0;
                            const hasData = hasECG || hasEEG;
                            const isExpanded = expandedId === s.id;
                            const interp = interpretations[s.id] || {};

                            return (
                                <div key={s.id} className={styles.previewCard}>
                                    {/* Session Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isExpanded ? 16 : 0, flexWrap: 'wrap', gap: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: hasECG ? 'rgba(59,130,246,0.1)' : hasEEG ? 'rgba(168,85,247,0.1)' : 'rgba(100,116,139,0.1)' }}>
                                                {hasECG ? <Heart size={20} style={{ color: '#3b82f6' }} /> : hasEEG ? <Brain size={20} style={{ color: '#a855f7' }} /> : <FileText size={20} style={{ color: '#64748b' }} />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                                    {hasECG ? 'ECG Recording' : hasEEG ? 'EEG Recording' : 'Session'} — {d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: 12, marginTop: 2 }}>
                                                    <span>{d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span>Duration: {formatDuration(s.duration)}</span>
                                                    {hasECG && <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>3-Lead ECG</span>}
                                                    {hasEEG && <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>3-Electrode EEG</span>}
                                                    {!hasData && <span className="badge badge-yellow" style={{ fontSize: '0.65rem' }}>Demo Data</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {hasData && (
                                                <>
                                                    <button className="btn btn-outline btn-sm" onClick={() => downloadReportJSON(s, interp.ecg, interp.eeg)} title="Download clinical report as JSON">
                                                        <Download size={12} /> JSON
                                                    </button>
                                                    <button className="btn btn-outline btn-sm" onClick={() => downloadReportCSV(s, interp.ecg, interp.eeg)} title="Download clinical report as CSV">
                                                        <Download size={12} /> CSV
                                                    </button>
                                                    <button className="btn btn-outline btn-sm" onClick={() => printReport(s, interp.ecg, interp.eeg)} title="Print clinical report">
                                                        <Printer size={12} /> Print
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => setExpandedId(isExpanded ? null : s.id)}
                                                disabled={!hasData}
                                                title={hasData ? 'Generate & view clinical report' : 'No raw data available'}
                                            >
                                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                {isExpanded ? 'Collapse' : 'Generate Report'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Clinical Report */}
                                    {isExpanded && hasData && (
                                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                                            {interp.ecg && <ECGReportView interpretation={interp.ecg} rawData={s.rawECG} />}
                                            {interp.eeg && <EEGReportView interpretation={interp.eeg} rawData={s.rawEEG} />}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}

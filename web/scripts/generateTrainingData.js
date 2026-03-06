/**
 * NeuroGuard — Synthetic Training Data Generator
 * ================================================
 * Generates 100+ labeled synthetic samples for both ECG and EEG ML models.
 * Run: node generateTrainingData.js
 * Output: stress_model_data.json, ecg_training_data.json, eeg_training_data.json
 */

// ─── ECG Synthetic Data ─────────────────────────────────────────────
// Labels: 0 = Normal Sinus, 1 = Bradycardia, 2 = Tachycardia, 3 = Arrhythmia/AFib, 4 = ST-Elevation (Ischemia)
function generateECGSamples() {
    const samples = [];

    // 30 Normal Sinus Rhythm (HR 60-100, regular, no ST deviation)
    for (let i = 0; i < 30; i++) {
        const hr = 60 + Math.random() * 40;
        const rr_regularity = 92 + Math.random() * 8;
        const rr_std = 5 + Math.random() * 15;
        const st_deviation = -0.05 + Math.random() * 0.1;
        const pr_interval = 120 + Math.random() * 60;
        const qrs_duration = 80 + Math.random() * 30;
        const qtc = 380 + Math.random() * 60;
        const p_amplitude = 0.1 + Math.random() * 0.12;
        const t_inversion = 0;
        samples.push({ hr, rr_regularity, rr_std, st_deviation, pr_interval, qrs_duration, qtc, p_amplitude, t_inversion, label: 0, label_name: 'normal_sinus' });
    }

    // 20 Bradycardia (HR < 60)
    for (let i = 0; i < 20; i++) {
        const hr = 35 + Math.random() * 25;
        const rr_regularity = 88 + Math.random() * 10;
        const rr_std = 8 + Math.random() * 20;
        const st_deviation = -0.05 + Math.random() * 0.1;
        const pr_interval = 140 + Math.random() * 60;
        const qrs_duration = 80 + Math.random() * 30;
        const qtc = 400 + Math.random() * 60;
        const p_amplitude = 0.1 + Math.random() * 0.12;
        const t_inversion = Math.random() < 0.1 ? 1 : 0;
        samples.push({ hr, rr_regularity, rr_std, st_deviation, pr_interval, qrs_duration, qtc, p_amplitude, t_inversion, label: 1, label_name: 'bradycardia' });
    }

    // 20 Tachycardia (HR > 100)
    for (let i = 0; i < 20; i++) {
        const hr = 100 + Math.random() * 60;
        const rr_regularity = 85 + Math.random() * 12;
        const rr_std = 10 + Math.random() * 25;
        const st_deviation = -0.1 + Math.random() * 0.2;
        const pr_interval = 100 + Math.random() * 40;
        const qrs_duration = 80 + Math.random() * 40;
        const qtc = 350 + Math.random() * 80;
        const p_amplitude = 0.08 + Math.random() * 0.15;
        const t_inversion = Math.random() < 0.15 ? 1 : 0;
        samples.push({ hr, rr_regularity, rr_std, st_deviation, pr_interval, qrs_duration, qtc, p_amplitude, t_inversion, label: 2, label_name: 'tachycardia' });
    }

    // 15 Arrhythmia / AFib (Irregular RR, low regularity)
    for (let i = 0; i < 15; i++) {
        const hr = 55 + Math.random() * 80;
        const rr_regularity = 40 + Math.random() * 40;
        const rr_std = 50 + Math.random() * 60;
        const st_deviation = -0.15 + Math.random() * 0.3;
        const pr_interval = Math.random() < 0.5 ? 0 : 120 + Math.random() * 100;
        const qrs_duration = 80 + Math.random() * 50;
        const qtc = 370 + Math.random() * 90;
        const p_amplitude = Math.random() < 0.4 ? 0 : 0.05 + Math.random() * 0.1;
        const t_inversion = Math.random() < 0.2 ? 1 : 0;
        samples.push({ hr, rr_regularity, rr_std, st_deviation, pr_interval, qrs_duration, qtc, p_amplitude, t_inversion, label: 3, label_name: 'arrhythmia_afib' });
    }

    // 15 ST-Elevation / Ischemia
    for (let i = 0; i < 15; i++) {
        const hr = 60 + Math.random() * 50;
        const rr_regularity = 80 + Math.random() * 15;
        const rr_std = 10 + Math.random() * 30;
        const st_deviation = 0.2 + Math.random() * 0.5;
        const pr_interval = 120 + Math.random() * 60;
        const qrs_duration = 85 + Math.random() * 40;
        const qtc = 400 + Math.random() * 80;
        const p_amplitude = 0.1 + Math.random() * 0.12;
        const t_inversion = Math.random() < 0.5 ? 1 : 0;
        samples.push({ hr, rr_regularity, rr_std, st_deviation, pr_interval, qrs_duration, qtc, p_amplitude, t_inversion, label: 4, label_name: 'st_elevation_ischemia' });
    }

    // Round all numeric values
    return samples.map(s => ({
        hr: +s.hr.toFixed(1),
        rr_regularity: +s.rr_regularity.toFixed(1),
        rr_std: +s.rr_std.toFixed(2),
        st_deviation: +s.st_deviation.toFixed(3),
        pr_interval: +s.pr_interval.toFixed(1),
        qrs_duration: +s.qrs_duration.toFixed(1),
        qtc: +s.qtc.toFixed(1),
        p_amplitude: +s.p_amplitude.toFixed(3),
        t_inversion: s.t_inversion,
        label: s.label,
        label_name: s.label_name,
    }));
}

// ─── EEG Synthetic Data ─────────────────────────────────────────────
// Labels: 0 = Alert/Focused (Beta dominant), 1 = Relaxed (Alpha dominant),
//         2 = Drowsy (Theta dominant), 3 = Deep Sleep (Delta dominant), 4 = Seizure-like (Spikes)
function generateEEGSamples() {
    const samples = [];

    // 25 Alert/Focused (Beta dominant)
    for (let i = 0; i < 25; i++) {
        const delta_pct = 5 + Math.random() * 10;
        const theta_pct = 8 + Math.random() * 12;
        const alpha_pct = 10 + Math.random() * 15;
        const beta_pct = 40 + Math.random() * 25;
        const theta_beta_ratio = theta_pct / beta_pct;
        const spike_count = Math.floor(Math.random() * 2);
        const alertness = 70 + Math.random() * 30;
        const signal_rms = 15 + Math.random() * 20;
        samples.push({ delta_pct, theta_pct, alpha_pct, beta_pct, theta_beta_ratio, spike_count, alertness, signal_rms, label: 0, label_name: 'alert_focused' });
    }

    // 25 Relaxed (Alpha dominant)
    for (let i = 0; i < 25; i++) {
        const delta_pct = 5 + Math.random() * 10;
        const theta_pct = 10 + Math.random() * 12;
        const alpha_pct = 40 + Math.random() * 25;
        const beta_pct = 8 + Math.random() * 15;
        const theta_beta_ratio = theta_pct / beta_pct;
        const spike_count = Math.floor(Math.random() * 2);
        const alertness = 40 + Math.random() * 25;
        const signal_rms = 20 + Math.random() * 25;
        samples.push({ delta_pct, theta_pct, alpha_pct, beta_pct, theta_beta_ratio, spike_count, alertness, signal_rms, label: 1, label_name: 'relaxed' });
    }

    // 20 Drowsy (Theta dominant)
    for (let i = 0; i < 20; i++) {
        const delta_pct = 10 + Math.random() * 15;
        const theta_pct = 35 + Math.random() * 25;
        const alpha_pct = 10 + Math.random() * 15;
        const beta_pct = 5 + Math.random() * 10;
        const theta_beta_ratio = theta_pct / beta_pct;
        const spike_count = Math.floor(Math.random() * 3);
        const alertness = 15 + Math.random() * 25;
        const signal_rms = 25 + Math.random() * 30;
        samples.push({ delta_pct, theta_pct, alpha_pct, beta_pct, theta_beta_ratio, spike_count, alertness, signal_rms, label: 2, label_name: 'drowsy' });
    }

    // 15 Deep Sleep (Delta dominant)
    for (let i = 0; i < 15; i++) {
        const delta_pct = 50 + Math.random() * 30;
        const theta_pct = 8 + Math.random() * 15;
        const alpha_pct = 2 + Math.random() * 8;
        const beta_pct = 2 + Math.random() * 5;
        const theta_beta_ratio = theta_pct / beta_pct;
        const spike_count = Math.floor(Math.random() * 2);
        const alertness = 2 + Math.random() * 12;
        const signal_rms = 40 + Math.random() * 40;
        samples.push({ delta_pct, theta_pct, alpha_pct, beta_pct, theta_beta_ratio, spike_count, alertness, signal_rms, label: 3, label_name: 'deep_sleep' });
    }

    // 15 Seizure-like (High spikes)
    for (let i = 0; i < 15; i++) {
        const delta_pct = 15 + Math.random() * 20;
        const theta_pct = 15 + Math.random() * 20;
        const alpha_pct = 10 + Math.random() * 15;
        const beta_pct = 15 + Math.random() * 20;
        const theta_beta_ratio = theta_pct / beta_pct;
        const spike_count = 15 + Math.floor(Math.random() * 40);
        const alertness = 20 + Math.random() * 40;
        const signal_rms = 60 + Math.random() * 80;
        samples.push({ delta_pct, theta_pct, alpha_pct, beta_pct, theta_beta_ratio, spike_count, alertness, signal_rms, label: 4, label_name: 'seizure_activity' });
    }

    return samples.map(s => ({
        delta_pct: +s.delta_pct.toFixed(1),
        theta_pct: +s.theta_pct.toFixed(1),
        alpha_pct: +s.alpha_pct.toFixed(1),
        beta_pct: +s.beta_pct.toFixed(1),
        theta_beta_ratio: +s.theta_beta_ratio.toFixed(3),
        spike_count: s.spike_count,
        alertness: +s.alertness.toFixed(1),
        signal_rms: +s.signal_rms.toFixed(1),
        label: s.label,
        label_name: s.label_name,
    }));
}

// ────────────────────────────────────────────────────────────────────
// Also generate the combined stress model dataset (backward compatible)
function generateStressData() {
    const data = [];
    // 50 Normal (label 0)
    for (let i = 0; i < 50; i++) {
        data.push({
            hr: 60 + Math.random() * 30,
            hrv: 40 + Math.random() * 40,
            rmssd: 35 + Math.random() * 35,
            sdnn: 40 + Math.random() * 40,
            lf_hf: 0.5 + Math.random() * 1.5,
            eeg_alpha: 30 + Math.random() * 40,
            label: 0,
        });
    }
    // 50 Stressed/Burnout (label 1)
    for (let i = 0; i < 50; i++) {
        data.push({
            hr: 90 + Math.random() * 40,
            hrv: 10 + Math.random() * 20,
            rmssd: 8 + Math.random() * 20,
            sdnn: 10 + Math.random() * 20,
            lf_hf: 2.5 + Math.random() * 3,
            eeg_alpha: 5 + Math.random() * 20,
            label: 1,
        });
    }
    return data.map(d => ({
        hr: +d.hr.toFixed(1),
        hrv: +d.hrv.toFixed(1),
        rmssd: +d.rmssd.toFixed(1),
        sdnn: +d.sdnn.toFixed(1),
        lf_hf: +d.lf_hf.toFixed(2),
        eeg_alpha: +d.eeg_alpha.toFixed(1),
        label: d.label,
    }));
}

// ─── Write Files ─────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'public', 'datasets');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const ecgData = generateECGSamples();
const eegData = generateEEGSamples();
const stressData = generateStressData();

fs.writeFileSync(path.join(outDir, 'ecg_training_data.json'), JSON.stringify(ecgData, null, 2));
fs.writeFileSync(path.join(outDir, 'eeg_training_data.json'), JSON.stringify(eegData, null, 2));
fs.writeFileSync(path.join(outDir, 'stress_model_data.json'), JSON.stringify(stressData, null, 2));

console.log(`✅ Generated ${ecgData.length} ECG training samples → ecg_training_data.json`);
console.log(`✅ Generated ${eegData.length} EEG training samples → eeg_training_data.json`);
console.log(`✅ Generated ${stressData.length} stress model samples → stress_model_data.json`);
console.log(`📁 Output: ${outDir}`);

import * as tf from '@tensorflow/tfjs';

// ─── Feature Interfaces ──────────────────────────────────────────────
export interface ECGFeatures {
    hr: number;
    rr_regularity: number;
    rr_std: number;
    st_deviation: number;
    pr_interval: number;
    qrs_duration: number;
    qtc: number;
    p_amplitude: number;
    t_inversion: number;
}

export interface EEGFeatures {
    delta_pct: number;
    theta_pct: number;
    alpha_pct: number;
    beta_pct: number;
    theta_beta_ratio: number;
    spike_count: number;
    alertness: number;
    signal_rms: number;
}

export interface StressFeatures {
    hr: number;
    hrv: number;
    rmssd: number;
    sdnn: number;
    lf_hf: number;
    eeg_alpha: number;
}

// ─── ECG Label Map ───────────────────────────────────────────────────
export const ECG_LABELS = ['Normal Sinus', 'Bradycardia', 'Tachycardia', 'Arrhythmia / AFib', 'ST-Elevation (Ischemia)'];
export const EEG_LABELS = ['Alert / Focused', 'Relaxed', 'Drowsy', 'Deep Sleep', 'Seizure Activity'];

// ─── ML Service ──────────────────────────────────────────────────────
export class MLService {
    private stressModel: tf.LayersModel | null = null;
    private ecgModel: tf.LayersModel | null = null;
    private eegModel: tf.LayersModel | null = null;
    private isTraining = false;
    private normalizationParams: { min: number[], max: number[] } | null = null;
    private ecgNormParams: { min: number[], max: number[] } | null = null;
    private eegNormParams: { min: number[], max: number[] } | null = null;

    // ─── Load from localStorage ──────────────────────────────────
    async loadModel() {
        try {
            this.stressModel = await tf.loadLayersModel('localstorage://stress-model');
            const params = localStorage.getItem('normalizationParams');
            if (params) this.normalizationParams = JSON.parse(params);
            console.log('Stress model loaded');
        } catch (e) { console.log('No stress model found'); }

        try {
            this.ecgModel = await tf.loadLayersModel('localstorage://ecg-classifier');
            const p = localStorage.getItem('ecgNormParams');
            if (p) this.ecgNormParams = JSON.parse(p);
            console.log('ECG classifier loaded');
        } catch (e) { console.log('No ECG classifier found'); }

        try {
            this.eegModel = await tf.loadLayersModel('localstorage://eeg-classifier');
            const p = localStorage.getItem('eegNormParams');
            if (p) this.eegNormParams = JSON.parse(p);
            console.log('EEG classifier loaded');
        } catch (e) { console.log('No EEG classifier found'); }

        return !!(this.stressModel || this.ecgModel || this.eegModel);
    }

    // ─── Train ECG Classifier (5 classes) ────────────────────────
    async trainECGModel(onEpochEnd?: (epoch: number, logs: tf.Logs) => void) {
        if (this.isTraining) return { success: false };
        this.isTraining = true;
        try {
            const res = await fetch('/datasets/ecg_training_data.json');
            const raw = await res.json();

            const featureKeys = ['hr', 'rr_regularity', 'rr_std', 'st_deviation', 'pr_interval', 'qrs_duration', 'qtc', 'p_amplitude', 't_inversion'];
            const inputs = raw.map((d: any) => featureKeys.map(k => d[k]));
            const labels = raw.map((d: any) => d.label);

            const inputT = tf.tensor2d(inputs);
            const labelT = tf.oneHot(tf.tensor1d(labels, 'int32'), 5);
            const min = inputT.min(0); const max = inputT.max(0);
            const norm = inputT.sub(min).div(max.sub(min).add(1e-7));

            this.ecgNormParams = { min: await min.array() as number[], max: await max.array() as number[] };
            localStorage.setItem('ecgNormParams', JSON.stringify(this.ecgNormParams));

            const model = tf.sequential();
            model.add(tf.layers.dense({ inputShape: [9], units: 32, activation: 'relu' }));
            model.add(tf.layers.dropout({ rate: 0.2 }));
            model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
            model.add(tf.layers.dense({ units: 5, activation: 'softmax' }));
            model.compile({ optimizer: tf.train.adam(0.005), loss: 'categoricalCrossentropy', metrics: ['accuracy'] });

            await model.fit(norm, labelT, {
                epochs: 80, batchSize: 8, shuffle: true,
                callbacks: { onEpochEnd: (e, l) => { if (onEpochEnd && l) onEpochEnd(e, l); } }
            });

            this.ecgModel = model;
            await model.save('localstorage://ecg-classifier');
            inputT.dispose(); labelT.dispose(); norm.dispose(); min.dispose(); max.dispose();
            return { success: true };
        } catch (error) { console.error('ECG training failed:', error); return { success: false, error }; }
        finally { this.isTraining = false; }
    }

    // ─── Train EEG Classifier (5 classes) ────────────────────────
    async trainEEGModel(onEpochEnd?: (epoch: number, logs: tf.Logs) => void) {
        if (this.isTraining) return { success: false };
        this.isTraining = true;
        try {
            const res = await fetch('/datasets/eeg_training_data.json');
            const raw = await res.json();

            const featureKeys = ['delta_pct', 'theta_pct', 'alpha_pct', 'beta_pct', 'theta_beta_ratio', 'spike_count', 'alertness', 'signal_rms'];
            const inputs = raw.map((d: any) => featureKeys.map(k => d[k]));
            const labels = raw.map((d: any) => d.label);

            const inputT = tf.tensor2d(inputs);
            const labelT = tf.oneHot(tf.tensor1d(labels, 'int32'), 5);
            const min = inputT.min(0); const max = inputT.max(0);
            const norm = inputT.sub(min).div(max.sub(min).add(1e-7));

            this.eegNormParams = { min: await min.array() as number[], max: await max.array() as number[] };
            localStorage.setItem('eegNormParams', JSON.stringify(this.eegNormParams));

            const model = tf.sequential();
            model.add(tf.layers.dense({ inputShape: [8], units: 32, activation: 'relu' }));
            model.add(tf.layers.dropout({ rate: 0.2 }));
            model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
            model.add(tf.layers.dense({ units: 5, activation: 'softmax' }));
            model.compile({ optimizer: tf.train.adam(0.005), loss: 'categoricalCrossentropy', metrics: ['accuracy'] });

            await model.fit(norm, labelT, {
                epochs: 80, batchSize: 8, shuffle: true,
                callbacks: { onEpochEnd: (e, l) => { if (onEpochEnd && l) onEpochEnd(e, l); } }
            });

            this.eegModel = model;
            await model.save('localstorage://eeg-classifier');
            inputT.dispose(); labelT.dispose(); norm.dispose(); min.dispose(); max.dispose();
            return { success: true };
        } catch (error) { console.error('EEG training failed:', error); return { success: false, error }; }
        finally { this.isTraining = false; }
    }

    // ─── Train Stress Model (backward compat) ────────────────────
    async trainModel(onEpochEnd?: (epoch: number, logs: tf.Logs) => void) {
        if (this.isTraining) return;
        this.isTraining = true;
        try {
            const response = await fetch('/datasets/stress_model_data.json');
            const rawData = await response.json();
            const inputs = rawData.map((d: any) => [d.hr, d.hrv, d.rmssd, d.sdnn, d.lf_hf, d.eeg_alpha]);
            const labels = rawData.map((d: any) => d.label);
            const inputTensor = tf.tensor2d(inputs);
            const labelTensor = tf.tensor2d(labels, [labels.length, 1]);
            const min = inputTensor.min(0); const max = inputTensor.max(0);
            const normalizedInputs = inputTensor.sub(min).div(max.sub(min));
            this.normalizationParams = { min: await min.array() as number[], max: await max.array() as number[] };
            localStorage.setItem('normalizationParams', JSON.stringify(this.normalizationParams));

            const model = tf.sequential();
            model.add(tf.layers.dense({ inputShape: [6], units: 16, activation: 'relu' }));
            model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
            model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
            model.compile({ optimizer: tf.train.adam(0.01), loss: 'binaryCrossentropy', metrics: ['accuracy'] });
            await model.fit(normalizedInputs, labelTensor, {
                epochs: 50, batchSize: 4, shuffle: true,
                callbacks: { onEpochEnd: (epoch, logs) => { if (onEpochEnd && logs) onEpochEnd(epoch, logs); } }
            });
            this.stressModel = model;
            await model.save('localstorage://stress-model');
            inputTensor.dispose(); labelTensor.dispose(); normalizedInputs.dispose(); min.dispose(); max.dispose();
            return { success: true };
        } catch (error) { return { success: false, error }; }
        finally { this.isTraining = false; }
    }

    // ─── Predict ECG class ───────────────────────────────────────
    predictECG(features: ECGFeatures): { label: number; name: string; confidence: number; probabilities: number[] } {
        if (!this.ecgModel || !this.ecgNormParams) return { label: -1, name: 'Model not trained', confidence: 0, probabilities: [] };
        return tf.tidy(() => {
            const arr = [features.hr, features.rr_regularity, features.rr_std, features.st_deviation, features.pr_interval, features.qrs_duration, features.qtc, features.p_amplitude, features.t_inversion];
            const input = tf.tensor2d([arr]);
            const min = tf.tensor1d(this.ecgNormParams!.min);
            const max = tf.tensor1d(this.ecgNormParams!.max);
            const norm = input.sub(min).div(max.sub(min).add(1e-7));
            const pred = this.ecgModel!.predict(norm) as tf.Tensor;
            const probs = Array.from(pred.dataSync());
            const label = probs.indexOf(Math.max(...probs));
            return { label, name: ECG_LABELS[label], confidence: probs[label], probabilities: probs };
        });
    }

    // ─── Predict EEG class ───────────────────────────────────────
    predictEEG(features: EEGFeatures): { label: number; name: string; confidence: number; probabilities: number[] } {
        if (!this.eegModel || !this.eegNormParams) return { label: -1, name: 'Model not trained', confidence: 0, probabilities: [] };
        return tf.tidy(() => {
            const arr = [features.delta_pct, features.theta_pct, features.alpha_pct, features.beta_pct, features.theta_beta_ratio, features.spike_count, features.alertness, features.signal_rms];
            const input = tf.tensor2d([arr]);
            const min = tf.tensor1d(this.eegNormParams!.min);
            const max = tf.tensor1d(this.eegNormParams!.max);
            const norm = input.sub(min).div(max.sub(min).add(1e-7));
            const pred = this.eegModel!.predict(norm) as tf.Tensor;
            const probs = Array.from(pred.dataSync());
            const label = probs.indexOf(Math.max(...probs));
            return { label, name: EEG_LABELS[label], confidence: probs[label], probabilities: probs };
        });
    }

    // ─── Stress prediction (backward compat) ─────────────────────
    predict(features: StressFeatures): number {
        if (!this.stressModel || !this.normalizationParams) return 0;
        return tf.tidy(() => {
            const input = tf.tensor2d([[features.hr, features.hrv, features.rmssd, features.sdnn, features.lf_hf, features.eeg_alpha]]);
            const min = tf.tensor1d(this.normalizationParams!.min);
            const max = tf.tensor1d(this.normalizationParams!.max);
            const normalized = input.sub(min).div(max.sub(min));
            const prediction = this.stressModel!.predict(normalized) as tf.Tensor;
            return (prediction.dataSync()[0]);
        });
    }

    get isECGModelReady() { return !!this.ecgModel; }
    get isEEGModelReady() { return !!this.eegModel; }
    get isStressModelReady() { return !!this.stressModel; }
    get training() { return this.isTraining; }
}

export const mlService = new MLService();

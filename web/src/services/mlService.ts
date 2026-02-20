import * as tf from '@tensorflow/tfjs';

// Features: HR, HRV, RMSSD, SDNN, LF/HF, EMG_RMS
export interface StressFeatures {
    hr: number;
    hrv: number;
    rmssd: number;
    sdnn: number;
    lf_hf: number;
    emg_rms: number;
}

export class MLService {
    private model: tf.LayersModel | null = null;
    private isTraining = false;
    private normalizationParams: { min: number[], max: number[] } | null = null;

    async loadModel() {
        try {
            this.model = await tf.loadLayersModel('localstorage://stress-model');
            const params = localStorage.getItem('normalizationParams');
            if (params) this.normalizationParams = JSON.parse(params);
            console.log('Model loaded from local storage');
            return true;
        } catch (e) {
            console.log('No saved model found');
            return false;
        }
    }

    async trainModel(onEpochEnd?: (epoch: number, logs: tf.Logs) => void) {
        if (this.isTraining) return;
        this.isTraining = true;

        try {
            // 1. Fetch synthetic "online" dataset
            const response = await fetch('/datasets/stress_model_data.json');
            const rawData = await response.json();

            // 2. Prepare tensors
            const inputs = rawData.map((d: any) => [d.hr, d.hrv, d.rmssd, d.sdnn, d.lf_hf, d.emg_rms]);
            const labels = rawData.map((d: any) => d.label);

            const inputTensor = tf.tensor2d(inputs);
            const labelTensor = tf.tensor2d(labels, [labels.length, 1]);

            // 3. Normalize (Min-Max Scaling)
            const min = inputTensor.min(0);
            const max = inputTensor.max(0);
            const normalizedInputs = inputTensor.sub(min).div(max.sub(min));

            this.normalizationParams = {
                min: await min.array() as number[],
                max: await max.array() as number[]
            };
            localStorage.setItem('normalizationParams', JSON.stringify(this.normalizationParams));

            // 4. Define Model Architecture
            const model = tf.sequential();
            model.add(tf.layers.dense({ inputShape: [6], units: 16, activation: 'relu' }));
            model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
            model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

            model.compile({
                optimizer: tf.train.adam(0.01),
                loss: 'binaryCrossentropy',
                metrics: ['accuracy']
            });

            // 5. Train
            await model.fit(normalizedInputs, labelTensor, {
                epochs: 50,
                batchSize: 4,
                shuffle: true,
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        if (onEpochEnd && logs) onEpochEnd(epoch, logs);
                    }
                }
            });

            this.model = model;
            await model.save('localstorage://stress-model');

            // Cleanup tensors
            inputTensor.dispose();
            labelTensor.dispose();
            normalizedInputs.dispose();
            min.dispose();
            max.dispose();

            return { success: true };
        } catch (error) {
            console.error('Training failed:', error);
            return { success: false, error };
        } finally {
            this.isTraining = false;
        }
    }

    predict(features: StressFeatures): number {
        if (!this.model || !this.normalizationParams) return 0;

        return tf.tidy(() => {
            const input = tf.tensor2d([[
                features.hr, features.hrv, features.rmssd,
                features.sdnn, features.lf_hf, features.emg_rms
            ]]);

            const min = tf.tensor1d(this.normalizationParams!.min);
            const max = tf.tensor1d(this.normalizationParams!.max);

            // Normalize input
            const normalized = input.sub(min).div(max.sub(min));

            // Predict
            const prediction = this.model!.predict(normalized) as tf.Tensor;
            return (prediction.dataSync()[0]);
        });
    }
}

export const mlService = new MLService();

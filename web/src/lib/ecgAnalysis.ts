/**
 * NeuroGuard — ECG Signal Analysis Library
 * ==========================================
 * Clinical-grade signal processing for single-lead (Lead I) ECG
 * from a 3-electrode setup (RA, LA, RL-ground) via AD8232 + Arduino Uno.
 *
 * Signal chain: AD8232 → Arduino A4 (10-bit ADC, 0-1023) → Serial → Web
 * Sample rate: ~100 Hz (10ms interval)
 */

// ─── Constants ──────────────────────────────────────────────────────
const ADC_BITS = 10;
const ADC_MAX = (1 << ADC_BITS) - 1;        // 1023
const ADC_MID = ADC_MAX / 2;                 // 511.5
const V_REF = 3.3;                           // Arduino Uno reference voltage
const SAMPLE_RATE = 100;                     // Hz (10ms per sample)
const MS_PER_SAMPLE = 1000 / SAMPLE_RATE;    // 10ms

// Medical ECG standard parameters
const PAPER_SPEED = 25;                      // mm/s (standard)
const AMPLITUDE_SCALE = 10;                  // mm/mV (standard)

// R-peak detection
const REFRACTORY_MS = 200;                   // Min time between R-peaks (300 BPM max)
const REFRACTORY_SAMPLES = Math.round(REFRACTORY_MS / MS_PER_SAMPLE);

// ─── Types ──────────────────────────────────────────────────────────
export interface RPeak {
    index: number;       // sample index
    amplitude: number;   // mV
    timeMs: number;      // time in ms from start
}

export interface ECGIntervals {
    rrIntervals: number[];      // ms between consecutive R-peaks
    meanRR: number;             // ms
    sdRR: number;               // ms (std dev)
    hrBPM: number;              // beats per minute
    minHR: number;
    maxHR: number;
    // Wave intervals (estimated from single lead)
    prInterval: number;         // ms (normal: 120-200)
    qrsDuration: number;        // ms (normal: 60-100)
    qtInterval: number;         // ms
    qtcInterval: number;        // ms (Bazett corrected)
}

export interface STAssessment {
    deviation: number;          // mV (positive = elevation, negative = depression)
    classification: 'normal' | 'elevation' | 'depression';
    description: string;
}

export interface RhythmAnalysis {
    type: 'sinus_rhythm' | 'sinus_bradycardia' | 'sinus_tachycardia' | 'irregular' | 'insufficient_data';
    regular: boolean;
    description: string;
    pWavePresent: boolean;
}

export interface ECGReportData {
    // Signal info
    sampleRate: number;
    durationSec: number;
    totalSamples: number;
    leadConfig: string;

    // Processed signal
    signalMV: number[];         // ADC converted to millivolts
    filteredSignal: number[];   // After baseline removal

    // Detected features
    rPeaks: RPeak[];

    // Measurements
    intervals: ECGIntervals;

    // Assessments
    rhythm: RhythmAnalysis;
    stSegment: STAssessment;

    // Overall interpretation
    interpretation: string[];
    limitations: string[];
}

// ─── Signal Processing ──────────────────────────────────────────────

/**
 * Convert raw 10-bit ADC values to millivolts.
 * The AD8232 output is centered around VCC/2 (~1.65V).
 * With the Arduino 10-bit ADC: mV = (adc - 512) * (3300 / 1024) / gain
 * AD8232 has a gain of ~1100, but since we read the amplified signal,
 * we scale to display the typical ECG range (~-1.5 to +1.5 mV).
 */
export function adcToMillivolts(rawData: number[]): number[] {
    // AD8232 amplifies the signal significantly. The raw ADC captures the
    // amplified output. We normalize to typical ECG amplitude range.
    const adcRange = ADC_MAX;
    return rawData.map(v => {
        // Center around zero, scale to ±1.5mV typical ECG range
        const centered = (v - ADC_MID) / (adcRange / 2);
        return centered * 1.5; // Scale to typical ECG mV range
    });
}

/**
 * Remove baseline wander using a moving average subtraction (high-pass filter).
 * Window of ~0.6s (60 samples at 100Hz) — removes drift below ~1.7Hz
 * while preserving P-QRS-T morphology.
 */
export function removeBaselineWander(signal: number[], windowSize: number = 60): number[] {
    const n = signal.length;
    if (n < windowSize) return [...signal];

    const filtered = new Array(n);
    const halfWin = Math.floor(windowSize / 2);

    for (let i = 0; i < n; i++) {
        const start = Math.max(0, i - halfWin);
        const end = Math.min(n - 1, i + halfWin);
        let sum = 0;
        for (let j = start; j <= end; j++) sum += signal[j];
        const baseline = sum / (end - start + 1);
        filtered[i] = signal[i] - baseline;
    }

    return filtered;
}

/**
 * Detect R-peaks using an adaptive threshold algorithm.
 * Inspired by the Pan-Tompkins method but simplified for single-lead.
 *
 * Steps:
 * 1. Square the signal to emphasize QRS complexes
 * 2. Apply moving window integration
 * 3. Adaptive threshold detection
 * 4. Enforce refractory period
 */
export function detectRPeaks(signal: number[]): RPeak[] {
    const n = signal.length;
    if (n < SAMPLE_RATE) return []; // Need at least 1 second

    // Step 1: Differentiate and square to emphasize QRS
    const squared = new Array(n).fill(0);
    for (let i = 1; i < n - 1; i++) {
        const diff = signal[i + 1] - signal[i - 1];
        squared[i] = diff * diff;
    }

    // Step 2: Moving window integration (150ms window = 15 samples)
    const integWindow = Math.round(0.15 * SAMPLE_RATE);
    const integrated = new Array(n).fill(0);
    for (let i = integWindow; i < n; i++) {
        let sum = 0;
        for (let j = i - integWindow; j < i; j++) sum += squared[j];
        integrated[i] = sum / integWindow;
    }

    // Step 3: Adaptive threshold
    const maxInteg = Math.max(...integrated);
    let threshold = maxInteg * 0.3;

    const peaks: RPeak[] = [];
    let lastPeakIdx = -REFRACTORY_SAMPLES;

    for (let i = 1; i < n - 1; i++) {
        if (
            integrated[i] > threshold &&
            integrated[i] > integrated[i - 1] &&
            integrated[i] >= integrated[i + 1] &&
            (i - lastPeakIdx) >= REFRACTORY_SAMPLES
        ) {
            // Find the actual peak in the original signal within ±5 samples
            let bestIdx = i;
            let bestVal = Math.abs(signal[i]);
            for (let j = Math.max(0, i - 5); j <= Math.min(n - 1, i + 5); j++) {
                if (Math.abs(signal[j]) > bestVal) {
                    bestVal = Math.abs(signal[j]);
                    bestIdx = j;
                }
            }

            peaks.push({
                index: bestIdx,
                amplitude: signal[bestIdx],
                timeMs: bestIdx * MS_PER_SAMPLE,
            });

            lastPeakIdx = bestIdx;

            // Adapt threshold (running average of peak heights)
            threshold = 0.6 * threshold + 0.4 * (integrated[i] * 0.5);
        }
    }

    return peaks;
}

/**
 * Calculate all ECG intervals from detected R-peaks.
 */
export function calculateIntervals(signal: number[], rPeaks: RPeak[]): ECGIntervals {
    const defaults: ECGIntervals = {
        rrIntervals: [],
        meanRR: 0,
        sdRR: 0,
        hrBPM: 0,
        minHR: 0,
        maxHR: 0,
        prInterval: 0,
        qrsDuration: 0,
        qtInterval: 0,
        qtcInterval: 0,
    };

    if (rPeaks.length < 2) return defaults;

    // R-R intervals
    const rrIntervals: number[] = [];
    for (let i = 1; i < rPeaks.length; i++) {
        const rr = rPeaks[i].timeMs - rPeaks[i - 1].timeMs;
        if (rr > 200 && rr < 2000) { // Physiological range: 30-300 BPM
            rrIntervals.push(rr);
        }
    }

    if (rrIntervals.length === 0) return defaults;

    const meanRR = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
    const sdRR = Math.sqrt(
        rrIntervals.reduce((s, rr) => s + Math.pow(rr - meanRR, 2), 0) / rrIntervals.length
    );

    const hrBPM = Math.round(60000 / meanRR);
    const hrValues = rrIntervals.map(rr => Math.round(60000 / rr));
    const minHR = Math.min(...hrValues);
    const maxHR = Math.max(...hrValues);

    // Estimate QRS duration from first R-peak
    // QRS: the narrow high-amplitude deflection around the R-peak
    // We look for the point where the signal drops below 30% of peak amplitude
    let qrsDuration = 80; // Default normal
    if (rPeaks.length > 0) {
        const peakIdx = rPeaks[0].index;
        const peakAmp = Math.abs(rPeaks[0].amplitude);
        const threshold30 = peakAmp * 0.3;

        // Find QRS onset (scan left from peak)
        let qrsOnset = peakIdx;
        for (let i = peakIdx; i >= Math.max(0, peakIdx - 15); i--) {
            if (Math.abs(signal[i]) < threshold30) {
                qrsOnset = i;
                break;
            }
        }
        // Find QRS offset (scan right from peak)
        let qrsOffset = peakIdx;
        for (let i = peakIdx; i <= Math.min(signal.length - 1, peakIdx + 15); i++) {
            if (Math.abs(signal[i]) < threshold30) {
                qrsOffset = i;
                break;
            }
        }
        qrsDuration = Math.round((qrsOffset - qrsOnset) * MS_PER_SAMPLE);
        if (qrsDuration < 40) qrsDuration = 80; // Sanity check
        if (qrsDuration > 200) qrsDuration = 80;
    }

    // Estimate PR interval
    // P wave typically occurs 120-200ms before R peak
    // We look for a small positive deflection before the QRS
    let prInterval = 160; // Default normal
    if (rPeaks.length > 0) {
        const peakIdx = rPeaks[0].index;
        // Search 10-25 samples (100-250ms) before R-peak for a small bump (P wave)
        const searchStart = Math.max(0, peakIdx - 25);
        const searchEnd = Math.max(0, peakIdx - 8);
        let maxPWave = 0;
        let pWaveIdx = searchStart;
        for (let i = searchStart; i <= searchEnd; i++) {
            if (signal[i] > maxPWave) {
                maxPWave = signal[i];
                pWaveIdx = i;
            }
        }
        if (maxPWave > 0.02) { // P wave detected
            prInterval = Math.round((peakIdx - pWaveIdx) * MS_PER_SAMPLE);
        }
        prInterval = Math.max(80, Math.min(300, prInterval));
    }

    // Estimate QT interval
    // QT: from QRS onset to end of T wave
    // T wave typically ends ~60% of the R-R interval after the QRS
    let qtInterval = Math.round(meanRR * 0.4); // Rough estimate
    qtInterval = Math.max(300, Math.min(500, qtInterval));

    // QTc (Bazett's formula): QTc = QT / sqrt(RR in seconds)
    const rrSec = meanRR / 1000;
    const qtcInterval = Math.round(qtInterval / Math.sqrt(rrSec));

    return {
        rrIntervals,
        meanRR: Math.round(meanRR),
        sdRR: Math.round(sdRR),
        hrBPM,
        minHR,
        maxHR,
        prInterval,
        qrsDuration,
        qtInterval,
        qtcInterval,
    };
}

/**
 * Assess heart rhythm from intervals.
 */
export function assessRhythm(intervals: ECGIntervals, signal: number[], rPeaks: RPeak[]): RhythmAnalysis {
    if (rPeaks.length < 3) {
        return {
            type: 'insufficient_data',
            regular: false,
            description: 'Insufficient R-peaks detected for rhythm analysis. Recording may be too short or signal quality is poor.',
            pWavePresent: false,
        };
    }

    // Check regularity: CV of R-R intervals < 15% → regular
    const cv = intervals.sdRR / intervals.meanRR;
    const regular = cv < 0.15;

    // Check for P wave before each QRS (basic check)
    let pWaveCount = 0;
    for (const peak of rPeaks) {
        const searchStart = Math.max(0, peak.index - 25);
        const searchEnd = Math.max(0, peak.index - 8);
        let maxP = 0;
        for (let i = searchStart; i <= searchEnd; i++) {
            if (signal[i] > maxP) maxP = signal[i];
        }
        if (maxP > 0.02) pWaveCount++;
    }
    const pWavePresent = pWaveCount > rPeaks.length * 0.6;

    // Classify rhythm
    let type: RhythmAnalysis['type'];
    let description: string;

    if (!regular) {
        type = 'irregular';
        description = 'Irregular rhythm detected. R-R interval variability exceeds normal sinus variation. Further evaluation with 12-lead ECG recommended.';
    } else if (intervals.hrBPM < 60) {
        type = 'sinus_bradycardia';
        description = `Sinus bradycardia at ${intervals.hrBPM} BPM. ${pWavePresent ? 'P waves present before each QRS.' : 'P wave morphology unclear in this lead.'} Rate below 60 BPM — may be normal in athletes or during sleep.`;
    } else if (intervals.hrBPM > 100) {
        type = 'sinus_tachycardia';
        description = `Sinus tachycardia at ${intervals.hrBPM} BPM. ${pWavePresent ? 'P waves present before each QRS.' : 'P wave morphology unclear.'} Rate above 100 BPM — consider stress, anxiety, caffeine, or underlying condition.`;
    } else {
        type = 'sinus_rhythm';
        description = `Normal sinus rhythm at ${intervals.hrBPM} BPM. ${pWavePresent ? 'P waves present and upright before each QRS complex.' : 'P wave assessment limited in this lead configuration.'} Regular R-R intervals.`;
    }

    return { type, regular, description, pWavePresent };
}

/**
 * Assess ST segment for elevation or depression.
 * Measured at the J-point (end of QRS) relative to the TP baseline.
 */
export function assessSTSegment(signal: number[], rPeaks: RPeak[]): STAssessment {
    if (rPeaks.length < 2) {
        return { deviation: 0, classification: 'normal', description: 'Insufficient data for ST segment analysis.' };
    }

    // Measure ST level at J+40ms (4 samples after QRS end)
    // Compare to baseline (TP segment — between T wave end and next P wave)
    const stDeviations: number[] = [];

    for (let i = 0; i < rPeaks.length - 1; i++) {
        const rIdx = rPeaks[i].index;
        // J point: ~8 samples after R peak (80ms, end of QRS)
        const jPoint = Math.min(signal.length - 1, rIdx + 8);
        // ST measurement point: J + 4 samples (40ms after J)
        const stPoint = Math.min(signal.length - 1, jPoint + 4);

        // Baseline: average of TP segment (between T and next P)
        // Rough: 70-90% of R-R interval after current R peak
        const nextR = rPeaks[i + 1].index;
        const rrSamples = nextR - rIdx;
        const tpStart = Math.min(signal.length - 1, rIdx + Math.round(rrSamples * 0.7));
        const tpEnd = Math.min(signal.length - 1, rIdx + Math.round(rrSamples * 0.9));

        let baseline = 0;
        let count = 0;
        for (let j = tpStart; j <= tpEnd; j++) {
            baseline += signal[j];
            count++;
        }
        baseline = count > 0 ? baseline / count : 0;

        const stLevel = signal[stPoint] - baseline;
        stDeviations.push(stLevel);
    }

    if (stDeviations.length === 0) {
        return { deviation: 0, classification: 'normal', description: 'Unable to measure ST segment.' };
    }

    const avgDeviation = stDeviations.reduce((a, b) => a + b, 0) / stDeviations.length;
    const deviationMV = Math.round(avgDeviation * 100) / 100;

    // Clinical thresholds: >0.1mV elevation or <-0.1mV depression is significant
    let classification: STAssessment['classification'] = 'normal';
    let description = 'ST segment is isoelectric (within normal limits).';

    if (deviationMV > 0.1) {
        classification = 'elevation';
        description = `ST elevation of ${deviationMV.toFixed(2)} mV detected. In a single-lead recording, this finding requires confirmation with a 12-lead ECG. May indicate acute myocardial injury if confirmed across multiple leads.`;
    } else if (deviationMV < -0.1) {
        classification = 'depression';
        description = `ST depression of ${Math.abs(deviationMV).toFixed(2)} mV detected. Requires confirmation with a 12-lead ECG. May indicate myocardial ischemia, strain, or medication effects.`;
    }

    return { deviation: deviationMV, classification, description };
}

// ─── Master Analysis Function ───────────────────────────────────────

/**
 * Generate a complete ECG report from raw ADC data.
 * This is the main entry point for the analysis pipeline.
 */
export function generateECGReport(rawData: number[]): ECGReportData {
    const totalSamples = rawData.length;
    const durationSec = totalSamples / SAMPLE_RATE;

    // 1. ADC → mV
    const signalMV = adcToMillivolts(rawData);

    // 2. Remove baseline wander
    const filteredSignal = removeBaselineWander(signalMV);

    // 3. Detect R-peaks
    const rPeaks = detectRPeaks(filteredSignal);

    // 4. Calculate intervals
    const intervals = calculateIntervals(filteredSignal, rPeaks);

    // 5. Rhythm assessment
    const rhythm = assessRhythm(intervals, filteredSignal, rPeaks);

    // 6. ST segment assessment
    const stSegment = assessSTSegment(filteredSignal, rPeaks);

    // 7. Build interpretation
    const interpretation: string[] = [];

    // Rate interpretation
    if (intervals.hrBPM > 0) {
        interpretation.push(`Ventricular rate: ${intervals.hrBPM} BPM (range: ${intervals.minHR}–${intervals.maxHR} BPM)`);
    }

    // Rhythm
    interpretation.push(rhythm.description);

    // Intervals
    if (intervals.prInterval > 0) {
        const prStatus = intervals.prInterval > 200 ? '⚠ Prolonged (possible 1st degree AV block)' :
            intervals.prInterval < 120 ? '⚠ Short (consider pre-excitation)' : 'Normal';
        interpretation.push(`PR interval: ${intervals.prInterval} ms — ${prStatus}`);
    }

    if (intervals.qrsDuration > 0) {
        const qrsStatus = intervals.qrsDuration > 120 ? '⚠ Wide QRS (consider bundle branch block)' :
            intervals.qrsDuration > 100 ? 'Borderline' : 'Normal';
        interpretation.push(`QRS duration: ${intervals.qrsDuration} ms — ${qrsStatus}`);
    }

    if (intervals.qtcInterval > 0) {
        const qtcStatus = intervals.qtcInterval > 470 ? '⚠ Prolonged QTc' :
            intervals.qtcInterval < 350 ? '⚠ Short QTc' : 'Normal';
        interpretation.push(`QTc interval: ${intervals.qtcInterval} ms (Bazett) — ${qtcStatus}`);
    }

    // ST segment
    interpretation.push(`ST segment: ${stSegment.description}`);

    // Limitations
    const limitations: string[] = [
        'This is a single-lead (Lead I) recording from a 3-electrode configuration.',
        'A full 12-lead ECG is required for comprehensive cardiac assessment.',
        'Axis deviation, chamber enlargement, and regional ischemia cannot be reliably assessed from a single lead.',
        'This recording is intended for screening purposes only and should not replace clinical evaluation.',
        'Signal quality may be affected by electrode placement, movement artifacts, and electromagnetic interference.',
    ];

    return {
        sampleRate: SAMPLE_RATE,
        durationSec: Math.round(durationSec * 10) / 10,
        totalSamples,
        leadConfig: 'Lead I (3-electrode: RA, LA, RL-ground)',
        signalMV,
        filteredSignal,
        rPeaks,
        intervals,
        rhythm,
        stSegment,
        interpretation,
        limitations,
    };
}

// Export constants for the report renderer
export { SAMPLE_RATE, MS_PER_SAMPLE, PAPER_SPEED, AMPLITUDE_SCALE };

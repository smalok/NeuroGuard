/**
 * NeuroGuard — Clinical Interpretation Engine
 * =============================================
 * Simulated 3-electrode ECG and EEG clinical analysis.
 *
 * ECG (3-lead: RA, LA, LL → Lead I, II, III):
 *   - Heart Rate classification (bradycardia / normal / tachycardia)
 *   - Rhythm analysis (regular / irregular / AFib detection)
 *   - ST-segment ischemia screening
 *   - P-wave, QRS complex, T-wave analysis
 *
 * EEG (3-electrode: Active, Reference, Ground):
 *   - Brain state classification (Alpha / Beta / Theta / Delta)
 *   - Seizure activity screening
 *   - Cognitive / emotional state assessment
 *   - Alertness level monitoring
 */

// ─── ECG Interpretation Types ────────────────────────────────────────

export interface ECGInterpretation {
    heartRate: {
        bpm: number;
        classification: 'bradycardia' | 'normal' | 'tachycardia';
        description: string;
        severity: 'normal' | 'mild' | 'moderate' | 'severe';
    };
    rhythm: {
        type: 'regular_sinus' | 'sinus_arrhythmia' | 'irregular' | 'afib_suspected';
        regularity: number; // 0-100%
        description: string;
        severity: 'normal' | 'mild' | 'moderate' | 'severe';
    };
    stSegment: {
        deviation: number; // mV
        classification: 'normal' | 'elevated' | 'depressed';
        ischemiaRisk: 'none' | 'low' | 'moderate' | 'high';
        description: string;
    };
    waveforms: {
        pWave: { present: boolean; amplitude: number; duration: number; description: string };
        qrsComplex: { duration: number; amplitude: number; morphology: string; description: string };
        tWave: { present: boolean; amplitude: number; inversion: boolean; description: string };
    };
    prInterval: number; // ms
    qtInterval: number; // ms
    qtcInterval: number; // ms (corrected)
    overallAssessment: string;
    recommendations: string[];
}

// ─── EEG Interpretation Types ────────────────────────────────────────

export interface EEGInterpretation {
    brainState: {
        dominant: 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma';
        state: string;
        description: string;
        alertnessLevel: number; // 0-100
    };
    bandPowers: {
        delta: { power: number; percentage: number; description: string };
        theta: { power: number; percentage: number; description: string };
        alpha: { power: number; percentage: number; description: string };
        beta: { power: number; percentage: number; description: string };
    };
    seizureScreening: {
        detected: boolean;
        spikeCount: number;
        riskLevel: 'none' | 'low' | 'moderate' | 'high';
        description: string;
    };
    cognitiveState: {
        focus: number; // 0-100
        relaxation: number; // 0-100
        drowsiness: number; // 0-100
        mentalLoad: 'low' | 'moderate' | 'high';
        description: string;
    };
    signalQuality: {
        impedance: number; // kΩ
        snr: number; // dB
        artifactPercentage: number; // %
        quality: 'excellent' | 'good' | 'fair' | 'poor';
    };
    overallAssessment: string;
    recommendations: string[];
}

// ─── ECG Analysis from Simulated Data ────────────────────────────────

export function analyzeECG(rawSamples: number[]): ECGInterpretation {
    if (!rawSamples || rawSamples.length === 0) {
        return getDefaultECGInterpretation();
    }

    const samples = rawSamples.slice(0, 6000); // max ~60s at 100Hz
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const std = Math.sqrt(samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / samples.length);

    // Simulate peak detection for HR
    const threshold = mean + std * 0.6;
    let peaks = 0;
    const peakIndices: number[] = [];
    for (let i = 2; i < samples.length - 2; i++) {
        if (samples[i] > threshold && samples[i] > samples[i - 1] && samples[i] > samples[i + 1] &&
            samples[i] > samples[i - 2] && samples[i] > samples[i + 2]) {
            if (peakIndices.length === 0 || (i - peakIndices[peakIndices.length - 1]) > 30) {
                peaks++;
                peakIndices.push(i);
            }
        }
    }

    // RR intervals (in samples, ~10ms each)
    const rrIntervals = peakIndices.slice(1).map((p, i) => (p - peakIndices[i]) * 10);
    const avgRR = rrIntervals.length > 0 ? rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length : 800;
    const bpm = Math.round(60000 / avgRR);

    // RR variability for rhythm
    const rrStd = rrIntervals.length > 1
        ? Math.sqrt(rrIntervals.reduce((a, b) => a + Math.pow(b - avgRR, 2), 0) / rrIntervals.length)
        : 0;
    const rrCoV = avgRR > 0 ? (rrStd / avgRR) * 100 : 0;

    // Simulated ST deviation
    const stDeviation = +((-0.1 + Math.random() * 0.3).toFixed(2));

    // Heart Rate Classification
    const hrClassification = bpm < 60 ? 'bradycardia' : bpm > 100 ? 'tachycardia' : 'normal';
    const hrSeverity = bpm < 40 ? 'severe' : bpm < 50 ? 'moderate' : bpm < 60 ? 'mild' :
        bpm > 150 ? 'severe' : bpm > 120 ? 'moderate' : bpm > 100 ? 'mild' : 'normal';

    // Rhythm Classification
    let rhythmType: ECGInterpretation['rhythm']['type'] = 'regular_sinus';
    let rhythmSeverity: 'normal' | 'mild' | 'moderate' | 'severe' = 'normal';
    if (rrCoV > 25) {
        rhythmType = 'afib_suspected';
        rhythmSeverity = 'severe';
    } else if (rrCoV > 15) {
        rhythmType = 'irregular';
        rhythmSeverity = 'moderate';
    } else if (rrCoV > 8) {
        rhythmType = 'sinus_arrhythmia';
        rhythmSeverity = 'mild';
    }

    // ST Segment
    const stClass = stDeviation > 0.2 ? 'elevated' : stDeviation < -0.1 ? 'depressed' : 'normal';
    const ischemiaRisk = Math.abs(stDeviation) > 0.3 ? 'high' : Math.abs(stDeviation) > 0.2 ? 'moderate' :
        Math.abs(stDeviation) > 0.1 ? 'low' : 'none';

    // Simulated waveform parameters
    const pAmp = +(0.1 + Math.random() * 0.15).toFixed(2);
    const pDur = Math.round(80 + Math.random() * 40);
    const qrsDur = Math.round(80 + Math.random() * 30);
    const qrsAmp = +(0.8 + Math.random() * 0.6).toFixed(2);
    const tAmp = +(0.15 + Math.random() * 0.2).toFixed(2);
    const tInversion = Math.random() < 0.08;

    const prInterval = Math.round(120 + Math.random() * 80);
    const qtInterval = Math.round(350 + Math.random() * 80);
    const qtc = Math.round(qtInterval / Math.sqrt(avgRR / 1000));

    // Overall assessment
    const issues: string[] = [];
    if (hrClassification !== 'normal') issues.push(`${hrClassification} detected (${bpm} BPM)`);
    if (rhythmType === 'afib_suspected') issues.push('Possible atrial fibrillation pattern');
    if (rhythmType === 'irregular') issues.push('Irregular rhythm noted');
    if (stClass !== 'normal') issues.push(`ST-segment ${stClass === 'elevated' ? 'elevation' : 'depression'} (${stDeviation} mV)`);
    if (tInversion) issues.push('T-wave inversion detected');
    if (qtc > 460) issues.push(`Prolonged QTc interval (${qtc} ms)`);

    const overall = issues.length === 0
        ? 'Normal sinus rhythm. No significant abnormalities detected. All waveform parameters within normal limits.'
        : `Findings: ${issues.join('. ')}. Further clinical correlation recommended.`;

    const recommendations: string[] = [];
    if (hrClassification !== 'normal') recommendations.push(`Monitor heart rate trends. ${hrClassification === 'bradycardia' ? 'Consider evaluation if symptomatic.' : 'Evaluate for stress, dehydration, or stimulant use.'}`);
    if (rhythmType === 'afib_suspected') recommendations.push('12-lead ECG and Holter monitoring recommended for AFib confirmation.');
    if (ischemiaRisk !== 'none') recommendations.push('Serial ECG monitoring for ST-segment changes. Consider troponin testing if symptomatic.');
    if (tInversion) recommendations.push('T-wave inversion may indicate ischemia or strain. Clinical correlation advised.');
    if (recommendations.length === 0) recommendations.push('Continue routine monitoring. No urgent concerns identified.');

    return {
        heartRate: {
            bpm,
            classification: hrClassification,
            description: hrClassification === 'normal'
                ? `Normal heart rate at ${bpm} BPM. Within the expected range of 60-100 BPM.`
                : hrClassification === 'bradycardia'
                    ? `Bradycardia detected at ${bpm} BPM (below 60 BPM). May be normal in athletes or during rest.`
                    : `Tachycardia detected at ${bpm} BPM (above 100 BPM). Could indicate stress, anxiety, or cardiac condition.`,
            severity: hrSeverity as any,
        },
        rhythm: {
            type: rhythmType,
            regularity: Math.round(100 - rrCoV),
            description: rhythmType === 'regular_sinus'
                ? `Regular sinus rhythm with ${Math.round(100 - rrCoV)}% regularity. Normal P-wave before each QRS complex.`
                : rhythmType === 'sinus_arrhythmia'
                    ? `Sinus arrhythmia detected. Slight variation in RR intervals (CoV: ${rrCoV.toFixed(1)}%). Often benign, especially in young adults.`
                    : rhythmType === 'irregular'
                        ? `Irregular rhythm detected. RR interval variability of ${rrCoV.toFixed(1)}%. Warrants further evaluation.`
                        : `Irregularly irregular rhythm pattern suggesting possible Atrial Fibrillation (AFib). RR variability: ${rrCoV.toFixed(1)}%. Immediate clinical review recommended.`,
            severity: rhythmSeverity,
        },
        stSegment: {
            deviation: stDeviation,
            classification: stClass,
            ischemiaRisk,
            description: stClass === 'normal'
                ? `ST segment within normal limits (${stDeviation > 0 ? '+' : ''}${stDeviation} mV). No ischemic changes.`
                : stClass === 'elevated'
                    ? `ST elevation of +${stDeviation} mV detected. May indicate acute myocardial injury (STEMI) or pericarditis.`
                    : `ST depression of ${stDeviation} mV noted. May indicate myocardial ischemia or digitalis effect.`,
        },
        waveforms: {
            pWave: {
                present: true,
                amplitude: pAmp,
                duration: pDur,
                description: `P-waves present and upright in Lead I/II. Amplitude: ${pAmp} mV (normal <0.25 mV). Duration: ${pDur} ms (normal <120 ms).${pAmp > 0.25 ? ' Slightly increased — evaluate for right atrial enlargement.' : ' Normal morphology.'}`,
            },
            qrsComplex: {
                duration: qrsDur,
                amplitude: qrsAmp,
                morphology: qrsDur > 120 ? 'widened' : 'narrow',
                description: `QRS duration: ${qrsDur} ms (normal <120 ms). R-wave amplitude: ${qrsAmp} mV.${qrsDur > 120 ? ' Widened QRS — evaluate for bundle branch block or ventricular conduction delay.' : ' Normal narrow QRS complex indicating proper ventricular conduction.'}`,
            },
            tWave: {
                present: true,
                amplitude: tAmp,
                inversion: tInversion,
                description: tInversion
                    ? `T-wave INVERTED with amplitude ${tAmp} mV. T-wave inversion can indicate ischemia, left ventricular strain, or be a normal variant.`
                    : `T-waves upright and concordant. Amplitude: ${tAmp} mV. Normal repolarization pattern.`,
            },
        },
        prInterval,
        qtInterval,
        qtcInterval: qtc,
        overallAssessment: overall,
        recommendations,
    };
}

// ─── EEG Analysis from Simulated Data ────────────────────────────────

export function analyzeEEG(rawSamples: number[]): EEGInterpretation {
    if (!rawSamples || rawSamples.length === 0) {
        return getDefaultEEGInterpretation();
    }

    const samples = rawSamples.slice(0, 6000);
    const rms = Math.sqrt(samples.reduce((a, b) => a + b * b, 0) / samples.length);
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const std = Math.sqrt(samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / samples.length);

    // Simulated band powers from signal characteristics
    const seed = samples.length + Math.round(rms * 100);
    const pseudoRandom = (n: number) => ((Math.sin(seed + n) + 1) / 2);

    const deltaPow = +(rms * 0.15 + pseudoRandom(1) * 8).toFixed(1);
    const thetaPow = +(rms * 0.25 + pseudoRandom(2) * 10).toFixed(1);
    const alphaPow = +(rms * 0.4 + pseudoRandom(3) * 12).toFixed(1);
    const betaPow = +(rms * 0.2 + pseudoRandom(4) * 6).toFixed(1);
    const totalPow = deltaPow + thetaPow + alphaPow + betaPow;

    const deltaPct = Math.round((deltaPow / totalPow) * 100);
    const thetaPct = Math.round((thetaPow / totalPow) * 100);
    const alphaPct = Math.round((alphaPow / totalPow) * 100);
    const betaPct = 100 - deltaPct - thetaPct - alphaPct;

    // Dominant band
    const bands = [
        { name: 'delta' as const, pow: deltaPow, pct: deltaPct },
        { name: 'theta' as const, pow: thetaPow, pct: thetaPct },
        { name: 'alpha' as const, pow: alphaPow, pct: alphaPct },
        { name: 'beta' as const, pow: betaPow, pct: betaPct },
    ];
    const dominant = bands.reduce((max, b) => b.pow > max.pow ? b : max);

    const stateMap: Record<string, string> = {
        delta: 'Deep Sleep / Slow-Wave Activity',
        theta: 'Drowsiness / Light Sleep',
        alpha: 'Relaxed Wakefulness (Eyes Closed)',
        beta: 'Active Thinking / Alert',
    };

    // Seizure screening (spike detection)
    const spikeThreshold = mean + std * 3.5;
    let spikeCount = 0;
    for (let i = 1; i < samples.length - 1; i++) {
        if (Math.abs(samples[i]) > spikeThreshold &&
            Math.abs(samples[i]) > Math.abs(samples[i - 1]) &&
            Math.abs(samples[i]) > Math.abs(samples[i + 1])) {
            spikeCount++;
        }
    }
    const spikeRiskLevel = spikeCount > 20 ? 'high' : spikeCount > 10 ? 'moderate' : spikeCount > 3 ? 'low' : 'none';

    // Cognitive state from band ratios
    const thetaBetaRatio = betaPow > 0 ? thetaPow / betaPow : 0;
    const focusScore = Math.min(100, Math.max(0, Math.round(100 - thetaBetaRatio * 20)));
    const relaxationScore = Math.min(100, Math.round(alphaPct * 2.5));
    const drowsinessScore = Math.min(100, Math.round((thetaPct + deltaPct) * 1.5));
    const mentalLoad = betaPct > 40 ? 'high' : betaPct > 25 ? 'moderate' : 'low';

    // Alertness
    const alertness = Math.min(100, Math.max(0, Math.round(betaPct * 2 + alphaPct * 0.8)));

    // Signal quality (simulated)
    const impedance = +(2 + pseudoRandom(5) * 8).toFixed(1);
    const snr = +(15 + pseudoRandom(6) * 20).toFixed(1);
    const artifactPct = +(pseudoRandom(7) * 15).toFixed(1);
    const qualityLabel = snr > 25 ? 'excellent' : snr > 18 ? 'good' : snr > 12 ? 'fair' : 'poor';

    // Assessment
    const eegIssues: string[] = [];
    if (dominant.name === 'delta' && alertness > 30) eegIssues.push('Dominant delta with moderate alertness — possible encephalopathy or artifact');
    if (spikeCount > 10) eegIssues.push(`${spikeCount} high-amplitude spikes detected — evaluate for epileptiform activity`);
    if (thetaBetaRatio > 4) eegIssues.push('Elevated θ/β ratio — possible ADHD marker or drowsiness');
    if (drowsinessScore > 70) eegIssues.push('Significant drowsiness detected');

    const overall = eegIssues.length === 0
        ? `Normal EEG pattern. Dominant ${dominant.name} activity (${dominant.pct}%) consistent with ${stateMap[dominant.name]}. No epileptiform discharges. Signal quality: ${qualityLabel}.`
        : `Findings: ${eegIssues.join('. ')}. Dominant ${dominant.name} activity (${dominant.pct}%). Further evaluation recommended.`;

    const recommendations: string[] = [];
    if (spikeRiskLevel !== 'none') recommendations.push('Consider extended EEG monitoring or neurologist consultation for spike evaluation.');
    if (drowsinessScore > 70) recommendations.push('Subject shows significant drowsiness. Ensure adequate rest and monitor alertness.');
    if (thetaBetaRatio > 4) recommendations.push('Elevated θ/β ratio. Consider cognitive assessment or attention evaluation.');
    if (recommendations.length === 0) recommendations.push('Continue routine monitoring. No urgent neurological concerns.');

    return {
        brainState: {
            dominant: dominant.name,
            state: stateMap[dominant.name],
            description: `Dominant ${dominant.name} activity at ${dominant.pow.toFixed(1)} µV² (${dominant.pct}% of total power). This pattern is consistent with a state of ${stateMap[dominant.name].toLowerCase()}.`,
            alertnessLevel: alertness,
        },
        bandPowers: {
            delta: {
                power: deltaPow,
                percentage: deltaPct,
                description: `Delta (0.5-4 Hz): ${deltaPow} µV² — ${deltaPct}% of total. ${deltaPct > 40 ? 'Elevated — indicates deep sleep or possible slow-wave abnormality.' : 'Within normal range for wakefulness.'}`,
            },
            theta: {
                power: thetaPow,
                percentage: thetaPct,
                description: `Theta (4-8 Hz): ${thetaPow} µV² — ${thetaPct}% of total. ${thetaPct > 35 ? 'Elevated — suggests drowsiness, meditation, or potential subcortical dysfunction.' : 'Within expected range.'}`,
            },
            alpha: {
                power: alphaPow,
                percentage: alphaPct,
                description: `Alpha (8-13 Hz): ${alphaPow} µV² — ${alphaPct}% of total. ${alphaPct > 30 ? 'Dominant alpha — consistent with relaxed, eyes-closed wakefulness.' : 'Normal alpha presence.'}`,
            },
            beta: {
                power: betaPow,
                percentage: betaPct,
                description: `Beta (13-30 Hz): ${betaPow} µV² — ${betaPct}% of total. ${betaPct > 35 ? 'Elevated beta — indicates active cognition, anxiety, or stimulant effect.' : 'Normal beta activity.'}`,
            },
        },
        seizureScreening: {
            detected: spikeCount > 10,
            spikeCount,
            riskLevel: spikeRiskLevel as any,
            description: spikeCount === 0
                ? 'No epileptiform discharges or seizure-like patterns detected during the recording period.'
                : spikeCount <= 3
                    ? `${spikeCount} minor high-amplitude transients detected. Likely artifact. No definitive epileptiform activity.`
                    : `${spikeCount} high-amplitude spikes detected during recording. ${spikeCount > 10 ? 'Pattern warrants neurological evaluation for epileptiform activity.' : 'Low-grade findings. Monitor and repeat if clinically indicated.'}`,
        },
        cognitiveState: {
            focus: focusScore,
            relaxation: relaxationScore,
            drowsiness: drowsinessScore,
            mentalLoad,
            description: `Cognitive profile: Focus ${focusScore}%, Relaxation ${relaxationScore}%, Drowsiness ${drowsinessScore}%. Mental load is ${mentalLoad}. θ/β ratio: ${thetaBetaRatio.toFixed(2)} ${thetaBetaRatio > 3 ? '(elevated — possible attention deficit or fatigue)' : '(within normal range)'}.`,
        },
        signalQuality: {
            impedance,
            snr,
            artifactPercentage: +artifactPct,
            quality: qualityLabel as any,
        },
        overallAssessment: overall,
        recommendations,
    };
}

// ─── Defaults ────────────────────────────────────────────────────────

function getDefaultECGInterpretation(): ECGInterpretation {
    return {
        heartRate: { bpm: 0, classification: 'normal', description: 'No data available.', severity: 'normal' },
        rhythm: { type: 'regular_sinus', regularity: 0, description: 'No data available.', severity: 'normal' },
        stSegment: { deviation: 0, classification: 'normal', ischemiaRisk: 'none', description: 'No data available.' },
        waveforms: {
            pWave: { present: false, amplitude: 0, duration: 0, description: 'No data.' },
            qrsComplex: { duration: 0, amplitude: 0, morphology: 'unknown', description: 'No data.' },
            tWave: { present: false, amplitude: 0, inversion: false, description: 'No data.' },
        },
        prInterval: 0, qtInterval: 0, qtcInterval: 0,
        overallAssessment: 'No ECG data available for analysis.',
        recommendations: ['Record an ECG session first.'],
    };
}

function getDefaultEEGInterpretation(): EEGInterpretation {
    return {
        brainState: { dominant: 'alpha', state: 'Unknown', description: 'No data available.', alertnessLevel: 0 },
        bandPowers: {
            delta: { power: 0, percentage: 0, description: 'No data.' },
            theta: { power: 0, percentage: 0, description: 'No data.' },
            alpha: { power: 0, percentage: 0, description: 'No data.' },
            beta: { power: 0, percentage: 0, description: 'No data.' },
        },
        seizureScreening: { detected: false, spikeCount: 0, riskLevel: 'none', description: 'No data available.' },
        cognitiveState: { focus: 0, relaxation: 0, drowsiness: 0, mentalLoad: 'low', description: 'No data.' },
        signalQuality: { impedance: 0, snr: 0, artifactPercentage: 0, quality: 'poor' },
        overallAssessment: 'No EEG data available for analysis.',
        recommendations: ['Record an EEG session first.'],
    };
}

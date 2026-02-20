📘 PROJECT DOCUMENTATION
🧠 NeuroGuard System
(ECG + EMG + Machine Learning + Web Dashboard)
Project Title
AI-Based Early Burnout Detection Using ECG & EMG with Web Dashboard Monitoring
Abstract
Burnout is a growing problem among students and professionals, leading to reduced productivity, mental exhaustion, and health risks. Traditional burnout detection relies only on self-reported surveys, which are subjective and often late-stage.
This project presents a low-cost, real-time burnout prediction system using:
·	ECG (Heart activity)
·	EMG (Muscle activity)
·	Machine Learning
·	Web-based monitoring dashboard
The system captures physiological stress biomarkers and predicts burnout risk before severe symptoms appear.
Problem Statement
·	Burnout is increasing among students and employees.
·	Early signs are often ignored.
·	Psychological surveys are subjective.
·	Wearables like Apple Watch are expensive.
·	Rural and low-income populations lack access to preventive monitoring.
There is a need for:
A low-cost, objective, real-time burnout prediction system.
Proposed Solution
We propose a dual biomarker system that:
·	Measures autonomic stress (via ECG)
·	Measures muscular fatigue (via EMG)
·	Uses ML to detect stress patterns
·	Displays results in a web dashboard
·	Provides early warning alerts
System Architecture
User
 → Electrodes
 → BioAmp EXG Pill
 → Arduino
 → Python Backend
 → ML Model
 → Web Dashboard
 → Alert System
Hardware Components
Component	Purpose
Arduino	Data acquisition
BioAmp EXG Pill	Signal amplification
ECG Electrodes	Heart signal collection
EMG Electrodes	Muscle signal collection
Laptop	Processing & dashboard
Physiological Concepts
🫀 ECG-Based Features
1. Heart Rate (HR)
Indicates immediate stress response.
2. HRV (Heart Rate Variability)
Variation between heartbeats.
Low HRV = Chronic stress.
3. RMSSD
Short-term recovery marker.
4. SDNN
Overall autonomic flexibility.
5. LF/HF Ratio
Sympathetic vs Parasympathetic balance.
💪 EMG-Based Features
1. RMS
Muscle contraction intensity.
2. Mean Absolute Value
Average muscle activation.
3. Median Frequency
Muscle fatigue indicator.
4. Variance
Signal stability.
Machine Learning Model
Input Features:
·	HR
·	RMSSD
·	SDNN
·	LF/HF
·	EMG RMS
·	EMG Median Frequency
·	Sleep hours (optional)
·	Mood score (optional)
Algorithm Used:
Random Forest Classifier
Why?
·	Handles nonlinear data
·	Robust to noise
·	Easy to explain to judges
·	High accuracy
 Burnout Classification
Output classes:
0 → Normal
 1 → High Stress
 2 → Burnout Risk
Web Dashboard Features
·	Real-time ECG graph
·	Real-time EMG graph
·	Stress meter gauge
·	Burnout probability score
·	7-day trend chart
·	Alert notification panel

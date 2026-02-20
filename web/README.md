<p align="center">
  <strong>🧠🛡️ NeuroGuard System</strong>
</p>

<p align="center">
  <em>AI-Powered Burnout Detection Using ECG & EMG Biosignals with Real-Time Web Dashboard</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TensorFlow.js-4.22-FF6F00?logo=tensorflow" alt="TensorFlow.js" />
  <img src="https://img.shields.io/badge/Arduino-Firmware-00979D?logo=arduino" alt="Arduino" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [System Architecture](#-system-architecture)
- [Hardware Stack](#-hardware-stack)
- [Software Stack](#-software-stack)
- [Features](#-features)
- [ML Model](#-machine-learning-model)
- [Pages & Screens](#-pages--screens)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Arduino Setup](#-arduino-setup)
- [Web Dashboard Setup](#-web-dashboard-setup)
- [Design System](#-design-system)
- [Data Flow & Pipeline](#-data-flow--pipeline)
- [API & Services](#-api--services)
- [Future Roadmap](#-future-roadmap)
- [Author](#-author)
- [License](#-license)

---

## 🔬 Overview

**NeuroGuard** is a low-cost, real-time burnout prediction system that captures physiological stress biomarkers using **ECG** (heart activity) and **EMG** (muscle activity) sensors, processes them through a **Machine Learning** classifier (Random Forest via TensorFlow.js), and displays results in a premium **real-time web dashboard**.

The system detects burnout risk **before** severe symptoms appear — using objective biosignal data instead of subjective self-reported surveys.

### Key Highlights

| Metric             | Value              |
|--------------------|--------------------|
| Bio Features       | 9 physiological    |
| Risk Classes       | 3 (Normal / High Stress / Burnout Risk) |
| Signal Latency     | < 2 seconds        |
| Sampling Rate      | ~100 Hz            |
| ML Algorithm       | Random Forest (TensorFlow.js) |
| Dashboard Pages    | 13 fully built     |

---

## 🎯 Problem Statement

- **76%** of professionals experience burnout at some point
- Late-stage detection costs **$3,400+ per employee**
- Only **23%** of burnout cases are detected early
- Traditional detection relies on **subjective surveys**
- Wearables like Apple Watch are **expensive** and inaccessible to rural/low-income populations

**Solution:** A low-cost, objective, real-time burnout prediction system using dual biomarkers (ECG + EMG) with machine learning and a web-based monitoring dashboard.

---

## 🏗️ System Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  ECG Sensor  │────▶│  BioAmp EXG Pill │────▶│   Arduino Uno   │
│  EMG Sensor  │     │  (Amplification) │     │  (A0/A1 ADC)    │
└──────────────┘     └──────────────────┘     └────────┬────────┘
                                                       │
                                              Serial (115200 baud)
                                              JSON: {"ecg":val,"emg":val}
                                                       │
                                                       ▼
                                              ┌────────────────────┐
                                              │   Web Serial API   │
                                              │   (Chrome/Edge)    │
                                              └────────┬───────────┘
                                                       │
                                              ┌────────▼───────────┐
                                              │  Next.js Dashboard │
                                              │  ┌───────────────┐ │
                                              │  │ Feature Ext.  │ │
                                              │  │ (HR, HRV,     │ │
                                              │  │  RMSSD, SDNN, │ │
                                              │  │  LF/HF, RMS)  │ │
                                              │  └──────┬────────┘ │
                                              │  ┌──────▼────────┐ │
                                              │  │ TensorFlow.js │ │
                                              │  │ ML Classifier │ │
                                              │  └──────┬────────┘ │
                                              │  ┌──────▼────────┐ │
                                              │  │  Real-time UI │ │
                                              │  │  Charts/Gauge │ │
                                              │  │  Alerts       │ │
                                              │  └───────────────┘ │
                                              └────────────────────┘
```

---

## 🔧 Hardware Stack

| Component          | Model              | Purpose                          |
|--------------------|--------------------|----------------------------------|
| Microcontroller    | Arduino Uno R3     | Signal acquisition (ADC)         |
| Signal Amplifier   | BioAmp EXG Pill    | ECG/EMG biopotential amplification |
| ECG Electrodes     | Ag/AgCl Electrodes | Heart signal collection          |
| EMG Electrodes     | Ag/AgCl Electrodes | Muscle signal collection         |
| Computer           | Any laptop/PC      | Processing & dashboard display   |
| USB Cable          | Type-B to Type-A   | Arduino ↔ Computer serial link   |

---

## 💻 Software Stack

| Layer       | Technology                 | Version  | Purpose                               |
|-------------|----------------------------|----------|---------------------------------------|
| **Firmware**| Arduino (C++)              | -        | ADC sampling, JSON serial streaming   |
| **Frontend**| Next.js                    | 16.1.6   | Dashboard framework (App Router)      |
| **UI**      | React                      | 19.2.3   | Component rendering                   |
| **Language**| TypeScript                 | 5.x      | Type-safe development                 |
| **Charts**  | Chart.js + react-chartjs-2 | 4.5.1    | Bar, Line, Doughnut charts            |
| **Waveforms** | HTML5 Canvas (custom)   | -        | Real-time ECG/EMG streaming waveforms |
| **ML**      | TensorFlow.js              | 4.22.0   | In-browser model training & inference |
| **Icons**   | Lucide React               | 0.563.0  | Modern icon system                    |
| **Serial**  | Web Serial API             | -        | Browser ↔ Arduino communication       |
| **Fonts**   | Space Grotesk, Inter, JetBrains Mono | - | Typography system              |

---

## ✨ Features

### Real-Time Monitoring
- 🫀 **Live ECG Waveform** — Streaming canvas-based heart signal visualization
- 💪 **Live EMG Waveform** — Real-time muscle activity monitoring
- 📊 **Burnout Risk Gauge** — Semi-circular gauge with 3-zone color coding
- 📈 **Vital Stat Cards** — Heart rate, HRV, RMSSD, SDNN, EMG RMS with trend indicators

### Machine Learning
- 🧠 **In-Browser ML Training** — Train the Random Forest model directly in the browser
- 🎯 **3-Class Prediction** — Normal / High Stress / Burnout Risk
- 📉 **Feature Extraction** — Automatic R-peak detection, RR-interval analysis
- 💾 **Model Persistence** — Save/load trained model via LocalStorage

### Device Connection
- 🔌 **Web Serial API** — Direct browser-to-Arduino USB communication
- 🔄 **Start/Stop Scanning** — Manual scan controls on ECG/EMG/Dashboard pages
- ⚡ **Auto-Disconnect Detection** — Handles physical USB unplugs gracefully
- 📟 **Connection Logging** — Real-time activity log on Device page

### Dashboard Features
- 🔔 **Alert System** — Severity-based alerts (Critical/Warning/Info/Success)
- 📋 **Session History** — Track trends over days/weeks
- 📊 **Health Reports** — AI-generated burnout assessments
- 👤 **User Profile** — Health baseline configuration for personalized predictions
- ⚙️ **Settings** — Theme, notifications, data management, security

---

## 🤖 Machine Learning Model

### Input Features (9 total)

#### ECG-Derived (5 features)
| Feature    | Description                        | Unit |
|------------|------------------------------------|------|
| Heart Rate | Beats per minute from RR intervals | BPM  |
| HRV        | Heart Rate Variability             | ms   |
| RMSSD      | Root Mean Square of Successive Differences | ms |
| SDNN       | Standard Deviation of NN intervals | ms   |
| LF/HF Ratio| Sympathetic/Parasympathetic balance | ratio |

#### EMG-Derived (4 features)
| Feature         | Description                 | Unit |
|-----------------|-----------------------------|------|
| RMS             | Root Mean Square amplitude  | µV   |
| Mean Abs Value  | Average muscle activation   | µV   |
| Median Frequency| Muscle fatigue indicator    | Hz   |
| Variance        | Signal stability measure    | -    |

### Output Classes
| Class | Label          | Color  | Burnout Score |
|-------|----------------|--------|---------------|
| 0     | ✅ Normal      | Green  | 0 – 39%       |
| 1     | ⚠️ High Stress | Yellow | 40 – 69%      |
| 2     | 🔴 Burnout Risk| Red    | 70 – 100%     |

### Model Training
```
Algorithm:     Neural Network (Dense layers) via TensorFlow.js
Architecture:  Input(6) → Dense(16, ReLU) → Dense(8, ReLU) → Dense(1, Sigmoid)
Optimizer:     Adam (lr=0.01)
Loss:          Binary Cross-Entropy
Epochs:        50
Batch Size:    4
Storage:       LocalStorage (browser-side)
Dataset:       /public/datasets/stress_model_data.json
```

---

## 📱 Pages & Screens

| #  | Route                  | Page             | Description                                 |
|----|------------------------|------------------|---------------------------------------------|
| 1  | `/`                    | Landing Page     | Public hero page with features, pipeline, CTA |
| 2  | `/login`               | Login            | Authentication with email/password          |
| 3  | `/about`               | About            | Project info, stats, team, tech stack       |
| 4  | `/dashboard`           | Main Dashboard   | Overview with gauge, stats, dual waveforms  |
| 5  | `/dashboard/ecg`       | ECG Monitor      | Full ECG view, R-R intervals, PSD chart     |
| 6  | `/dashboard/emg`       | EMG Monitor      | Full EMG view, activation heatmap, fatigue  |
| 7  | `/dashboard/history`   | History & Trends | Session logs and historical trend charts    |
| 8  | `/dashboard/reports`   | Reports          | AI-generated health assessments             |
| 9  | `/dashboard/alerts`    | Alert Center     | Feed, thresholds, custom rules, analytics   |
| 10 | `/dashboard/device`    | Device Connection| Serial connect/disconnect, ML training      |
| 11 | `/dashboard/profile`   | Profile & Settings| User info, health baseline, appearance     |
| 12 | `/404`                 | Not Found        | Custom 404 error page                       |

---

## 📁 Project Structure

```
NeuroGard_System/
├── arduino/
│   └── NeuroGuard_Firmware/
│       └── NeuroGuard_Firmware.ino       # Arduino firmware (ECG/EMG → JSON serial)
│
├── web/                                   # Next.js 16 web application
│   ├── public/
│   │   └── datasets/
│   │       └── stress_model_data.json     # ML training dataset
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css                # Design system tokens & utility classes
│   │   │   ├── layout.tsx                 # Root layout (HTML, fonts, metadata)
│   │   │   ├── page.tsx                   # Landing page (/)
│   │   │   ├── page.module.css
│   │   │   ├── not-found.tsx              # Custom 404 page
│   │   │   ├── login/
│   │   │   │   ├── page.tsx               # Login page
│   │   │   │   └── page.module.css
│   │   │   ├── about/
│   │   │   │   ├── page.tsx               # About page
│   │   │   │   └── page.module.css
│   │   │   └── dashboard/
│   │   │       ├── layout.tsx             # Dashboard layout (Sidebar + DeviceProvider)
│   │   │       ├── layout.module.css
│   │   │       ├── page.tsx               # Main dashboard overview
│   │   │       ├── page.module.css
│   │   │       ├── ecg/                   # ECG Monitor page
│   │   │       ├── emg/                   # EMG Monitor page
│   │   │       ├── history/               # History & Trends page
│   │   │       ├── reports/               # Reports page
│   │   │       ├── alerts/                # Alert Center page
│   │   │       ├── device/                # Device Connection page
│   │   │       └── profile/               # Profile & Settings page
│   │   ├── components/
│   │   │   ├── charts/
│   │   │   │   ├── WaveformChart.tsx      # Real-time streaming canvas waveform
│   │   │   │   ├── WaveformChart.module.css
│   │   │   │   ├── GaugeChart.tsx         # Semi-circular burnout gauge
│   │   │   │   └── GaugeChart.module.css
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx             # Top header with breadcrumbs & search
│   │   │   │   ├── Header.module.css
│   │   │   │   ├── Sidebar.tsx            # Collapsible navigation sidebar
│   │   │   │   └── Sidebar.module.css
│   │   │   └── ui/
│   │   │       ├── StatCard.tsx           # Stat display card with icon & trend
│   │   │       └── StatCard.module.css
│   │   ├── context/
│   │   │   └── DeviceContext.tsx           # Global device state (connect/scan/data)
│   │   ├── services/
│   │   │   ├── serialService.ts           # Web Serial API wrapper (read/write/parse)
│   │   │   └── mlService.ts               # TensorFlow.js model (train/predict)
│   │   ├── lib/
│   │   │   └── mockData.ts               # Demo data generators & utilities
│   │   └── types/
│   │       └── index.ts                   # TypeScript interfaces & types
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.ts
│
├── site/                                  # Static HTML prototypes (Stitch-generated)
├── queue/                                 # Stitch generation queue
├── DESIGN.md                              # Complete design system documentation
├── SITE.md                                # Site vision, sitemap, and roadmap
├── project_concept.md                     # Project concept & documentation
└── stitch.json                            # Stitch project configuration
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **Arduino IDE** (for firmware upload)
- **Google Chrome or Microsoft Edge** (Web Serial API support required)
- **Arduino Uno R3** + **BioAmp EXG Pill** + **ECG/EMG Electrodes** (for hardware mode)

### Quick Start (Dashboard Only)

```bash
# 1. Clone the repository
git clone https://github.com/your-repo/NeuroGard_System.git
cd NeuroGard_System/web

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

> **Note:** The dashboard works without hardware. Connect an Arduino for real-time biosignal data.

---

## 🤖 Arduino Setup

### 1. Wire the Hardware

```
BioAmp EXG Pill (ECG mode) ───▶ Arduino A0
BioAmp EXG Pill (EMG mode) ───▶ Arduino A1
GND ───▶ Arduino GND
VCC ───▶ Arduino 5V
```

### 2. Upload Firmware

1. Open `arduino/NeuroGuard_Firmware/NeuroGuard_Firmware.ino` in Arduino IDE
2. Select **Board: Arduino Uno** and the correct **Port**
3. Click **Upload**

### 3. Firmware Details

```cpp
// Reads ECG (A0) and EMG (A1) at ~100Hz
// Outputs JSON over Serial at 115200 baud
// Format: {"ecg": <value>, "emg": <value>}
```

---

## 🌐 Web Dashboard Setup

```bash
cd web/

# Install dependencies
npm install

# Development mode (hot reload)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint check
npm run lint
```

### Connecting Hardware to Dashboard

1. Navigate to **Dashboard → Device** page (`/dashboard/device`)
2. Click **"Connect Arduino"** button
3. Select the Arduino serial port in the browser prompt
4. Once connected, go to **ECG Monitor** or **EMG Monitor** and click **Start**
5. Real-time biosignals will stream to the dashboard

### Training the ML Model

1. Go to **Dashboard → Device** page
2. Click **"Train Model"** — this trains on the bundled reference dataset
3. Once trained, the model auto-saves to LocalStorage
4. Navigate to **Dashboard** to see live burnout predictions

---

## 🎨 Design System

The dashboard uses a premium **dark medical-tech theme** with the following design tokens:

### Colors
| Token          | Hex       | Usage                          |
|----------------|-----------|--------------------------------|
| Background     | `#0a0e1a` | Main page background           |
| Surface        | `#111827` | Cards, panels                  |
| Elevated       | `#1a2235` | Modals, hovers, active states  |
| Accent Blue    | `#3b82f6` | ECG waveform, primary actions  |
| Accent Purple  | `#a855f7` | EMG waveform, secondary        |
| Accent Green   | `#22c55e` | Normal/Healthy state           |
| Accent Yellow  | `#eab308` | High Stress state              |
| Accent Red     | `#ef4444` | Burnout Risk / Critical        |

### Typography
| Element  | Font            | Weight |
|----------|-----------------|--------|
| Headings | Space Grotesk   | 600-700 |
| Body     | Inter           | 400     |
| Data     | JetBrains Mono  | 500     |

### Components
- **Cards:** Dark surface, 1px border, 16px radius, subtle shadow
- **Buttons:** Gradient (blue→purple) primary, 12px radius
- **Badges:** Pill-shaped, color-coded (green/yellow/red)
- **Waveforms:** Canvas-rendered with glow effects on dark grid backgrounds
- **Gauge:** Semi-circular arc with 3-zone gradient (green→yellow→red)

---

## 🔄 Data Flow & Pipeline

```
1. SIGNAL CAPTURE
   Arduino reads A0 (ECG) + A1 (EMG) every 10ms (~100Hz)
   ↓
2. SERIAL TRANSMISSION
   JSON packets streamed at 115200 baud: {"ecg":512,"emg":340}
   ↓
3. WEB SERIAL API
   Browser reads serial stream via serialService.ts
   Subscribers receive parsed SerialData objects
   ↓
4. FEATURE EXTRACTION (1Hz loop)
   ECG → R-peak detection → RR intervals → HR, HRV, RMSSD, SDNN
   EMG → RMS calculation → Fatigue index
   ↓
5. ML INFERENCE
   Features normalized (Min-Max) → TensorFlow.js model → Burnout score (0-1)
   Score mapped to: Normal (0-39%) / High Stress (40-69%) / Burnout Risk (70-100%)
   ↓
6. VISUALIZATION
   Canvas waveforms + Chart.js graphs + Gauge + Stat cards
   Updated every animation frame (waveforms) and every second (stats)
```

---

## ⚙️ API & Services

### `serialService.ts`
| Method          | Description                              |
|-----------------|------------------------------------------|
| `connect()`     | Open Web Serial port at 115200 baud      |
| `disconnect()`  | Close port and cleanup                   |
| `subscribe(cb)` | Register listener for incoming data      |
| `onDisconnect(cb)` | Register listener for disconnections  |

### `mlService.ts`
| Method                  | Description                           |
|-------------------------|---------------------------------------|
| `loadModel()`           | Load trained model from LocalStorage  |
| `trainModel(onEpoch)`   | Train new model on reference dataset  |
| `predict(features)`     | Run inference, returns 0-1 score      |

### `DeviceContext.tsx`
| State/Method     | Description                               |
|------------------|-------------------------------------------|
| `isConnected`    | Whether Arduino is connected              |
| `isScanning`     | Whether data collection is active         |
| `connect()`      | Connect to Arduino via Web Serial         |
| `disconnect()`   | Disconnect from Arduino                   |
| `startScanning()`| Begin processing incoming data            |
| `stopScanning()` | Stop processing incoming data             |

---

## 🗺️ Future Roadmap

- [ ] Onboarding tutorial for first-time users
- [ ] Team/Admin dashboard for organizations
- [ ] Side-by-side session comparison view
- [ ] Detailed AI insights page with model explanations
- [ ] Data export wizard (CSV/JSON)
- [ ] Help center with documentation
- [ ] PWA support for mobile devices
- [ ] Real-time WebSocket backend support
- [ ] Cloud-based model training with larger datasets

---

## 👨‍💻 Author

**Manish Rai**
- Role: Lead Developer & Researcher
- Department: Biomedical Engineering

---

## 📄 License

This project is for educational and research purposes.

© 2026 NeuroGuard System. All rights reserved.

---

<p align="center">
  <strong>Built with ❤️ using Next.js, TensorFlow.js & Arduino</strong>
</p>

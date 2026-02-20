# NeuroGuard System — Site Vision & Roadmap

## 1. Vision

NeuroGuard is an AI-powered burnout detection web dashboard that visualizes real-time ECG & EMG biosignals, runs machine learning classification, and provides early-warning burnout alerts. The web dashboard is the primary user interface for the entire system.

**Target Users:** Students, professionals, healthcare providers monitoring burnout risk.

**Stitch Project ID:** `11382757644819107268`

---

## 2. Tech Context

- **Device Type:** DESKTOP (primary), responsive to tablet/mobile
- **Platform:** Next.js web application
- **Data Source:** Arduino + BioAmp EXG Pill → Python Backend → WebSocket → Dashboard
- **ML Model:** Random Forest Classifier → 3 classes: Normal (0), High Stress (1), Burnout Risk (2)

---

## 3. Design Reference

See `DESIGN.md` for complete design system including colors, typography, components, and Stitch generation rules.

---

## 4. Sitemap (Generated Pages)

Track all generated pages here. Mark with `[x]` when complete.

- [x] `index` — Landing Page (public hero page) ✅
- [x] `login` — Login Page ✅
- [x] `register` — Registration Page ✅
- [x] `dashboard` — Main Dashboard (real-time monitoring hub) ✅
- [x] `ecg` — ECG Detail View ✅
- [x] `emg` — EMG Detail View ✅
- [x] `history` — Historical Data & Trends ✅
- [x] `reports` — Reports & Export ✅
- [x] `alerts` — Alert Center ✅
- [x] `device` — Device Connection & Status ✅
- [x] `profile` — User Profile & Settings ✅
- [x] `about` — About the Project (public) ✅
- [x] `404` — Custom 404 Page ✅

---

## 5. Roadmap (Build Order)

All pages completed! ✅

---

## 6. Creative Freedom

If extending further, consider adding:

- **Onboarding Tutorial** — interactive walkthrough for first-time users
- **Team/Admin Dashboard** — for organizations monitoring multiple users
- **Comparison View** — side-by-side session comparison
- **AI Insights Page** — detailed ML model explanations and predictions
- **Data Export Wizard** — step-by-step data export with format selection
- **Help Center** — documentation and troubleshooting guides
- **Contact Page** — technical support form

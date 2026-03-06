'use client';
import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { serialService, SerialData } from '@/services/serialService';

interface DeviceContextType {
    isConnected: boolean;       // true if EITHER device is connected
    ecgConnected: boolean;      // ECG ESP8266 connected
    eegConnected: boolean;      // EEG ESP8266 connected
    isScanning: boolean;
    connectECG: () => Promise<boolean>;
    connectEEG: () => Promise<boolean>;
    connect: () => Promise<boolean>;  // legacy — connects ECG
    disconnectECG: () => Promise<void>;
    disconnectEEG: () => Promise<void>;
    disconnect: () => Promise<void>;
    startScanning: () => void;
    stopScanning: () => void;
    data: SerialData | null;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export function DeviceProvider({ children }: { children: ReactNode }) {
    const [ecgConnected, setEcgConnected] = useState(false);
    const [eegConnected, setEegConnected] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [data, setData] = useState<SerialData | null>(null);

    const isConnected = ecgConnected || eegConnected;

    // Listen for unexpected disconnections
    useEffect(() => {
        const unsubDisconnect = serialService.onDisconnect((source) => {
            console.log(`[DeviceContext] ${source} disconnected`);
            if (source === 'ecg' || source === 'all') setEcgConnected(false);
            if (source === 'eeg' || source === 'all') setEegConnected(false);
        });
        return () => { unsubDisconnect(); };
    }, []);

    // Subscribe to data stream
    const isScanningRef = useRef(isScanning);
    useEffect(() => { isScanningRef.current = isScanning; }, [isScanning]);

    useEffect(() => {
        const unsub = serialService.subscribe((d) => {
            if (isScanningRef.current) setData(d);
        });
        return unsub;
    }, []);

    const connectECG = useCallback(async () => {
        const result = await serialService.connectECG();
        if (result.success) { setEcgConnected(true); return true; }
        return false;
    }, []);

    const connectEEG = useCallback(async () => {
        const result = await serialService.connectEEG();
        if (result.success) { setEegConnected(true); return true; }
        return false;
    }, []);

    // Legacy connect — connects ECG by default
    const connect = useCallback(async () => {
        return connectECG();
    }, [connectECG]);

    const disconnectECG = useCallback(async () => {
        setEcgConnected(false);
        if (!eegConnected) { setIsScanning(false); setData(null); }
        await serialService.disconnectECG();
    }, [eegConnected]);

    const disconnectEEG = useCallback(async () => {
        setEegConnected(false);
        if (!ecgConnected) { setIsScanning(false); setData(null); }
        await serialService.disconnectEEG();
    }, [ecgConnected]);

    const disconnect = useCallback(async () => {
        setEcgConnected(false);
        setEegConnected(false);
        setIsScanning(false);
        setData(null);
        await serialService.disconnect();
    }, []);

    const startScanning = useCallback(() => setIsScanning(true), []);
    const stopScanning = useCallback(() => { setIsScanning(false); setData(null); }, []);

    return (
        <DeviceContext.Provider value={{
            isConnected,
            ecgConnected,
            eegConnected,
            isScanning,
            connectECG,
            connectEEG,
            connect,
            disconnectECG,
            disconnectEEG,
            disconnect,
            startScanning,
            stopScanning,
            data
        }}>
            {children}
        </DeviceContext.Provider>
    );
}

export function useDevice() {
    const context = useContext(DeviceContext);
    if (context === undefined) {
        throw new Error('useDevice must be used within a DeviceProvider');
    }
    return context;
}

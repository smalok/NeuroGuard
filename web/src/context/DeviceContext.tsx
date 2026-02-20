'use client';
import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { serialService, SerialData } from '@/services/serialService';

interface DeviceContextType {
    isConnected: boolean;
    isScanning: boolean;
    connect: () => Promise<boolean>;
    disconnect: () => Promise<void>;
    startScanning: () => void;
    stopScanning: () => void;
    data: SerialData | null;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export function DeviceProvider({ children }: { children: ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [data, setData] = useState<SerialData | null>(null);
    const isDisconnectingRef = useRef(false);

    // Listen for unexpected disconnections (physical USB unplug or read errors)
    useEffect(() => {
        const unsubDisconnect = serialService.onDisconnect(() => {
            console.log('[DeviceContext] Device unexpectedly disconnected');
            setIsConnected(false);
            setIsScanning(false);
            setData(null);
            isDisconnectingRef.current = false;
        });

        return () => { unsubDisconnect(); };
    }, []);

    // Subscribe to data stream — use a ref for isScanning to avoid re-subscribing
    const isScanningRef = useRef(isScanning);
    useEffect(() => { isScanningRef.current = isScanning; }, [isScanning]);

    useEffect(() => {
        const unsub = serialService.subscribe((d) => {
            if (isScanningRef.current) {
                setData(d);
            }
        });
        return unsub;
    }, []); // Subscribe once on mount, never re-subscribe

    const connect = useCallback(async () => {
        if (isDisconnectingRef.current) return false;
        const result = await serialService.connect();
        if (result.success) {
            setIsConnected(true);
            setData(null);
            return true;
        }
        return false;
    }, []);

    const disconnect = useCallback(async () => {
        if (isDisconnectingRef.current) return;
        isDisconnectingRef.current = true;

        // Update UI state immediately so pages don't hang
        setIsConnected(false);
        setIsScanning(false);
        setData(null);

        try {
            await serialService.disconnect();
        } catch (e) {
            console.warn('Disconnect error (safe to ignore):', e);
        } finally {
            isDisconnectingRef.current = false;
        }
    }, []);

    const startScanning = useCallback(() => setIsScanning(true), []);
    const stopScanning = useCallback(() => {
        setIsScanning(false);
        setData(null);
    }, []);

    return (
        <DeviceContext.Provider value={{
            isConnected,
            isScanning,
            connect,
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

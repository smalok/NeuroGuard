export interface SerialData {
    ecg: number;
    emg: number;
    timestamp?: number;
}

type SerialListener = (data: SerialData) => void;
type DisconnectListener = () => void;

class SerialService {
    private port: any | null = null;
    private reader: ReadableStreamDefaultReader | null = null;
    private isConnected = false;
    private isDisconnecting = false;
    private listeners: SerialListener[] = [];
    private disconnectListeners: DisconnectListener[] = [];
    private decoder = new TextDecoder();
    private buffer = '';
    private abortController: AbortController | null = null;
    private boundOnPortDisconnect: ((event: any) => void) | null = null;

    async connect(): Promise<{ success: boolean; error?: string }> {
        // Prevent connecting while already connected or mid-disconnect
        if (this.isConnected || this.isDisconnecting) {
            return { success: false, error: 'Already connected or disconnecting' };
        }

        try {
            const nav = navigator as any;
            if (!nav.serial) {
                return { success: false, error: 'Web Serial API not supported' };
            }

            this.port = await nav.serial.requestPort();
            await this.port!.open({ baudRate: 115200 });
            this.isConnected = true;
            this.isDisconnecting = false;
            this.buffer = '';

            // Listen for physical USB disconnect
            this.boundOnPortDisconnect = this.handlePhysicalDisconnect.bind(this);
            (navigator as any).serial.addEventListener('disconnect', this.boundOnPortDisconnect);

            this.readLoop();
            return { success: true };
        } catch (error: any) {
            this.isConnected = false;
            this.port = null;
            if (error.name === 'NotFoundError') {
                return { success: false, error: 'Connection cancelled' };
            }
            console.error('Serial connection failed:', error);
            return { success: false, error: error.message || 'Unknown error' };
        }
    }

    async disconnect() {
        if (this.isDisconnecting || !this.isConnected) return;
        this.isDisconnecting = true;

        // Immediately mark as disconnected to stop the read loop
        this.isConnected = false;

        // Remove physical disconnect listener
        if (this.boundOnPortDisconnect) {
            try {
                (navigator as any).serial?.removeEventListener('disconnect', this.boundOnPortDisconnect);
            } catch (_) { /* ignore */ }
            this.boundOnPortDisconnect = null;
        }

        // Cancel and release reader safely
        if (this.reader) {
            try {
                await this.reader.cancel();
            } catch (e) {
                console.warn('Reader cancel error (safe to ignore):', e);
            }
            try {
                this.reader.releaseLock();
            } catch (e) {
                console.warn('Reader releaseLock error (safe to ignore):', e);
            }
            this.reader = null;
        }

        // Close port safely
        if (this.port) {
            try {
                await this.port.close();
            } catch (e) {
                console.warn('Port close error (safe to ignore):', e);
            }
            this.port = null;
        }

        this.buffer = '';
        this.isDisconnecting = false;
    }

    private handlePhysicalDisconnect(event: any) {
        // The event.target is the port that was disconnected
        // Only handle if it matches our current port
        if (this.port && event.target === this.port) {
            console.warn('Physical device disconnect detected');
            this.forceCleanup();
        }
    }

    /**
     * Force cleanup everything without awaiting port operations
     * (used when the device is already physically gone)
     */
    private forceCleanup() {
        this.isConnected = false;

        // Remove event listener
        if (this.boundOnPortDisconnect) {
            try {
                (navigator as any).serial?.removeEventListener('disconnect', this.boundOnPortDisconnect);
            } catch (_) { /* ignore */ }
            this.boundOnPortDisconnect = null;
        }

        // Release reader without cancel (port is already dead)
        if (this.reader) {
            try { this.reader.releaseLock(); } catch (_) { /* ignore */ }
            this.reader = null;
        }

        // Don't try to close a dead port — just null it out
        this.port = null;
        this.buffer = '';
        this.isDisconnecting = false;

        // Notify listeners about the disconnect
        this.notifyDisconnect();
    }

    subscribe(callback: SerialListener) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    /**
     * Register a callback for unexpected disconnections (e.g. USB unplug).
     * Returns an unsubscribe function.
     */
    onDisconnect(callback: DisconnectListener) {
        this.disconnectListeners.push(callback);
        return () => {
            this.disconnectListeners = this.disconnectListeners.filter(l => l !== callback);
        };
    }

    private notifyDisconnect() {
        // Use setTimeout to avoid calling setState during render cycles
        setTimeout(() => {
            this.disconnectListeners.forEach(l => {
                try { l(); } catch (_) { /* ignore */ }
            });
        }, 0);
    }

    private async readLoop() {
        if (!this.port) return;

        while (this.isConnected && this.port?.readable) {
            try {
                this.reader = this.port.readable.getReader();
            } catch (e) {
                console.warn('Failed to get reader:', e);
                break;
            }

            try {
                while (this.isConnected) {
                    if (!this.reader) break;
                    const { value, done } = await this.reader.read();
                    if (done) break;

                    const text = this.decoder.decode(value);
                    this.buffer += text;

                    const lines = this.buffer.split('\n');
                    this.buffer = lines.pop() ?? '';

                    for (const line of lines) {
                        this.parseLine(line.trim());
                    }
                }
            } catch (error: any) {
                // NetworkError / DOMException means device was disconnected
                if (this.isConnected) {
                    console.warn('Read loop error (device likely disconnected):', error.message);
                    this.forceCleanup();
                    return; // Exit entirely — don't retry
                }
            } finally {
                // Release the reader lock if we still hold it
                if (this.reader) {
                    try { this.reader.releaseLock(); } catch (_) { /* ignore */ }
                    this.reader = null;
                }
            }
        }
    }

    private parseLine(line: string) {
        if (!line) return;
        try {
            const data = JSON.parse(line);
            if (typeof data.ecg === 'number' && typeof data.emg === 'number') {
                const payload: SerialData = {
                    ecg: data.ecg,
                    emg: data.emg,
                    timestamp: Date.now()
                };
                this.listeners.forEach(l => l(payload));
            }
        } catch (e) {
            // Ignore parse errors (incomplete lines or serial noise)
        }
    }

    getConnectionStatus(): boolean {
        return this.isConnected;
    }
}

export const serialService = new SerialService();

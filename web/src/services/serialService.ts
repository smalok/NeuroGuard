export interface SerialData {
    ecg: number;
    eeg: number;
    timestamp?: number;
}

type SerialListener = (data: SerialData) => void;
type DisconnectListener = (source: 'ecg' | 'eeg' | 'all') => void;

class SerialService {
    // USB Serial connections (dual port mode)
    private ecgPort: any | null = null;
    private eegPort: any | null = null;
    private ecgReader: ReadableStreamDefaultReader | null = null;
    private eegReader: ReadableStreamDefaultReader | null = null;
    private ecgBuffer = '';
    private eegBuffer = '';

    private ecgConnected = false;
    private eegConnected = false;
    private ecgDisconnecting = false;
    private eegDisconnecting = false;

    private listeners: SerialListener[] = [];
    private disconnectListeners: DisconnectListener[] = [];
    private decoder = new TextDecoder();

    // Latest values from each ESP
    private latestECG = 0;
    private latestEEG = 0;

    // ─── Connect ECG ESP8266 via USB Serial ──────────────────────────

    async connectECG(): Promise<{ success: boolean; error?: string }> {
        if (this.ecgConnected) {
            return { success: false, error: 'ECG already connected' };
        }
        if (this.ecgDisconnecting) {
            // Wait for disconnect to finish
            await new Promise(r => setTimeout(r, 500));
        }

        try {
            const nav = navigator as any;
            if (!nav.serial) {
                return { success: false, error: 'Web Serial API not supported. Use Chrome or Edge.' };
            }

            // Request port from user
            const port = await nav.serial.requestPort();

            // Try to open — if already open, close first then reopen
            try {
                await port.open({ baudRate: 115200 });
                try { await port.setSignals({ dataTerminalReady: false, requestToSend: false }); } catch (e) { } // Release ESP from reset
            } catch (openErr: any) {
                console.warn('[Serial] ECG port.open failed, trying close+reopen:', openErr.message);
                try {
                    // Port may already be open from a previous session
                    if (port.readable) {
                        const reader = port.readable.getReader();
                        await reader.cancel();
                        reader.releaseLock();
                    }
                    await port.close();
                } catch { }
                // Wait a bit and retry
                await new Promise(r => setTimeout(r, 300));
                try {
                    await port.open({ baudRate: 115200 });
                    try { await port.setSignals({ dataTerminalReady: false, requestToSend: false }); } catch (e) { }
                } catch (retryErr: any) {
                    return { success: false, error: `Port open failed: ${retryErr.message}. Try unplugging and plugging back the USB cable.` };
                }
            }

            this.ecgPort = port;
            this.ecgConnected = true;
            this.ecgDisconnecting = false;
            this.ecgBuffer = '';

            // Listen for physical unplug
            const disconnectHandler = (event: any) => {
                if (this.ecgPort && event.target === this.ecgPort) {
                    console.warn('[Serial] ECG ESP8266 physically disconnected');
                    this.forceCleanupECG();
                    nav.serial.removeEventListener('disconnect', disconnectHandler);
                }
            };
            nav.serial.addEventListener('disconnect', disconnectHandler);

            console.log('[Serial] ECG connected successfully');
            this.readLoopECG();
            return { success: true };
        } catch (error: any) {
            this.ecgConnected = false;
            this.ecgPort = null;
            if (error.name === 'NotFoundError') {
                return { success: false, error: 'Connection cancelled — no port selected.' };
            }
            console.error('[Serial] ECG connect error:', error);
            return { success: false, error: `Connection failed: ${error.message}` };
        }
    }

    // ─── Connect EEG ESP8266 via USB Serial ──────────────────────────

    async connectEEG(): Promise<{ success: boolean; error?: string }> {
        if (this.eegConnected) {
            return { success: false, error: 'EEG already connected' };
        }
        if (this.eegDisconnecting) {
            await new Promise(r => setTimeout(r, 500));
        }

        try {
            const nav = navigator as any;
            if (!nav.serial) {
                return { success: false, error: 'Web Serial API not supported. Use Chrome or Edge.' };
            }

            const port = await nav.serial.requestPort();

            try {
                await port.open({ baudRate: 115200 });
                try { await port.setSignals({ dataTerminalReady: false, requestToSend: false }); } catch (e) { } // Release ESP from reset
            } catch (openErr: any) {
                console.warn('[Serial] EEG port.open failed, trying close+reopen:', openErr.message);
                try {
                    if (port.readable) {
                        const reader = port.readable.getReader();
                        await reader.cancel();
                        reader.releaseLock();
                    }
                    await port.close();
                } catch { }
                await new Promise(r => setTimeout(r, 300));
                try {
                    await port.open({ baudRate: 115200 });
                    try { await port.setSignals({ dataTerminalReady: false, requestToSend: false }); } catch (e) { }
                } catch (retryErr: any) {
                    return { success: false, error: `Port open failed: ${retryErr.message}. Try unplugging and plugging back the USB cable.` };
                }
            }

            this.eegPort = port;
            this.eegConnected = true;
            this.eegDisconnecting = false;
            this.eegBuffer = '';

            const disconnectHandler = (event: any) => {
                if (this.eegPort && event.target === this.eegPort) {
                    console.warn('[Serial] EEG ESP8266 physically disconnected');
                    this.forceCleanupEEG();
                    nav.serial.removeEventListener('disconnect', disconnectHandler);
                }
            };
            nav.serial.addEventListener('disconnect', disconnectHandler);

            console.log('[Serial] EEG connected successfully');
            this.readLoopEEG();
            return { success: true };
        } catch (error: any) {
            this.eegConnected = false;
            this.eegPort = null;
            if (error.name === 'NotFoundError') {
                return { success: false, error: 'Connection cancelled — no port selected.' };
            }
            console.error('[Serial] EEG connect error:', error);
            return { success: false, error: `Connection failed: ${error.message}` };
        }
    }

    // ─── Legacy connect ──────────────────────────────────────────────

    async connect(): Promise<{ success: boolean; error?: string }> {
        return this.connectECG();
    }

    // ─── Disconnect ECG ──────────────────────────────────────────────

    async disconnectECG() {
        if (this.ecgDisconnecting || !this.ecgConnected) return;
        this.ecgDisconnecting = true;
        this.ecgConnected = false;

        try {
            if (this.ecgReader) {
                try { await this.ecgReader.cancel(); } catch { }
                try { this.ecgReader.releaseLock(); } catch { }
                this.ecgReader = null;
            }
            if (this.ecgPort) {
                try { await this.ecgPort.close(); } catch { }
                this.ecgPort = null;
            }
        } catch (e) {
            console.warn('[Serial] ECG disconnect error:', e);
        }

        this.ecgBuffer = '';
        this.latestECG = 0;
        this.ecgDisconnecting = false;
        this.notifyDisconnect('ecg');
    }

    // ─── Disconnect EEG ──────────────────────────────────────────────

    async disconnectEEG() {
        if (this.eegDisconnecting || !this.eegConnected) return;
        this.eegDisconnecting = true;
        this.eegConnected = false;

        try {
            if (this.eegReader) {
                try { await this.eegReader.cancel(); } catch { }
                try { this.eegReader.releaseLock(); } catch { }
                this.eegReader = null;
            }
            if (this.eegPort) {
                try { await this.eegPort.close(); } catch { }
                this.eegPort = null;
            }
        } catch (e) {
            console.warn('[Serial] EEG disconnect error:', e);
        }

        this.eegBuffer = '';
        this.latestEEG = 0;
        this.eegDisconnecting = false;
        this.notifyDisconnect('eeg');
    }

    // ─── Disconnect all ──────────────────────────────────────────────

    async disconnect() {
        await this.disconnectECG();
        await this.disconnectEEG();
    }

    // ─── Emit combined data ──────────────────────────────────────────

    private emitData() {
        const payload: SerialData = { ecg: this.latestECG, eeg: this.latestEEG, timestamp: Date.now() };
        this.listeners.forEach(l => { try { l(payload); } catch { } });
    }

    // ─── Read loops ──────────────────────────────────────────────────

    private async readLoopECG() {
        if (!this.ecgPort) return;
        while (this.ecgConnected && this.ecgPort?.readable) {
            try {
                this.ecgReader = this.ecgPort.readable.getReader();
            } catch (e) {
                console.warn('[Serial] ECG getReader failed:', e);
                break;
            }
            try {
                while (this.ecgConnected) {
                    if (!this.ecgReader) break;
                    const { value, done } = await this.ecgReader.read();
                    if (done) break;
                    this.ecgBuffer += this.decoder.decode(value);
                    const lines = this.ecgBuffer.split('\n');
                    this.ecgBuffer = lines.pop() ?? '';
                    for (const line of lines) this.parseECGLine(line.trim());
                }
            } catch (error: any) {
                if (this.ecgConnected) {
                    console.warn('[Serial] ECG read error:', error.message);
                    this.forceCleanupECG();
                    return;
                }
            } finally {
                if (this.ecgReader) {
                    try { this.ecgReader.releaseLock(); } catch { }
                    this.ecgReader = null;
                }
            }
        }
    }

    private async readLoopEEG() {
        if (!this.eegPort) return;
        while (this.eegConnected && this.eegPort?.readable) {
            try {
                this.eegReader = this.eegPort.readable.getReader();
            } catch (e) {
                console.warn('[Serial] EEG getReader failed:', e);
                break;
            }
            try {
                while (this.eegConnected) {
                    if (!this.eegReader) break;
                    const { value, done } = await this.eegReader.read();
                    if (done) break;
                    this.eegBuffer += this.decoder.decode(value);
                    const lines = this.eegBuffer.split('\n');
                    this.eegBuffer = lines.pop() ?? '';
                    for (const line of lines) this.parseEEGLine(line.trim());
                }
            } catch (error: any) {
                if (this.eegConnected) {
                    console.warn('[Serial] EEG read error:', error.message);
                    this.forceCleanupEEG();
                    return;
                }
            } finally {
                if (this.eegReader) {
                    try { this.eegReader.releaseLock(); } catch { }
                    this.eegReader = null;
                }
            }
        }
    }

    // ─── Parse lines ─────────────────────────────────────────────────

    private parseECGLine(line: string) {
        if (!line) return;
        // Skip status/ready messages
        if (line.includes('status') || line.includes('READY')) {
            console.log('[Serial] ECG device message:', line);
            return;
        }
        try {
            const data = JSON.parse(line);
            if (typeof data.ecg === 'number') { this.latestECG = data.ecg; this.emitData(); }
            else if (typeof data.value === 'number') { this.latestECG = data.value; this.emitData(); }
        } catch {
            // Try raw numeric value
            const num = parseFloat(line);
            if (!isNaN(num) && isFinite(num)) { this.latestECG = num; this.emitData(); }
        }
    }

    private parseEEGLine(line: string) {
        if (!line) return;
        if (line.includes('status') || line.includes('READY')) {
            console.log('[Serial] EEG device message:', line);
            return;
        }
        try {
            const data = JSON.parse(line);
            if (typeof data.eeg === 'number') { this.latestEEG = data.eeg; this.emitData(); }
            else if (typeof data.value === 'number') { this.latestEEG = data.value; this.emitData(); }
        } catch {
            const num = parseFloat(line);
            if (!isNaN(num) && isFinite(num)) { this.latestEEG = num; this.emitData(); }
        }
    }

    // ─── Force cleanup ───────────────────────────────────────────────

    private forceCleanupECG() {
        this.ecgConnected = false;
        if (this.ecgReader) { try { this.ecgReader.releaseLock(); } catch { } this.ecgReader = null; }
        if (this.ecgPort) { try { this.ecgPort.close(); } catch { } }
        this.ecgPort = null;
        this.ecgBuffer = '';
        this.ecgDisconnecting = false;
        this.notifyDisconnect('ecg');
    }

    private forceCleanupEEG() {
        this.eegConnected = false;
        if (this.eegReader) { try { this.eegReader.releaseLock(); } catch { } this.eegReader = null; }
        if (this.eegPort) { try { this.eegPort.close(); } catch { } }
        this.eegPort = null;
        this.eegBuffer = '';
        this.eegDisconnecting = false;
        this.notifyDisconnect('eeg');
    }

    // ─── Subscriptions ───────────────────────────────────────────────

    subscribe(callback: SerialListener) {
        this.listeners.push(callback);
        return () => { this.listeners = this.listeners.filter(l => l !== callback); };
    }

    onDisconnect(callback: DisconnectListener) {
        this.disconnectListeners.push(callback);
        return () => { this.disconnectListeners = this.disconnectListeners.filter(l => l !== callback); };
    }

    private notifyDisconnect(source: 'ecg' | 'eeg' | 'all') {
        setTimeout(() => {
            this.disconnectListeners.forEach(l => { try { l(source); } catch { } });
        }, 0);
    }

    // ─── Status getters ──────────────────────────────────────────────

    getConnectionStatus(): boolean { return this.ecgConnected || this.eegConnected; }
    getECGConnectionStatus(): boolean { return this.ecgConnected; }
    getEEGConnectionStatus(): boolean { return this.eegConnected; }
}

export const serialService = new SerialService();

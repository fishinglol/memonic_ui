// BLEContext.js — name kept for compatibility, but BLE has been removed.
// Bracelet is now controlled entirely through the backend over WiFi/HTTPS.
// The hook surface (isConnected, sendEnrollCommand, lastMemory, ...) is
// preserved so callers (sub_member, index, useMemonicBLE) keep working.

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AI_URL } from '../constants/config';

const BraceletContext = createContext();

const POLL_MS_IDLE   = 5000;  // polling when nothing happening
const POLL_MS_ACTIVE = 800;   // polling during an enroll/record job
const COMMAND_TIMEOUT_MS = 30000;

export const BLEProvider = ({ children }) => {
    const [isConnected,     setIsConnected]     = useState(false);
    const [isReceiving,     setIsReceiving]     = useState(false);
    const [lastMemory,      setLastMemory]      = useState(null);
    const [operationStatus, setOperationStatus] = useState('idle'); // idle|recording|processing|success|error

    const pollTimerRef    = useRef(null);
    const commandStartRef = useRef(0);

    // ── Status polling ───────────────────────────────────────
    const pollOnce = useCallback(async () => {
        try {
            const r = await fetch(`${AI_URL}/api/bracelet/status`);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const data = await r.json();

            setIsConnected(!!data.online);

            const job = data.job || {};
            const state = job.state || 'idle';

            if (state === 'recording' || state === 'processing') {
                setIsReceiving(true);
                setOperationStatus(state);
                // Auto-fail on stuck command
                if (commandStartRef.current && Date.now() - commandStartRef.current > COMMAND_TIMEOUT_MS) {
                    setIsReceiving(false);
                    setOperationStatus('error');
                    setLastMemory('ERROR_TIMEOUT');
                    commandStartRef.current = 0;
                }
            } else if (state === 'success') {
                setIsReceiving(false);
                setOperationStatus('success');
                if (job.result) setLastMemory(job.result);
                commandStartRef.current = 0;
            } else if (state === 'error') {
                setIsReceiving(false);
                setOperationStatus('error');
                if (job.result) setLastMemory(job.result);
                commandStartRef.current = 0;
            } else {
                // idle — leave lastMemory as-is so UI can still show last result
                setIsReceiving(false);
                if (operationStatus !== 'success' && operationStatus !== 'error') {
                    setOperationStatus('idle');
                }
            }
        } catch (e) {
            setIsConnected(false);
        }
    }, [operationStatus]);

    useEffect(() => {
        pollOnce();
        const tick = () => {
            pollOnce();
            const interval = isReceiving ? POLL_MS_ACTIVE : POLL_MS_IDLE;
            pollTimerRef.current = setTimeout(tick, interval);
        };
        pollTimerRef.current = setTimeout(tick, isReceiving ? POLL_MS_ACTIVE : POLL_MS_IDLE);
        return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); };
    }, [isReceiving, pollOnce]);

    // ── Commands (HTTP) ──────────────────────────────────────
    const sendEnrollCommand = async (name) => {
        setLastMemory(null);
        setOperationStatus('recording');
        setIsReceiving(true);
        commandStartRef.current = Date.now();
        try {
            const r = await fetch(`${AI_URL}/api/bracelet/enroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            if (!r.ok) {
                const err = await r.json().catch(() => ({}));
                throw new Error(err.detail || `HTTP ${r.status}`);
            }
            // Bracelet is now recording → next polls will pick up status
            return true;
        } catch (e) {
            setOperationStatus('error');
            setIsReceiving(false);
            setLastMemory(`ERROR: ${e.message}`);
            commandStartRef.current = 0;
            return false;
        }
    };

    const startMemoryRecording = async () => {
        setLastMemory(null);
        setOperationStatus('recording');
        setIsReceiving(true);
        commandStartRef.current = Date.now();
        try {
            const r = await fetch(`${AI_URL}/api/bracelet/record`, { method: 'POST' });
            if (!r.ok) {
                const err = await r.json().catch(() => ({}));
                throw new Error(err.detail || `HTTP ${r.status}`);
            }
            return true;
        } catch (e) {
            setOperationStatus('error');
            setIsReceiving(false);
            setLastMemory(`ERROR: ${e.message}`);
            commandStartRef.current = 0;
            return false;
        }
    };

    const sendResetCommand = async () => {
        commandStartRef.current = 0;
        setOperationStatus('idle');
        setIsReceiving(false);
        try {
            await fetch(`${AI_URL}/api/bracelet/reset`, { method: 'POST' });
        } catch (e) { /* ignore */ }
    };

    // No-ops kept for compatibility with old call sites
    const setAutoRecordEnabled = async (_enabled) => {};
    const reconnect            = () => { pollOnce(); };

    return (
        <BraceletContext.Provider value={{
            isConnected,
            isReceiving,
            lastMemory,
            operationStatus,
            sendEnrollCommand,
            sendResetCommand,
            setAutoRecordEnabled,
            startMemoryRecording,
            reconnect,
        }}>
            {children}
        </BraceletContext.Provider>
    );
};

export const useBLE = () => useContext(BraceletContext);

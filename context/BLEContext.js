/**
 * BLEContext.js — HTTP-polling replacement for the old BLE stack.
 *
 * The bracelet firmware no longer has BLE. It connects to the backend via
 * WebSocket over WiFi. The UI communicates exclusively through REST:
 *
 *   GET  /api/bracelet/status          → { online, job: { state, result } }
 *   POST /api/bracelet/enroll          → { name }
 *   POST /api/bracelet/record?seconds= → trigger memory recording
 *   POST /api/bracelet/reset           → clear job state
 *
 * The public API exposed by this context is kept identical to the old BLE
 * context so that every component (sub_member.js etc.) keeps working without
 * any changes.
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AI_URL } from '../constants/config';

const BLEContext = createContext();

const POLL_INTERVAL_MS = 1500;   // poll bracelet status every 1.5 s
const ONLINE_TIMEOUT_S = 30;     // bracelet considered offline after 30 s

export const BLEProvider = ({ children }) => {
    const [isConnected, setIsConnected]   = useState(false);
    const [isReceiving, setIsReceiving]   = useState(false);
    const [lastMemory,  setLastMemory]    = useState(null);

    // Internal: track the previous job state so we can detect transitions
    const prevJobState = useRef('idle');
    const pollTimer    = useRef(null);
    const isMounted    = useRef(true);

    // ── Poll /api/bracelet/status ─────────────────────────────
    const pollStatus = useCallback(async () => {
        try {
            const res = await fetch(`${AI_URL}/api/bracelet/status`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) return;
            const data = await res.json();

            if (!isMounted.current) return;

            // Connection flag
            setIsConnected(!!data.online);

            const job = data.job || {};
            const state = job.state || 'idle';

            // isReceiving = bracelet is actively doing something
            const busy = state === 'recording' || state === 'processing';
            setIsReceiving(busy);

            // Detect job completion: previous state was busy → now success/error
            const wasbusy = prevJobState.current === 'recording' || prevJobState.current === 'processing';
            if (wasbusy && (state === 'success' || state === 'error')) {
                if (job.result) {
                    setLastMemory(job.result);
                }
            }

            prevJobState.current = state;
        } catch (_) {
            // Network error — bracelet/server unreachable
            if (isMounted.current) {
                setIsConnected(false);
            }
        }
    }, []);

    // ── Start polling on mount ────────────────────────────────
    useEffect(() => {
        isMounted.current = true;
        pollStatus(); // immediate first check

        pollTimer.current = setInterval(pollStatus, POLL_INTERVAL_MS);

        return () => {
            isMounted.current = false;
            if (pollTimer.current) clearInterval(pollTimer.current);
        };
    }, [pollStatus]);

    // ── Commands ──────────────────────────────────────────────

    /**
     * Trigger a 3-second enrollment recording for `name`.
     * Equivalent to the old BLE `ENROLL <name>` command.
     * Can be called multiple times to build a stronger averaged voice profile.
     */
    const sendEnrollCommand = async (name) => {
        setLastMemory(null);
        setIsReceiving(true);
        prevJobState.current = 'recording';
        try {
            const res = await fetch(`${AI_URL}/api/bracelet/enroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            if (!res.ok) {
                console.warn('sendEnrollCommand: server error', res.status);
                setIsReceiving(false);
                prevJobState.current = 'idle';
            }
        } catch (e) {
            console.error('sendEnrollCommand failed:', e);
            setIsReceiving(false);
            prevJobState.current = 'idle';
        }
    };

    /**
     * Trigger a normal memory recording (default 5 s).
     * Equivalent to the old BLE `START` command.
     */
    const startMemoryRecording = async (seconds = 5) => {
        setLastMemory(null);
        setIsReceiving(true);
        prevJobState.current = 'recording';
        try {
            const res = await fetch(`${AI_URL}/api/bracelet/record?seconds=${seconds}`, {
                method: 'POST',
            });
            if (!res.ok) {
                setIsReceiving(false);
                prevJobState.current = 'idle';
            }
        } catch (e) {
            console.error('startMemoryRecording failed:', e);
            setIsReceiving(false);
            prevJobState.current = 'idle';
        }
    };

    /**
     * Clear the current job state on the server.
     * Equivalent to the old BLE `RESET` command.
     */
    const sendResetCommand = async () => {
        setIsReceiving(false);
        prevJobState.current = 'idle';
        try {
            await fetch(`${AI_URL}/api/bracelet/reset`, { method: 'POST' });
        } catch (e) {
            console.error('sendResetCommand failed:', e);
        }
    };

    /**
     * Auto-record enable/disable — no-op in the new architecture.
     * The bracelet auto-records based on server configuration; the UI
     * doesn't need to toggle this via a separate command.
     */
    const setAutoRecordEnabled = async (_enabled) => {
        // Not implemented in the server-driven architecture.
        // Left as no-op for API compatibility.
    };

    /**
     * "Reconnect" — in the old BLE world this re-scanned for the device.
     * In the new architecture the bracelet reconnects to the server automatically
     * via WebSocket. From the UI's perspective we just re-poll status.
     */
    const reconnect = () => {
        pollStatus();
    };

    return (
        <BLEContext.Provider value={{
            isConnected,
            isReceiving,
            lastMemory,
            sendEnrollCommand,
            sendResetCommand,
            setAutoRecordEnabled,
            startMemoryRecording,
            reconnect,
        }}>
            {children}
        </BLEContext.Provider>
    );
};

export const useBLE = () => useContext(BLEContext);

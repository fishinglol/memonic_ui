/**
 * RelayContext.js
 *
 * Phone-as-relay between ESP32 and Lightning AI server.
 *
 *   ESP32 →[UDP local WiFi]→ Phone →[WSS]→ Lightning AI
 *
 * Auto-start STREAM:
 *   ESP32 connects (first UDP packet) + WSS ready → auto-call stream/start
 *   Seamless, zero-tap recording.
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AI_URL } from '../constants/config';

// react-native-udp requires a native dev build — gracefully degrade if unavailable
let dgram = null;
try {
    dgram = require('react-native-udp');
} catch (e) {
    console.warn('[RelayContext] react-native-udp not available (need native build):', e.message);
}

let NetworkInfo = null;
try {
    NetworkInfo = require('react-native-network-info').NetworkInfo;
} catch (e) {
    console.warn('[RelayContext] react-native-network-info not available:', e.message);
}

const RelayContext = createContext();

const UDP_LISTEN_PORT = 5005;   // ESP32 → phone (audio)
const ESP32_CMD_PORT  = 5006;   // phone → ESP32 (commands)
const WS_URL          = 'wss://8001-01kkh2et3bdjymj2fjq6jabg8k.cloudspaces.litng.ai/ws/audio';
const RECONNECT_MS    = 3000;

export const RelayProvider = ({ children }) => {
    const [phoneIP, setPhoneIP]         = useState('—');
    const [udpReady, setUdpReady]       = useState(false);
    const [wsReady, setWsReady]         = useState(false);
    const [esp32Addr, setEsp32Addr]     = useState(null);
    const [streaming, setStreaming]     = useState(false);  // auto-stream state
    const [bytesIn, setBytesIn]         = useState(0);
    const [bytesOut, setBytesOut]       = useState(0);

    const udpSocketRef    = useRef(null);
    const wsRef           = useRef(null);
    const esp32AddrRef    = useRef(null);
    const wsReadyRef      = useRef(false);   // sync ref for use inside callbacks
    const streamingRef    = useRef(false);   // prevent double-start
    const reconnectTimerRef = useRef(null);

    // ── Throttle byte counter ─────────────────────────────────
    const byteAccumRef = useRef({ in: 0, out: 0, lastFlush: 0 });
    const bumpBytes = (dir, n) => {
        byteAccumRef.current[dir] += n;
        const now = Date.now();
        if (now - byteAccumRef.current.lastFlush > 500) {
            setBytesIn(prev => prev + byteAccumRef.current.in);
            setBytesOut(prev => prev + byteAccumRef.current.out);
            byteAccumRef.current.in = 0;
            byteAccumRef.current.out = 0;
            byteAccumRef.current.lastFlush = now;
        }
    };

    // ── Auto-start STREAM when ESP32 + WSS both ready ─────────
    const autoStartStream = useCallback(async () => {
        if (streamingRef.current) return;           // already streaming
        if (!esp32AddrRef.current) return;          // ESP32 not seen yet
        if (!wsReadyRef.current) return;            // WSS not ready yet

        streamingRef.current = true;
        setStreaming(true);
        console.log('[RelayContext] 🎙️ Auto-starting STREAM...');

        try {
            const res = await fetch(`${AI_URL}/api/bracelet/stream/start`, { method: 'POST' });
            if (res.ok) {
                console.log('[RelayContext] ✅ Stream started automatically');
            } else {
                console.warn('[RelayContext] ⚠️ Stream start failed:', res.status);
                streamingRef.current = false;
                setStreaming(false);
            }
        } catch (e) {
            console.warn('[RelayContext] ⚠️ Stream start error:', e.message);
            streamingRef.current = false;
            setStreaming(false);
        }
    }, []);

    // ── Get phone LAN IP ──────────────────────────────────────
    useEffect(() => {
        NetworkInfo.getIPV4Address().then(ip => {
            if (ip) setPhoneIP(ip);
        }).catch(() => {});
    }, []);

    // ── UDP socket: receive audio from ESP32 ──────────────────
    useEffect(() => {
        const sock = dgram.createSocket({ type: 'udp4' });
        udpSocketRef.current = sock;

        sock.bind(UDP_LISTEN_PORT, '0.0.0.0', () => {
            console.log(`[RelayContext] UDP listening on :${UDP_LISTEN_PORT}`);
            setUdpReady(true);
        });

        sock.on('message', (data, rinfo) => {
            // First packet from ESP32 → save address + trigger auto-start
            const newAddr = { ip: rinfo.address, port: ESP32_CMD_PORT };
            const isNewDevice = !esp32AddrRef.current || esp32AddrRef.current.ip !== newAddr.ip;
            if (isNewDevice) {
                esp32AddrRef.current = newAddr;
                setEsp32Addr(newAddr);
                console.log(`[RelayContext] 📡 ESP32 connected: ${newAddr.ip}`);
                streamingRef.current = false;  // reset so new device triggers stream
                autoStartStream();
            }

            // Try as text (HELLO, STOP, etc.)
            let asText = null;
            try {
                asText = data.toString('utf8').trim();
                if (!/^[\x20-\x7E\r\n]+$/.test(asText)) asText = null;
            } catch { asText = null; }

            const ws = wsRef.current;
            if (!ws || ws.readyState !== 1) return;

            if (asText && asText.length > 0 && asText.length < 200) {
                ws.send(asText);
                bumpBytes('out', asText.length);
            } else {
                ws.send(data);
                bumpBytes('out', data.length);
            }
            bumpBytes('in', data.length);
        });

        sock.on('error', e => console.error('[RelayContext] UDP error', e));

        return () => {
            try { sock.close(); } catch {}
            udpSocketRef.current = null;
            setUdpReady(false);
        };
    }, [autoStartStream]);

    // ── WebSocket: connect to Lightning AI ────────────────────
    const connectWS = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === 1) return;

        console.log('[RelayContext] WS connecting:', WS_URL);
        const ws = new WebSocket(WS_URL);
        ws.binaryType = 'arraybuffer';
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('[RelayContext] WS connected');
            wsReadyRef.current = true;
            setWsReady(true);
            ws.send('HELLO');
            // If ESP32 already connected before WS came up → start now
            autoStartStream();
        };

        ws.onmessage = (evt) => {
            const sock = udpSocketRef.current;
            const addr = esp32AddrRef.current;
            if (!sock || !addr) return;

            const payload = typeof evt.data === 'string'
                ? evt.data
                : new Uint8Array(evt.data);

            sock.send(
                payload,
                0,
                payload.length,
                addr.port,
                addr.ip,
                (err) => { if (err) console.warn('[RelayContext] UDP send err', err); }
            );
        };

        ws.onerror = (e) => {
            console.warn('[RelayContext] WS error', e?.message || e);
        };

        ws.onclose = () => {
            console.log('[RelayContext] WS closed — reconnecting in', RECONNECT_MS, 'ms');
            wsReadyRef.current = false;
            streamingRef.current = false;  // will re-trigger stream on reconnect
            setWsReady(false);
            setStreaming(false);
            wsRef.current = null;
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = setTimeout(connectWS, RECONNECT_MS);
        };
    }, [autoStartStream]);

    useEffect(() => {
        connectWS();
        return () => {
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            try { wsRef.current?.close(); } catch {}
        };
    }, [connectWS]);

    return (
        <RelayContext.Provider value={{
            phoneIP,
            udpListenPort: UDP_LISTEN_PORT,
            udpReady,
            wsReady,
            esp32Addr,
            streaming,
            bytesIn,
            bytesOut,
        }}>
            {children}
        </RelayContext.Provider>
    );
};

export const useRelay = () => useContext(RelayContext);

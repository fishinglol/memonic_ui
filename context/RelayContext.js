/**
 * RelayContext.js
 *
 * Phone-as-relay between ESP32 and Lightning AI server.
 *
 *   ESP32 →[UDP local WiFi]→ Phone →[WSS]→ Lightning AI
 *
 * Forwards:
 *   - audio bytes:   UDP in  → WSS send
 *   - commands:      WSS in  → UDP out (back to ESP32)
 *
 * Replaces relay.py on Mac.
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import dgram from 'react-native-udp';
import { NetworkInfo } from 'react-native-network-info';

const RelayContext = createContext();

// Match relay.py
const UDP_LISTEN_PORT = 5005;   // ESP32 → phone (audio)
const ESP32_CMD_PORT  = 5006;   // phone → ESP32 (commands)
const WS_URL          = 'wss://8001-01kkh2et3bdjymj2fjq6jabg8k.cloudspaces.litng.ai/ws/audio';
const RECONNECT_MS    = 3000;

export const RelayProvider = ({ children }) => {
    const [phoneIP, setPhoneIP]         = useState('—');
    const [udpReady, setUdpReady]       = useState(false);
    const [wsReady, setWsReady]         = useState(false);
    const [esp32Addr, setEsp32Addr]     = useState(null);  // {ip, port}
    const [bytesIn, setBytesIn]         = useState(0);
    const [bytesOut, setBytesOut]       = useState(0);

    const udpSocketRef = useRef(null);
    const wsRef        = useRef(null);
    const esp32AddrRef = useRef(null);
    const reconnectTimerRef = useRef(null);

    // Throttle byte counter updates so React doesn't choke
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

    // ── Get phone's LAN IP so user knows what to put in ESP32 ─
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
            // Remember ESP32 address for command return path
            const newAddr = { ip: rinfo.address, port: ESP32_CMD_PORT };
            if (!esp32AddrRef.current || esp32AddrRef.current.ip !== newAddr.ip) {
                esp32AddrRef.current = newAddr;
                setEsp32Addr(newAddr);
                console.log(`[RelayContext] ESP32 first seen: ${newAddr.ip}`);
            }

            // Try as text first (HELLO, STOP, etc.)
            let asText = null;
            try {
                asText = data.toString('utf8').trim();
                // Heuristic: if all chars are printable, treat as text
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
    }, []);

    // ── WebSocket: connect to Lightning AI ────────────────────
    const connectWS = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === 1) return;

        console.log('[RelayContext] WS connecting:', WS_URL);
        const ws = new WebSocket(WS_URL);
        ws.binaryType = 'arraybuffer';
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('[RelayContext] WS connected');
            setWsReady(true);
            ws.send('HELLO');
        };

        ws.onmessage = (evt) => {
            // Server → ESP32 (commands)
            const sock = udpSocketRef.current;
            const addr = esp32AddrRef.current;
            if (!sock || !addr) return;

            const payload = typeof evt.data === 'string'
                ? evt.data
                : new Uint8Array(evt.data);

            sock.send(
                payload,
                0,
                typeof payload === 'string' ? payload.length : payload.length,
                addr.port,
                addr.ip,
                (err) => {
                    if (err) console.warn('[RelayContext] UDP send err', err);
                }
            );
        };

        ws.onerror = (e) => {
            console.warn('[RelayContext] WS error', e?.message || e);
        };

        ws.onclose = () => {
            console.log('[RelayContext] WS closed — reconnecting in', RECONNECT_MS, 'ms');
            setWsReady(false);
            wsRef.current = null;
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = setTimeout(connectWS, RECONNECT_MS);
        };
    }, []);

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
            bytesIn,
            bytesOut,
        }}>
            {children}
        </RelayContext.Provider>
    );
};

export const useRelay = () => useContext(RelayContext);

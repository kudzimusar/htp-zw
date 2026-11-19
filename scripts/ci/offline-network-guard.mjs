// HT-MVP-PUBLIC-LAUNCH-01-G5 (N5): fail-closed offline network guard.
// When loaded via `node --import ./scripts/ci/offline-network-guard.mjs` with
// HT_OFFLINE_ONLY=1, any outbound non-loopback network attempt via fetch(),
// http(s).request(), or net.connect() throws OFFLINE_NETWORK_VIOLATION.
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

function isLoopbackHost(host) {
  if (!host) return false;
  const clean = String(host).trim().toLowerCase().replace(/^\[|\]$/g, '');
  return LOOPBACK_HOSTS.has(clean) || clean === '127.0.0.1' || clean === '::1';
}

function hostFromUrl(input) {
  try {
    const raw = typeof input === 'string' ? input : (input instanceof URL ? input.href : String(input?.url || ''));
    if (!raw) return '';
    return new URL(raw).hostname;
  } catch {
    return '';
  }
}

function offlineError(kind, target) {
  const err = new Error(`OFFLINE_NETWORK_VIOLATION: ${kind} attempted outbound non-loopback access to ${target} while HT_OFFLINE_ONLY=1`);
  err.code = 'OFFLINE_NETWORK_VIOLATION';
  return err;
}

export function guardOfflineTarget(kind, target) {
  const host = kind === 'fetch' ? hostFromUrl(target) : String(target || '').split(':')[0];
  if (host && !isLoopbackHost(host)) {
    throw offlineError(kind, host);
  }
  return true;
}

if (process.env.HT_OFFLINE_ONLY === '1') {
  const originalFetch = globalThis.fetch;
  if (typeof originalFetch === 'function') {
    globalThis.fetch = function guardedFetch(input, init) {
      const host = hostFromUrl(input);
      if (host && !isLoopbackHost(host)) {
        return Promise.reject(offlineError('fetch', host));
      }
      return originalFetch.call(this, input, init);
    };
  }

  for (const [mod, label] of [[http, 'http'], [https, 'https']]) {
    const origRequest = mod.request;
    const origGet = mod.get;
    mod.request = function guardedRequest(urlOrOpts, ...rest) {
      const host = typeof urlOrOpts === 'string' || urlOrOpts instanceof URL
        ? hostFromUrl(urlOrOpts)
        : (urlOrOpts?.hostname || urlOrOpts?.host || '');
      if (host && !isLoopbackHost(String(host).split(':')[0])) {
        throw offlineError(`${label}.request`, host);
      }
      return origRequest.call(this, urlOrOpts, ...rest);
    };
    mod.get = function guardedGet(urlOrOpts, ...rest) {
      const host = typeof urlOrOpts === 'string' || urlOrOpts instanceof URL
        ? hostFromUrl(urlOrOpts)
        : (urlOrOpts?.hostname || urlOrOpts?.host || '');
      if (host && !isLoopbackHost(String(host).split(':')[0])) {
        throw offlineError(`${label}.get`, host);
      }
      return origGet.call(this, urlOrOpts, ...rest);
    };
  }

  const origConnect = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function guardedConnect(...args) {
    const first = args[0];
    let host = '';
    if (typeof first === 'object' && first !== null) {
      host = first.host || first.hostname || '';
    } else if (typeof args[1] === 'string') {
      host = args[1];
    }
    if (host && !isLoopbackHost(host)) {
      throw offlineError('net.connect', host);
    }
    return origConnect.apply(this, args);
  };
}

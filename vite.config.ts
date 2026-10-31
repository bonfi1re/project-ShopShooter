import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

const hmrPolyfillScript = `/* Patched WebSocket to suppress Vite HMR disconnect in AI Studio iframe */
(function() {
  if (typeof window === 'undefined') return;
  window.addEventListener('unhandledrejection', function(event) {
    var reason = event && (event.reason ? (event.reason.message || event.reason) : '');
    if (typeof reason === 'string' && (
      reason.indexOf('WebSocket') !== -1 ||
      reason.indexOf('vite:ws') !== -1 ||
      reason.indexOf('vite-hmr') !== -1 ||
      reason.indexOf('transport') !== -1 ||
      reason.indexOf('closed without opened') !== -1
    )) {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('error', function(event) {
    var msg = (event && event.message) || '';
    if (typeof msg === 'string' && (
      msg.indexOf('WebSocket') !== -1 ||
      msg.indexOf('vite-hmr') !== -1 ||
      msg.indexOf('closed without opened') !== -1
    )) {
      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    }
  }, true);

  var OriginalWebSocket = window.WebSocket;
  if (!OriginalWebSocket) return;

  function isViteHmr(protocols, url) {
    if (protocols === 'vite-hmr') return true;
    if (Array.isArray(protocols) && protocols.indexOf('vite-hmr') !== -1) return true;
    if (typeof url === 'string' && (url.indexOf('vite-hmr') !== -1 || url.indexOf('/@vite/client') !== -1 || url.indexOf('token=') !== -1)) return true;
    return false;
  }

  function ViteMockSocket(url, protocols) {
    var target = new EventTarget();
    Object.setPrototypeOf(target, OriginalWebSocket.prototype);
    Object.defineProperty(target, 'readyState', { value: 1, writable: true });
    Object.defineProperty(target, 'OPEN', { value: 1 });
    Object.defineProperty(target, 'CONNECTING', { value: 0 });
    Object.defineProperty(target, 'CLOSING', { value: 2 });
    Object.defineProperty(target, 'CLOSED', { value: 3 });
    target.url = url;
    target.protocol = 'vite-hmr';
    target.extensions = '';
    target.bufferedAmount = 0;
    target.binaryType = 'blob';
    target.send = function() {};
    target.close = function() {
      target.readyState = 3;
    };

    setTimeout(function() {
      if (target.readyState === 1) {
        var openEv = new Event('open');
        target.dispatchEvent(openEv);
        if (typeof target.onopen === 'function') target.onopen(openEv);
        var msgEv = new MessageEvent('message', {
          data: JSON.stringify({ type: 'connected' })
        });
        target.dispatchEvent(msgEv);
        if (typeof target.onmessage === 'function') target.onmessage(msgEv);
      }
    }, 0);

    return target;
  }

  function PatchedWebSocket(url, protocols) {
    if (isViteHmr(protocols, url)) {
      return ViteMockSocket(url, protocols);
    }
    return new OriginalWebSocket(url, protocols);
  }

  PatchedWebSocket.prototype = OriginalWebSocket.prototype;
  Object.assign(PatchedWebSocket, OriginalWebSocket);
  PatchedWebSocket.CONNECTING = 0;
  PatchedWebSocket.OPEN = 1;
  PatchedWebSocket.CLOSING = 2;
  PatchedWebSocket.CLOSED = 3;

  window.WebSocket = PatchedWebSocket;
})();`;

function suppressViteHmrPlugin(): Plugin {
  return {
    name: 'suppress-vite-hmr',
    enforce: 'post',
    transformIndexHtml(html) {
      if (html.includes('/@vite/client')) {
        return html.replace(
          '<script type="module" src="/@vite/client"></script>',
          `<script type="text/javascript">${hmrPolyfillScript}</script>\n    <script type="module" src="/@vite/client"></script>`
        );
      }
      return html;
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [suppressViteHmrPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});


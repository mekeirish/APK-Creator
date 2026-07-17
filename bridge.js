/**
 * AppBridge — Couteau Suisse pour Capacitor + Web
 * Version 2.1 — Compatibilité ES5, Promesses unifiées, pas de spread operator
 */
(function(){
  'use strict';

  var C = window.Capacitor;
  var isNative = function() { return !!(C && C.Plugins); };
  var getPlugin = function(name) { return C?.Plugins?.[name] || null; };
  var log = function(msg) { console.log('[Bridge]', msg); };

  window.AppBridge = {

    // === DÉTECTION ===
    isNative: isNative,
    getPlugin: getPlugin,
    platform: function() { return C?.getPlatform?.() || 'web'; },

    // === 1. HAPTICS ===
    haptics: {
      vibrate: function(duration) {
        duration = duration || 200;
        var p = getPlugin('Haptics');
        if (p) { p.vibrate({ duration: duration }); return; }
        if (navigator.vibrate) { navigator.vibrate(duration); return; }
        log('Vibration non supportée');
      },
      impact: function(style) {
        style = style || 'MEDIUM';
        var p = getPlugin('Haptics');
        if (p) { p.impact({ style: style }); return; }
        log('Impact haptique non supporté');
      }
    },

    // === 2. STOCKAGE — UNIFICATION PROMESSES ===
    storage: {
      set: function(key, value) {
        var val = typeof value === 'string' ? value : JSON.stringify(value);
        var p = getPlugin('Preferences');
        if (p) { p.set({ key: key, value: val }); return; }
        localStorage.setItem(key, val);
      },
      get: function(key) {
        var p = getPlugin('Preferences');
        if (p) {
          // Mode natif : retourne une Promesse
          return p.get({ key: key }).then(function(r) {
            try { return JSON.parse(r.value); } catch { return r.value; }
          });
        }
        // Mode web : retourne aussi une Promesse pour uniformiser
        var val = localStorage.getItem(key);
        try {
          return Promise.resolve(JSON.parse(val));
        } catch {
          return Promise.resolve(val);
        }
      },
      remove: function(key) {
        var p = getPlugin('Preferences');
        if (p) { p.remove({ key: key }); return; }
        localStorage.removeItem(key);
      },
      clear: function() {
        var p = getPlugin('Preferences');
        if (p) { p.clear(); return; }
        localStorage.clear();
      }
    },

    // === 3. PARTAGE ===
    share: function(data) {
      var p = getPlugin('Share');
      if (p) { p.share(data); return; }
      if (navigator.share) { navigator.share(data); return; }
      log('Partage non supporté');
      if (data.url) window.open(data.url, '_blank');
    },

    // === 4. GÉOLOCALISATION ===
    geolocation: {
      getCurrentPosition: function(options) {
        options = options || {};
        var p = getPlugin('Geolocation');
        if (p) { return p.getCurrentPosition(options); }
        if (navigator.geolocation) {
          return new Promise(function(resolve, reject) {
            navigator.geolocation.getCurrentPosition(resolve, reject, options);
          });
        }
        return Promise.reject(new Error('Géolocalisation non supportée'));
      },
      watchPosition: function(callback, options) {
        options = options || {};
        var p = getPlugin('Geolocation');
        if (p) { return p.watchPosition(options, callback); }
        if (navigator.geolocation) {
          return navigator.geolocation.watchPosition(callback, null, options);
        }
        log('WatchPosition non supporté');
        return null;
      }
    },

    // === 5. CAMÉRA ===
    camera: {
      getPhoto: function(options) {
        options = options || { quality: 80 };
        var p = getPlugin('Camera');
        if (p) { return p.getPhoto(options); }
        return new Promise(function(resolve) {
          var input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = function(e) {
            var file = e.target.files[0];
            if (!file) { resolve(null); return; }
            var reader = new FileReader();
            reader.onload = function(ev) {
              resolve({ webPath: ev.target.result, format: 'jpg', file: file });
            };
            reader.readAsDataURL(file);
          };
          input.click();
        });
      }
    },

    // === 6. SCANNER QR ===
    barcode: {
      scan: function(options) {
        options = options || {};
        var p = getPlugin('BarcodeScanner');
        if (p) { return p.scan(options); }
        log('BarcodeScanner non supporté en web');
        return Promise.resolve(null);
      }
    },

    // === 7. RÉSEAU ===
    network: {
      getStatus: function() {
        var p = getPlugin('Network');
        if (p) { return p.getStatus(); }
        return Promise.resolve({ connected: navigator.onLine, connectionType: 'unknown' });
      },
      onStatusChange: function(callback) {
        var p = getPlugin('Network');
        if (p) { p.addListener('networkStatusChange', callback); return; }
        window.addEventListener('online', function() { callback({ connected: true }); });
        window.addEventListener('offline', function() { callback({ connected: false }); });
      }
    },

    // === 8. BIOMÉTRIE ===
    biometric: {
      isAvailable: function() {
        var p = getPlugin('Biometric');
        if (p) { return p.isAvailable().then(function(r) { return r.isAvailable; }); }
        return Promise.resolve(false);
      },
      verify: function(options) {
        options = options || { reason: 'Authentification requise' };
        var p = getPlugin('Biometric');
        if (p) { return p.verify(options); }
        return Promise.reject(new Error('Biométrie non disponible'));
      }
    },

    // === 9. KEEP AWAKE ===
    keepAwake: {
      enable: function() {
        var p = getPlugin('Device');
        if (p) { p.setKeepAwake({ keepAwake: true }); return; }
        log('KeepAwake non supporté');
      },
      disable: function() {
        var p = getPlugin('Device');
        if (p) { p.setKeepAwake({ keepAwake: false }); return; }
        log('KeepAwake non supporté');
      }
    },

    // === 10. BADGE ===
    badge: {
      set: function(count) {
        var p = getPlugin('Badge');
        if (p) { p.set({ count: count }); return; }
        if (navigator.setAppBadge) { navigator.setAppBadge(count); return; }
        log('Badge non supporté');
      },
      clear: function() {
        var p = getPlugin('Badge');
        if (p) { p.clear(); return; }
        if (navigator.clearAppBadge) { navigator.clearAppBadge(); return; }
        log('Badge non supporté');
      }
    },

    // === 11. ORIENTATION ===
    orientation: {
      lock: function(orientation) {
        orientation = orientation || 'portrait';
        var p = getPlugin('ScreenOrientation');
        if (p) { p.orientation(orientation); return; }
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock(orientation);
          return;
        }
        log('Orientation lock non supportée');
      },
      unlock: function() {
        var p = getPlugin('ScreenOrientation');
        if (p) { p.unlock(); return; }
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
          return;
        }
        log('Orientation unlock non supportée');
      },
      getCurrent: function() {
        if (screen.orientation) return screen.orientation.type;
        return window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape';
      }
    },

    // === 12. NOTIFICATIONS — Object.assign à la place du spread ===
    notifications: {
      requestPermission: function() {
        var p = getPlugin('PushNotifications');
        if (p) {
          return p.requestPermissions().then(function(r) {
            return r.receive === 'granted';
          });
        }
        if (Notification.permission !== 'granted') {
          return Notification.requestPermission().then(function(r) {
            return r === 'granted';
          });
        }
        return Promise.resolve(true);
      },
      sendLocal: function(title, body, options) {
        options = options || {};
        if (Notification.permission === 'granted') {
          new Notification(title, Object.assign({ body: body }, options));
        } else {
          log('Notification non autorisée');
        }
      }
    },

    // === 13. FICHIERS ===
    files: {
      download: function(url, filename) {
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    },

    // === 14. CLIPBOARD ===
    clipboard: {
      copy: function(text) {
        try {
          if (navigator.clipboard) {
            return navigator.clipboard.writeText(text).then(function() { return true; });
          }
          var ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          return Promise.resolve(true);
        } catch {
          return Promise.resolve(false);
        }
      },
      paste: function() {
        try {
          if (navigator.clipboard) {
            return navigator.clipboard.readText();
          }
          return Promise.resolve(null);
        } catch {
          return Promise.resolve(null);
        }
      }
    },

    // === 15. APPAREIL ===
    device: {
      getInfo: function() {
        var p = getPlugin('Device');
        if (p) { return p.getInfo(); }
        return {
          platform: 'web',
          model: navigator.userAgent,
          osVersion: navigator.userAgent,
          manufacturer: 'web'
        };
      },
      getBatteryLevel: function() {
        if (navigator.getBattery) {
          return navigator.getBattery().then(function(b) { return b.level; });
        }
        return Promise.resolve(null);
      }
    },

    // === 16. SON ===
    sound: {
      beep: function(duration, frequency) {
        duration = duration || 200;
        frequency = frequency || 440;
        try {
          var ctx = new (window.AudioContext || window.webkitAudioContext)();
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = frequency;
          gain.gain.value = 0.15;
          osc.start();
          setTimeout(function() { osc.stop(); }, duration);
        } catch {
          log('Son non supporté');
        }
      }
    },

    // === 17. OUVRIR URL ===
    openUrl: function(url) {
      var p = getPlugin('Browser');
      if (p) {
        p.open({ url: url });
      } else {
        window.open(url, '_blank');
      }
    },

    // === 18. TOAST ===
    toast: function(message, duration) {
      duration = duration || 2000;
      var p = getPlugin('Toast');
      if (p) {
        p.show({ text: message, duration: 'short' });
        return;
      }
      var div = document.createElement('div');
      div.textContent = message;
      div.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#fff;padding:12px 24px;border-radius:12px;font-size:14px;z-index:999;font-family:sans-serif;transition:opacity 0.3s;';
      document.body.appendChild(div);
      setTimeout(function() {
        div.style.opacity = '0';
        setTimeout(function() { div.remove(); }, 300);
      }, duration);
    }
  };

  console.log('🔌 AppBridge chargé — mode:', AppBridge.isNative() ? 'Natif' : 'Web');
})();

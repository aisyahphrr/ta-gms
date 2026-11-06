// =============================================================================
// GENSET MONITORING SYSTEM (GMS) — Dashboard Client Core
// Demo Sidang TA • Single Page Read-Only Architecture
// Ref: R3 Final & Detail Scope Teknis v1.1 PT MASCH
//
// 2 mode eksplisit, tanpa auto-fallback — transisi HANYA lewat tombol user.
// Zero Logic in Frontend: app.js hanya Presentation Layer.
// Semua kalkulasi (threshold, hour meter, SFC, alarm) ada di backend/firmware.
// =============================================================================

(function () {
  'use strict';

  // ===========================================================================
  // 1. DEFINISI MODE & DEFAULT CONFIGURATION
  // ===========================================================================
  const MODES = {
    LIVE: 'LIVE',
    OFFLINE: 'OFFLINE'
  };

  const DEFAULT_CONFIG = {
    mastifyHost: 'http://178.128.107.238:8080',
    deviceId: '7150e8b0-c2d0-11f1-b703-2ff028a3ac15',
    jwtToken: '',
    username: '',
    password: '',
    pollingIntervalMs: 3000
  };

  // State runtime aplikasi
  const state = {
    currentMode: MODES.LIVE,
    config: Object.assign({}, DEFAULT_CONFIG),
    pollTimer: null,
    clockTimer: null,
    activeChartFilter: 'all', // 'all' | 'temp' | 'press' | 'load' | 'volt'
    chartInstance: null,
    offlineFrameIndex: 0,
    currentAlarms: [],
    alarmLog: [], // default bersih: Tidak Ada Alarm Aktif (Sistem Normal)
    activeSimulation: 'normal', // 'normal' | 'temp' | 'oil' | 'voltage' | 'freq' | 'imbalance' | 'sensor_ai1'
    username: '',
    password: ''
  };

  // ===========================================================================
  // 2. DATASET LOKAL STATIS (OFFLINE MODE DEMO SIDANG)
  // Data matang riil hasil rekaman ESP32-S3 & Mastify Rule Chain
  // ===========================================================================
  const OFFLINE_CAPTURED_DATA = {
    // Snapshot telemetri berputar siklik untuk demo sidang
    frames: [
            {
        engine_state: 'RUNNING',
        engine_state_note: 'Mesin Beroperasi Nominal • Menyuplai Beban',
        engine_temp_c: 83.4,
        temp_status: 'NORMAL',
        oil_press_bar: 3.65,
        press_status: 'NORMAL',
        load_pct: 69.5,
        load_status: 'NORMAL',
        fuel_level_mm: 725.0,
        fuel_status: 'NORMAL',
        battery_v: 26.8,
        freq_hz: 50.0,
        v_unbal_pct: 0.5,
        voltage_balance: 'SEIMBANG (NORMAL)',
        v_l1: 227.5,
        v_l2: 228.0,
        v_l3: 230.2,
        run_hours: 1284.5,
        maint_due_h: 15.5,
        maintenance_status: 'SIAP OPERASI',
        fuel_est_l: 344.2,
        i_l1: 77.7, i_l2: 37.4, i_l3: 39.9,
        p_kw: 33.4, s_kva: 35.3, pf: 0.94,
        i_unbal_pct: 18.5,
        ai1_st: 'OK', ai2_st: 'OK', ai3_st: 'OK',
        fuel_vol_l: 367.5
      },
      {
        engine_state: 'RUNNING',
        engine_state_note: 'Mesin Beroperasi Nominal • Menyuplai Beban',
        engine_temp_c: 83.2,
        temp_status: 'NORMAL',
        oil_press_bar: 3.62,
        press_status: 'NORMAL',
        load_pct: 68.2,
        load_status: 'NORMAL',
        fuel_level_mm: 724.0,
        fuel_status: 'NORMAL',
        battery_v: 26.8,
        freq_hz: 50.0,
        v_unbal_pct: 0.6,
        voltage_balance: 'SEIMBANG (NORMAL)',
        v_l1: 227.2,
        v_l2: 227.9,
        v_l3: 230.1,
        run_hours: 1284.5,
        maint_due_h: 15.5,
        maintenance_status: 'SIAP OPERASI',
        fuel_est_l: 344.6,
        i_l1: 76.9, i_l2: 37.1, i_l3: 39.5,
        p_kw: 33.0, s_kva: 34.9, pf: 0.94,
        i_unbal_pct: 18.2,
        ai1_st: 'OK', ai2_st: 'OK', ai3_st: 'OK',
        fuel_vol_l: 367.8
      },
      {
        engine_state: 'RUNNING',
        engine_state_note: 'Mesin Beroperasi Nominal • Menyuplai Beban',
        engine_temp_c: 83.6,
        temp_status: 'NORMAL',
        oil_press_bar: 3.60,
        press_status: 'NORMAL',
        load_pct: 71.0,
        load_status: 'NORMAL',
        fuel_level_mm: 721.0,
        fuel_status: 'NORMAL',
        battery_v: 26.7,
        freq_hz: 50.0,
        v_unbal_pct: 0.7,
        voltage_balance: 'SEIMBANG (NORMAL)',
        v_l1: 226.8,
        v_l2: 227.5,
        v_l3: 229.8,
        run_hours: 1284.5,
        maint_due_h: 15.5,
        maintenance_status: 'SIAP OPERASI',
        fuel_est_l: 345.0,
        i_l1: 78.2, i_l2: 37.8, i_l3: 40.1,
        p_kw: 34.1, s_kva: 36.0, pf: 0.95,
        i_unbal_pct: 18.8,
        ai1_st: 'OK', ai2_st: 'OK', ai3_st: 'OK',
        fuel_vol_l: 368.0
      },
      {
        engine_state: 'RUNNING',
        engine_state_note: 'Mesin Beroperasi Nominal • Menyuplai Beban',
        engine_temp_c: 83.8,
        temp_status: 'NORMAL',
        oil_press_bar: 3.58,
        press_status: 'NORMAL',
        load_pct: 72.1,
        load_status: 'NORMAL',
        fuel_level_mm: 719.0,
        fuel_status: 'NORMAL',
        battery_v: 26.8,
        freq_hz: 50.0,
        v_unbal_pct: 0.6,
        voltage_balance: 'SEIMBANG (NORMAL)',
        v_l1: 227.0,
        v_l2: 227.6,
        v_l3: 229.9,
        run_hours: 1284.5,
        maint_due_h: 15.5,
        maintenance_status: 'SIAP OPERASI',
        fuel_est_l: 345.4,
        i_l1: 79.0, i_l2: 38.2, i_l3: 40.4,
        p_kw: 34.5, s_kva: 36.4, pf: 0.95,
        i_unbal_pct: 18.6,
        ai1_st: 'OK', ai2_st: 'OK', ai3_st: 'OK',
        fuel_vol_l: 368.3
      },
      {
        engine_state: 'RUNNING',
        engine_state_note: 'Mesin Beroperasi Nominal • Menyuplai Beban',
        engine_temp_c: 83.0,
        temp_status: 'NORMAL',
        oil_press_bar: 3.64,
        press_status: 'NORMAL',
        load_pct: 69.8,
        load_status: 'NORMAL',
        fuel_level_mm: 717.0,
        fuel_status: 'NORMAL',
        battery_v: 26.8,
        freq_hz: 50.0,
        v_unbal_pct: 0.6,
        voltage_balance: 'SEIMBANG (NORMAL)',
        v_l1: 227.2,
        v_l2: 227.8,
        v_l3: 230.1,
        run_hours: 1284.5,
        maint_due_h: 15.5,
        maintenance_status: 'SIAP OPERASI',
        fuel_est_l: 345.9,
        i_l1: 77.5, i_l2: 37.3, i_l3: 39.8,
        p_kw: 33.3, s_kva: 35.2, pf: 0.94,
        i_unbal_pct: 18.4,
        ai1_st: 'OK', ai2_st: 'OK', ai3_st: 'OK',
        fuel_vol_l: 368.6
      },
      {
        engine_state: 'RUNNING',
        engine_state_note: 'Suhu Kembali Normal • Sistem Stabil',
        engine_temp_c: 83.1,
        temp_status: 'NORMAL',
        oil_press_bar: 3.60,
        press_status: 'NORMAL',
        load_pct: 68.9,
        load_status: 'NORMAL',
        fuel_level_mm: 715.0,
        fuel_status: 'NORMAL',
        battery_v: 26.8,
        freq_hz: 50.0,
        v_unbal_pct: 0.6,
        voltage_balance: 'SEIMBANG (NORMAL)',
        v_l1: 227.3,
        v_l2: 228.0,
        v_l3: 230.2,
        run_hours: 1284.5,
        maint_due_h: 15.5,
        maintenance_status: 'SIAP OPERASI',
        fuel_est_l: 346.3,
        i_l1: 76.8, i_l2: 37.0, i_l3: 39.4,
        p_kw: 32.9, s_kva: 34.8, pf: 0.94,
        i_unbal_pct: 18.1,
        ai1_st: 'OK', ai2_st: 'OK', ai3_st: 'OK',
        fuel_vol_l: 368.9
      }
    ],

    // Daftar alarm yang SEDANG AKTIF (Active Alarms)
    // 3 Tingkat Severity Resmi: NORMAL, MAJOR, CRITICAL
    activeAlarms: [
      {
        timestamp: '09:05:12',
        level: 'MAJOR',
        ruleType: 'ENGINE_TEMP',
        message: 'Suhu pendingin engine mendekati ambang batas peringatan (85.0°C).',
        ruleStatus: 'ACTIVE'
      },
      {
        timestamp: '08:42:19',
        level: 'MAJOR',
        ruleType: 'SENSOR_FAULT',
        message: 'Loop arus AI2 PT100 terdeteksi fluktuasi derau di luar batas valid (< 3.8mA).',
        ruleStatus: 'ACTIVE'
      }
    ],

    // Catatan kronologis lengkap (Alarm History)
    alarmHistory: [
      {
        timestamp: '09:12:45',
        level: 'NORMAL',
        ruleType: 'VOLTAGE_FAULT',
        message: 'Keseimbangan tegangan 3-fasa nominal (Deviasi NEMA 0.6%). Beban stabil 68.4%.',
        ruleStatus: 'CLEARED'
      },
      {
        timestamp: '09:05:12',
        level: 'MAJOR',
        ruleType: 'ENGINE_TEMP',
        message: 'Suhu pendingin engine mendekati ambang batas peringatan (85.0°C).',
        ruleStatus: 'ACTIVE'
      },
      {
        timestamp: '08:42:19',
        level: 'MAJOR',
        ruleType: 'SENSOR_FAULT',
        message: 'Loop arus AI2 PT100 terdeteksi fluktuasi derau di luar batas valid (< 3.8mA).',
        ruleStatus: 'ACTIVE'
      },
      {
        timestamp: '07:15:02',
        level: 'CRITICAL',
        ruleType: 'OIL_PRESSURE',
        message: 'Peringatan tekanan pelumas rendah saat start-up (di bawah 1.8 bar).',
        ruleStatus: 'ACKNOWLEDGED'
      },
      {
        timestamp: '06:30:15',
        level: 'MAJOR',
        ruleType: 'FREQ_FAULT',
        message: 'Frekuensi alternator sempat menyentuh 48.9 Hz sebelum kembali ke nominal 50.0 Hz.',
        ruleStatus: 'RESOLVED'
      },
      {
        timestamp: '06:00:00',
        level: 'NORMAL',
        ruleType: 'SENSOR_FAULT',
        message: 'Inisialisasi sistem telemetri 3-fasa sukses. Register Modbus RS485 EWIG tersinkron.',
        ruleStatus: 'CLEARED'
      }
    ]
  };

  // ===========================================================================
  // 3. CACHED DOM ELEMENTS
  // ===========================================================================
  const DOM = {
    // Header & Mode Controls
    btnModeLive: document.getElementById('btnModeLive'),
    btnModeOffline: document.getElementById('btnModeOffline'),
    statusDot: document.getElementById('statusDot'),
    dotOffline: document.getElementById('dotOffline'),
    dataSourceText: document.getElementById('dataSourceText'),
    realtimeClock: document.getElementById('realtimeClock'),
    lastSyncLabel: document.getElementById('lastSyncLabel'),

    // Panel 1: Status & Real-Time
    engineStateCard: document.getElementById('engineStateCard'),
    valEngineState: document.getElementById('valEngineState'),
    valEngSpeedRpm: document.getElementById('valEngSpeedRpm'),
    valIUnbalPct: document.getElementById('valIUnbalPct'),
    engineStateSub: document.getElementById('engineStateSub'),
    valBatteryV: document.getElementById('valBatteryV'),
    valFreqHz: document.getElementById('valFreqHz'),
    valEngineTemp: document.getElementById('valEngineTemp'),
    pillTempStatus: document.getElementById('pillTempStatus'),
    valOilPressure: document.getElementById('valOilPressure'),
    pillPressStatus: document.getElementById('pillPressStatus'),
    valFuelLevelMm: document.getElementById('valFuelLevelMm'),
    pillFuelStatus: document.getElementById('pillFuelStatus'),
    valLoadPct: document.getElementById('valLoadPct'),
    barLoadPct: document.getElementById('barLoadPct'),
    pillLoadStatus: document.getElementById('pillLoadStatus'),
    valV11: document.getElementById('valV11'),
    valV12: document.getElementById('valV12'),
    valV13: document.getElementById('valV13'),
    valUnbalPct: document.getElementById('valUnbalPct'),
    badgeVoltageBalance: document.getElementById('badgeVoltageBalance'),
    textVoltageBalance: document.getElementById('textVoltageBalance'),
    // v1.1 additions: 3-phase amps, power, current imbalance
    valI1: document.getElementById('valI1'),
    valI2: document.getElementById('valI2'),
    valI3: document.getElementById('valI3'),
    valPKw: document.getElementById('valPKw'),
    valSKva: document.getElementById('valSKva'),
    valPf: document.getElementById('valPf'),
    badgeIUnbal: document.getElementById('badgeIUnbal'),
    valFuelVolL: document.getElementById('valFuelVolL'),
    // v1.1 additions: settings modal
    btnOpenSettings: document.getElementById('btnOpenSettings'),
    settingsModal: document.getElementById('settingsModal'),
    btnCloseSettings: document.getElementById('btnCloseSettings'),
    btnCancelSettings: document.getElementById('btnCancelSettings'),
    btnSaveSettings: document.getElementById('btnSaveSettings'),
    inputHost: document.getElementById('inputHost'),
    inputDeviceId: document.getElementById('inputDeviceId'),
    inputUsername: document.getElementById('inputUsername'),
    inputPassword: document.getElementById('inputPassword'),
    inputToken: document.getElementById('inputToken'),

    // Panel 2: Timeseries Chart & Legend Items
    chartCanvas: document.getElementById('gmsTimeseriesChart'),
    chartMetricToggles: document.getElementById('chartMetricToggles'),
    legendItemTemp: document.getElementById('legendItemTemp'),
    legendItemPress: document.getElementById('legendItemPress'),
    legendItemLoad: document.getElementById('legendItemLoad'),
    legendItemVolt: document.getElementById('legendItemVolt'),

    // Panel 3: Sistem Alarm (Single Active Table Monitor)
    alarmsTableBody: document.getElementById('alarmsTableBody'),
    alarmSourceNote: document.getElementById('alarmSourceNote'),
    alarmActiveCountText: document.getElementById('alarmActiveCountText'),

    // Panel 4: Hour Meter & Maintenance
    odometerDigits: document.getElementById('odometerDigits'),
    valMaintDue: document.getElementById('valMaintDue'),
    badgeMaintStatus: document.getElementById('badgeMaintStatus'),
    textMaintRemaining: document.getElementById('textMaintRemaining'),
    barMaintProgress: document.getElementById('barMaintProgress'),
    valFuelEst: document.getElementById('valFuelEst')
  };

  // ===========================================================================
  // 3b. AXIOS HTTP CLIENT + AUTO RE-LOGIN INTERCEPTOR (v1.1)
  // apiClient menggantikan raw fetch: semua request telemetri & alarm pakai ini
  // agar interceptor 401 → auto re-login berjalan transparan tanpa reload
  // ===========================================================================
  const apiClient = axios.create({
    timeout: 5000,
    headers: { 'Content-Type': 'application/json' }
  });

  let _isRefreshing = false;
  let _refreshQueue = [];

  // Tambahkan header Authorization dari state/localStorage ke setiap request
  apiClient.interceptors.request.use(function (config) {
    const token = state.config.jwtToken || safeGetStorageEarly('GMS_JWT_TOKEN');
    if (token && !config.headers['X-Authorization']) {
      config.headers['X-Authorization'] = token.startsWith('Bearer ') ? token : 'Bearer ' + token;
    }
    return config;
  });

  // Jika respons 401 (token expired): re-login otomatis, lalu ulangi request asli
  apiClient.interceptors.response.use(null, async function (error) {
    const orig = error.config;
    const isLoginEndpoint = orig && (orig.url || '').includes('/auth/login');
    if (error.response && error.response.status === 401 && orig && !orig._retry && !isLoginEndpoint) {
      if (_isRefreshing) {
        // Queue request lain yang datang saat sedang refresh
        return new Promise(function (resolve, reject) {
          _refreshQueue.push(function (newToken) {
            if (!newToken) return reject(error);
            orig.headers['X-Authorization'] = 'Bearer ' + newToken;
            resolve(apiClient(orig));
          });
        });
      }
      orig._retry = true;
      _isRefreshing = true;
      try {
        const newToken = await performLogin();
        _isRefreshing = false;
        _refreshQueue.forEach(function (cb) { cb(newToken); });
        _refreshQueue = [];
        orig.headers['X-Authorization'] = 'Bearer ' + newToken;
        return apiClient(orig);
      } catch (loginErr) {
        _isRefreshing = false;
        _refreshQueue.forEach(function (cb) { cb(null); });
        _refreshQueue = [];
        if (DOM.dataSourceText) DOM.dataSourceText.textContent = 'Error 401: Token Expired — Buka ⚙️ isi Username & Password';
        if (DOM.statusDot) DOM.statusDot.className = 'rocker-led error';
        throw loginErr;
      }
    }
    throw error;
  });

  // Re-login ke Mastify menggunakan username/password tersimpan
  async function performLogin() {
    const user = state.config.username || safeGetStorageEarly('GMS_USERNAME') || '';
    const pass = state.config.password || safeGetStorageEarly('GMS_PASSWORD') || '';
    if (!user || !pass) {
      throw new Error('Kredensial belum diisi. Buka ⚙️ untuk mengisi username & password Mastify.');
    }
    const url = getMastifyApiEndpoint('/auth/login');
    // Gunakan axios biasa (bukan apiClient) agar tidak masuk loop interceptor
    const res = await axios.post(url, { username: user, password: pass }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 8000
    });
    if (!res.data || !res.data.token) throw new Error('Respons login tidak mengandung token.');
    const newToken = res.data.token;
    state.config.jwtToken = newToken;
    safeSetStorageEarly('GMS_JWT_TOKEN', newToken);
    console.info('[GMS Auth] Token baru berhasil didapat via re-login.');
    return newToken;
  }

  // Guard localStorage — perlu versi early sebelum safeGetStorage dideklarasikan di bawah
  function safeGetStorageEarly(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function safeSetStorageEarly(key, val) {
    try { localStorage.setItem(key, val); } catch (_) { /* no-op */ }
  }

  // Helper: format angka atau tampilkan '--' jika null/undefined/NaN
  function formatNum(val, dec) {
    if (val === null || val === undefined || isNaN(Number(val))) return '--';
    return Number(val).toFixed(dec);
  }

  // ===========================================================================
  // 4. PEMUATAN KONFIGURASI DARI .env (SAFE VANILLA FETCH)
  // ===========================================================================
    // akses localStorage dibungkus guard agar aman di iframe / private browsing
  function safeGetStorage(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function safeSetStorage(key, val) {
    try { localStorage.setItem(key, val); } catch (_) { /* no-op */ }
  }

  async function loadEnvironmentConfig() {
    // prioritaskan token URL ?token= / ?jwt= agar penguji sidang bisa inject token tanpa ubah .env
    const urlParams = new URLSearchParams(window.location.search);
    const queryToken = urlParams.get('token') || urlParams.get('jwt');
    const queryHost = urlParams.get('host');
    const queryDevice = urlParams.get('deviceId') || urlParams.get('device');

    // URL param: ?username= ?password=
    const queryUsername = urlParams.get('username');
    const queryPassword = urlParams.get('password');

    if (queryToken) {
      state.config.jwtToken = queryToken;
      safeSetStorage('GMS_JWT_TOKEN', queryToken);
    } else {
      const cachedToken = safeGetStorage('GMS_JWT_TOKEN');
      if (cachedToken) state.config.jwtToken = cachedToken;
    }

    if (queryHost) state.config.mastifyHost = queryHost;
    if (queryDevice) state.config.deviceId = queryDevice;

    // Ambil kredensial dari localStorage (disimpan via modal settings)
    const cachedUser = safeGetStorage('GMS_USERNAME');
    const cachedPass = safeGetStorage('GMS_PASSWORD');
    if (cachedUser) state.config.username = cachedUser;
    if (cachedPass) state.config.password = cachedPass;
    if (queryUsername) { state.config.username = queryUsername; safeSetStorage('GMS_USERNAME', queryUsername); }
    if (queryPassword) { state.config.password = queryPassword; safeSetStorage('GMS_PASSWORD', queryPassword); }

    // fetch .env lokal jika tersedia (localhost); 404 wajar saat deploy di cloud
    try {
      const response = await fetch('./.env', { cache: 'no-store' });
      if (!response.ok) return;
      const text = await response.text();

      text.split('\n').forEach(function (line) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const separatorIdx = trimmed.indexOf('=');
        if (separatorIdx === -1) return;

        const key = trimmed.substring(0, separatorIdx).trim();
        const value = trimmed.substring(separatorIdx + 1).trim();

        if (key === 'MASTIFY_HOST') state.config.mastifyHost = value;
        if (key === 'MASTIFY_DEVICE_ID') state.config.deviceId = value;
        if (key === 'MASTIFY_JWT_TOKEN' && !state.config.jwtToken) state.config.jwtToken = value;
        if (key === 'MASTIFY_USERNAME' && value && !state.config.username) state.config.username = value;
        if (key === 'MASTIFY_PASSWORD' && value && !state.config.password) state.config.password = value;
        if (key === 'POLLING_INTERVAL_MS') state.config.pollingIntervalMs = parseInt(value, 10) || 3000;
      });
    } catch (err) {
      console.warn('[GMS Config] Menggunakan konfigurasi cloud / fallback:', err.message);
    }
  }

  // reverse-proxy path digunakan saat di HTTPS/cloud agar bebas Mixed Content & CORS
  function getMastifyApiEndpoint(subPath) {
    const cleanSubPath = subPath.startsWith('/') ? subPath : `/${subPath}`;

    // cloud/HTTPS: pakai proxy; localhost HTTP: langsung ke host tujuan
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (window.location.protocol === 'https:' || !isLocalhost) {
      return `/api/mastify?endpoint=${encodeURIComponent(cleanSubPath)}`;
    }

    return `${state.config.mastifyHost}/api${cleanSubPath}`;
  }

  // ===========================================================================
  // 5. REST API TELEMETRY FETCHER (MASTIFY CLOUD)
  // ===========================================================================
  async function fetchMastifyTelemetry() {
    // Tambahkan keys v1.1: arus fasa, daya, PF, ketidakseimbangan arus, status sensor NAMUR
    const keys = [
      'engine_state', 'status',
      'engine_temp_c', 'temperature', 'temp_status',
      'oil_press_bar', 'pressure', 'press_status',
      'load_pct', 'load', 'load_status',
      'v_l1', 'v_l2', 'v_l3', 'v_11', 'v_12', 'v_13', 'voltage',
      'v_unbal_pct', 'voltage_balance',
      'i_l1', 'i_l2', 'i_l3',
      'p_kw', 's_kva', 'pf',
      'i_unbal_pct',
      'ai1_st', 'ai2_st', 'ai3_st',
      'battery_v',
      'freq_hz',
      'fuel_level_mm', 'fuel_vol_l', 'fuel_status',
      'run_hours', 'hourMeter', 'runHours',
      'maint_due_h', 'maintenance_status', 'maintenanceStatus', 'maint_status', 'maintStatus', 'maintenanceDueHours', 'maintDue',
      'fuel_est_l', 'fuelEstimate',
      'alarm_level', 'alarm_msg'
    ].join(',');

    const url = getMastifyApiEndpoint(`/plugins/telemetry/DEVICE/${state.config.deviceId}/values/timeseries?keys=${keys}`);

    // Gunakan apiClient (Axios) agar interceptor 401 → auto re-login bekerja
    const res = await apiClient.get(url);
    return parseMastifyResponse(res.data);
  }

  function parseMastifyResponse(raw) {
    if (!raw || typeof raw !== 'object') return null;

    function getLatestVal(...candidateKeys) {
      for (const k of candidateKeys) {
        if (!k) continue;
        const entry = raw[k];
        if (entry !== undefined && entry !== null) {
          if (Array.isArray(entry) && entry.length > 0) {
            const val = entry[0].value;
            if (val !== null && val !== undefined) {
              return val;
            }
            continue; // jika value di array null, lanjut periksa candidateKey berikutnya
          }
          if (entry !== null && entry !== undefined) {
            return entry;
          }
        }
      }
      return null;
    }

    // Ekstraksi timestamp data telemetri terbaru untuk health check 30 detik
    let maxTs = 0;
    for (const k in raw) {
      if (Array.isArray(raw[k]) && raw[k].length > 0 && raw[k][0].ts) {
        if (raw[k][0].ts > maxTs) maxTs = raw[k][0].ts;
      }
    }
    if (maxTs > 0) {
      state.lastTelemetryTs = maxTs;
      updateConnectionHealthBadge(maxTs);
    }

    // Helper konversi angka murni tanpa fallback buatan (null jika data belum tersedia)
    function safeNum(raw) {
      if (raw === null || raw === undefined || raw === '') return null;
      const v = parseFloat(raw);
      return isNaN(v) ? null : v;
    }

    const rawRunHours = safeNum(getLatestVal('run_hours', 'hourMeter', 'runHours'));
    const rawMaintDue = safeNum(getLatestVal('maint_due_h', 'maintenanceDueHours', 'maintDue'));
    let parsedMaintStatus = getLatestVal('maintenance_status', 'maintenanceStatus', 'maint_status', 'maintStatus');
    if (parsedMaintStatus && typeof parsedMaintStatus === 'string') {
      parsedMaintStatus = parsedMaintStatus.trim();
    } else {
      parsedMaintStatus = null;
    }

    const coolantTemp = safeNum(getLatestVal('coolant_temp_c', 'engine_temp_c', 'temperature'));
    const battVolt = safeNum(getLatestVal('batt_volt_v', 'battery_v'));
    const pKw = safeNum(getLatestVal('p_total_kw', 'p_kw'));
    const sKva = safeNum(getLatestVal('s_total_kva', 's_kva'));
    const pfAvg = safeNum(getLatestVal('pf_avg', 'pf'));
    const vL1 = safeNum(getLatestVal('v_l1_n', 'v_l1', 'v_11'));
    const vL2 = safeNum(getLatestVal('v_l2_n', 'v_l2', 'v_12'));
    const vL3 = safeNum(getLatestVal('v_l3_n', 'v_l3', 'v_13'));

    return {
      // A. Engine & Mekanikal
      engine_state: getLatestVal('engine_state', 'status') || null,
      eng_speed_rpm: safeNum(getLatestVal('eng_speed_rpm', 'rpm', 'speed')),
      oil_press_bar: safeNum(getLatestVal('oil_press_bar', 'pressure')),
      press_status: getLatestVal('press_status') || null,
      coolant_temp_c: coolantTemp,
      engine_temp_c: coolantTemp,
      temp_status: getLatestVal('temp_status') || null,
      fuel_level_mm: safeNum(getLatestVal('fuel_level_mm', 'fuel_vol_l')),
      fuel_vol_l: safeNum(getLatestVal('fuel_vol_l')),
      fuel_status: getLatestVal('fuel_status') || null,
      batt_volt_v: battVolt,
      battery_v: battVolt,
      run_hours: rawRunHours,
      maint_due_h: rawMaintDue,
      maintenance_status: parsedMaintStatus,
      fuel_est_l: safeNum(getLatestVal('fuel_est_l', 'fuelEstimate')),

      // B. Kelistrikan 3-Fasa AC
      v_l1_n: vL1,
      v_l2_n: vL2,
      v_l3_n: vL3,
      v_l1: vL1,
      v_l2: vL2,
      v_l3: vL3,
      v_l1_l2: safeNum(getLatestVal('v_l1_l2')),
      v_l2_l3: safeNum(getLatestVal('v_l2_l3')),
      v_l3_l1: safeNum(getLatestVal('v_l3_l1')),
      v_unbal_pct: safeNum(getLatestVal('v_unbal_pct', 'voltage_unbalance', 'unbalance')),
      voltage_balance: getLatestVal('voltage_balance') || null,
      i_l1: safeNum(getLatestVal('i_l1')),
      i_l2: safeNum(getLatestVal('i_l2')),
      i_l3: safeNum(getLatestVal('i_l3')),
      i_unbal_pct: safeNum(getLatestVal('i_unbal_pct')),
      i_unbal_avg_15m: safeNum(getLatestVal('i_unbal_avg_15m')),
      freq_hz: safeNum(getLatestVal('freq_hz')),
      p_total_kw: pKw,
      p_kw: pKw,
      s_total_kva: sKva,
      s_kva: sKva,
      load_pct: safeNum(getLatestVal('load_pct', 'load')),
      load_status: getLatestVal('load_status') || null,
      pf_avg: pfAvg,
      pf: pfAvg,

      // C. Hardware Diagnostic & Fault Flags
      fault_ai1: (getLatestVal('fault_ai1') === true || getLatestVal('fault_ai1') === 'true'),
      fault_ai2: (getLatestVal('fault_ai2') === true || getLatestVal('fault_ai2') === 'true'),
      fault_modbus: (getLatestVal('fault_modbus') === true || getLatestVal('fault_modbus') === 'true'),
      maint_req: (getLatestVal('maint_req') === true || getLatestVal('maint_req') === 'true'),
      ai1_st: getLatestVal('ai1_st') || null,
      ai2_st: getLatestVal('ai2_st') || null,
      ai3_st: getLatestVal('ai3_st') || null,
      sensor_fault: (getLatestVal('sensor_fault') === true || getLatestVal('sensor_fault') === 'true')
    };
  }

  // ===========================================================================
  // 6. RENDER DATA KE 4 PANEL UTAMA (ZERO LOGIC CLIENT)
  // ===========================================================================

  function renderRealtimePanel(data) {
    if (!data) return;

    // 1. Engine State Machine Dinamis
    renderEngineStateMachine(data.engine_state, data.engine_state_note);

    // Aux metadata (Putaran Mesin RPM, Tegangan Aki VB & Frekuensi Alternator)
    if (DOM.valEngSpeedRpm) {
      if (data.eng_speed_rpm !== undefined && data.eng_speed_rpm !== null) {
        DOM.valEngSpeedRpm.textContent = Math.round(Number(data.eng_speed_rpm));
      } else if (!data.engine_state || data.engine_state === 'STOPPED') {
        DOM.valEngSpeedRpm.textContent = '0';
      } else {
        DOM.valEngSpeedRpm.textContent = '--';
      }
    }
    if (DOM.valBatteryV) {
      DOM.valBatteryV.textContent = (data.battery_v !== null && data.battery_v !== undefined)
        ? Number(data.battery_v).toFixed(1) + ' V' : '-- V';
    }
    if (DOM.valFreqHz) {
      DOM.valFreqHz.textContent = (data.freq_hz !== null && data.freq_hz !== undefined)
        ? Number(data.freq_hz).toFixed(1) + ' Hz' : '-- Hz';
    }

    // update 4 kartu telemetri utama (suhu, oli, level solar, beban)
    if (DOM.valEngineTemp) {
      DOM.valEngineTemp.textContent = (data.engine_temp_c !== null && data.engine_temp_c !== undefined)
        ? Number(data.engine_temp_c).toFixed(1) : '--';
    }

    if (DOM.valOilPressure) {
      DOM.valOilPressure.textContent = (data.oil_press_bar !== null && data.oil_press_bar !== undefined)
        ? Number(data.oil_press_bar).toFixed(2) : '--';
    }

    if (DOM.valFuelLevelMm) {
      DOM.valFuelLevelMm.textContent = (data.fuel_level_mm !== null && data.fuel_level_mm !== undefined)
        ? Math.round(Number(data.fuel_level_mm)) : '--';
    }

    const hasLoad = (data.load_pct !== null && data.load_pct !== undefined);
    if (DOM.valLoadPct) {
      DOM.valLoadPct.textContent = hasLoad ? Number(data.load_pct).toFixed(1) : '--';
    }
    if (DOM.barLoadPct) {
      DOM.barLoadPct.style.width = hasLoad ? Math.min(Math.max(Number(data.load_pct), 0), 100) + '%' : '0%';
    }
    updateStatusPill(DOM.pillLoadStatus, hasLoad ? (data.load_status || 'NORMAL') : '--');

    // 3. Konsistensi Tegangan 3-Fasa & Deviasi NEMA
    const hasV1 = (data.v_l1 !== null && data.v_l1 !== undefined);
    const hasV2 = (data.v_l2 !== null && data.v_l2 !== undefined);
    const hasV3 = (data.v_l3 !== null && data.v_l3 !== undefined);

    DOM.valV11.textContent = hasV1 ? Number(data.v_l1).toFixed(1) : '--';
    DOM.valV12.textContent = hasV2 ? Number(data.v_l2).toFixed(1) : '--';
    DOM.valV13.textContent = hasV3 ? Number(data.v_l3).toFixed(1) : '--';

    const hasUnbal = (data.v_unbal_pct !== null && data.v_unbal_pct !== undefined);
    if (DOM.valUnbalPct) {
      DOM.valUnbalPct.textContent = hasUnbal ? Number(data.v_unbal_pct).toFixed(1) + '%' : '--%';
    }

    renderNemaVoltageBalance(data.voltage_balance, data.v_unbal_pct);

    // 4. v1.1: Arus Fasa 3-Fasa (i_l1/2/3)
    if (DOM.valI1) DOM.valI1.textContent = (data.i_l1 !== null && data.i_l1 !== undefined) ? formatNum(data.i_l1, 2) : '--';
    if (DOM.valI2) DOM.valI2.textContent = (data.i_l2 !== null && data.i_l2 !== undefined) ? formatNum(data.i_l2, 2) : '--';
    if (DOM.valI3) DOM.valI3.textContent = (data.i_l3 !== null && data.i_l3 !== undefined) ? formatNum(data.i_l3, 2) : '--';

    // 5. v1.1: Daya Aktif, Daya Semu, Power Factor
    if (DOM.valPKw) DOM.valPKw.textContent = (data.p_kw !== null && data.p_kw !== undefined)
      ? formatNum(data.p_kw, 2) + ' kW' : '--';
    if (DOM.valSKva) DOM.valSKva.textContent = (data.s_kva !== null && data.s_kva !== undefined)
      ? formatNum(data.s_kva, 2) + ' kVA' : '--';
    if (DOM.valPf) DOM.valPf.textContent = (data.pf !== null && data.pf !== undefined)
      ? formatNum(data.pf, 2) : '--';

    // 6. v1.1: Ketidakseimbangan Arus NEMA (i_unbal_pct)
    if (DOM.badgeIUnbal) {
      const iu = data.i_unbal_pct;
      if (iu === null || iu === undefined) {
        DOM.badgeIUnbal.textContent = 'ARUS --';
        DOM.badgeIUnbal.className = 'status-pill-small tier-nodata';
      } else if (Number(iu) > 40) {
        DOM.badgeIUnbal.textContent = 'ARUS KRITIS (>' + Number(iu).toFixed(1) + '%)';
        DOM.badgeIUnbal.className = 'status-pill-small tier-critical';
      } else if (Number(iu) > 20) {
        DOM.badgeIUnbal.textContent = 'ARUS ASIMETRIS (' + Number(iu).toFixed(1) + '%)';
        DOM.badgeIUnbal.className = 'status-pill-small tier-major';
      } else {
        DOM.badgeIUnbal.textContent = 'ARUS SEIMBANG (' + Number(iu).toFixed(1) + '%)';
        DOM.badgeIUnbal.className = 'status-pill-small tier-normal';
      }
    }

    // 7. v1.1: Volume Solar (fuel_vol_l)
    if (DOM.valFuelVolL) {
      DOM.valFuelVolL.textContent = (data.fuel_vol_l !== null && data.fuel_vol_l !== undefined)
        ? '(' + formatNum(data.fuel_vol_l, 1) + ' L)' : '';
    }

    // 8. v1.1: Status Sensor NAMUR NE43 (ai1_st -> oli, ai2_st -> suhu, ai3_st -> solar)
    renderNamurSensorStatus(DOM.pillPressStatus, data.press_status, data.ai1_st, data.oil_press_bar);
    renderNamurSensorStatus(DOM.pillTempStatus, data.temp_status, data.ai2_st, data.engine_temp_c);
    renderNamurSensorStatus(DOM.pillFuelStatus, data.fuel_status, data.ai3_st, data.fuel_level_mm);
  }

  // Render status pill dengan override NAMUR NE43 jika sensor fault
  function renderNamurSensorStatus(pillEl, thresholdStatus, namurStatus, val) {
    if (!pillEl) return;
    const ns = String(namurStatus || '').toUpperCase();
    if (ns === 'FAULT_LOW' || ns === 'FAULT_HIGH') {
      pillEl.textContent = 'SENSOR ' + ns;
      pillEl.className = 'status-pill-small tier-sensor-fault';
    } else if (val === null || val === undefined) {
      updateStatusPill(pillEl, '--');
    } else if (thresholdStatus) {
      updateStatusPill(pillEl, thresholdStatus);
    } else {
      updateStatusPill(pillEl, 'NORMAL');
    }
  }

  function renderEngineStateMachine(rawState, stateNote) {
    if (!DOM.engineStateCard || !DOM.valEngineState) return;

    const stateStr = String(rawState || 'STOPPED').toUpperCase();
    DOM.engineStateCard.className = 'engine-state-card';

    let descText = stateNote;

    if (stateStr === 'RUNNING') {
      DOM.engineStateCard.classList.add('state-running');
      DOM.valEngineState.textContent = 'RUNNING';
      if (!descText) descText = 'Mesin Beroperasi Nominal — Menyuplai Beban';
    } else if (stateStr === 'STOPPED') {
      DOM.engineStateCard.classList.add('state-stopped');
      DOM.valEngineState.textContent = 'STOPPED';
      if (!descText) descText = 'Mesin Siaga / Mati — Beban Terputus';
    } else if (stateStr === 'STARTING') {
      DOM.engineStateCard.classList.add('state-starting');
      DOM.valEngineState.textContent = 'STARTING';
      if (!descText) descText = 'Proses Starter Mesin — Sinkronisasi Fasa';
    } else if (stateStr === 'STOPPING') {
      DOM.engineStateCard.classList.add('state-stopping');
      DOM.valEngineState.textContent = 'STOPPING';
      if (!descText) descText = 'Proses Cooldown Mesin Menuju Siaga';
    } else if (stateStr === 'FAULT') {
      DOM.engineStateCard.classList.add('state-fault');
      DOM.valEngineState.textContent = 'FAULT';
      if (!descText) descText = 'Trip Proteksi Aktif — Mesin Berhenti Darurat';
    } else {
      DOM.engineStateCard.classList.add('state-stopped');
      DOM.valEngineState.textContent = stateStr;
      if (!descText) descText = 'Status Operasi Terdeteksi';
    }

    if (DOM.engineStateSub) {
      DOM.engineStateSub.textContent = descText;
    }
  }

  function updateStatusPill(element, statusText) {
    if (!element) return;
    const txt = String(statusText || '--').toUpperCase();
    element.textContent = txt;

    element.className = 'status-pill-small';
    if (txt === '--' || txt === 'NO DATA' || txt === 'UNKNOWN') {
      element.classList.add('tier-nodata');
    } else if (txt === 'NORMAL') {
      element.classList.add('tier-normal');
    } else if (txt === 'MAJOR' || txt === 'LOW') {
      element.classList.add('tier-major');
    } else if (txt === 'CRITICAL' || txt === 'EMPTY') {
      element.classList.add('tier-critical');
    } else if (txt === 'SENSOR_FAULT') {
      element.classList.add('tier-sensor-fault');
    } else {
      element.classList.add('tier-normal');
    }
  }

  // evaluasi status ketidakseimbangan tegangan 3-fasa NEMA (konsolidasi threshold & teks status)
  function renderNemaVoltageBalance(balanceText, unbalancePct) {
    if (!DOM.badgeVoltageBalance || !DOM.textVoltageBalance) return;

    if (unbalancePct === null || unbalancePct === undefined) {
      DOM.badgeVoltageBalance.className = 'voltage-badge';
      DOM.textVoltageBalance.textContent = balanceText || 'TEGANGAN --';
      return;
    }

    const pct = parseFloat(unbalancePct) || 0;
    const up = String(balanceText || '').toUpperCase();

    let text = balanceText;
    let badgeClass = 'badge-nema-normal';

    if (up.includes('CRIT') || up.includes('FAULT') || pct > 3.0) {
      badgeClass = 'badge-nema-critical';
      text = text || 'CRITICAL (FAULT)';
    } else if (up.includes('WARN') || up.includes('MAJOR') || pct > 2.0) {
      badgeClass = 'badge-nema-warning';
      text = text || 'WARNING (UNBALANCED)';
    } else {
      badgeClass = 'badge-nema-normal';
      text = text || 'SEIMBANG (NORMAL)';
    }

    DOM.badgeVoltageBalance.className = `voltage-badge ${badgeClass}`;
    DOM.textVoltageBalance.textContent = text;
  }

  function pushTimeseriesPoint(data) {
    if (!data || !state.chartInstance) return;

    const timeLabel = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const MAX_POINTS = 50;
    const chart = state.chartInstance;

    chart.data.labels.push(timeLabel);
    chart.data.datasets[0].data.push(data.engine_temp_c !== null && data.engine_temp_c !== undefined ? Number(data.engine_temp_c) : null);
    chart.data.datasets[1].data.push(data.oil_press_bar !== null && data.oil_press_bar !== undefined ? Number(data.oil_press_bar) : null);
    chart.data.datasets[2].data.push(data.load_pct !== null && data.load_pct !== undefined ? Number(data.load_pct) : null);
    chart.data.datasets[3].data.push(data.v_l1 !== null && data.v_l1 !== undefined ? Number(data.v_l1) : null);

    if (chart.data.labels.length > MAX_POINTS) {
      chart.data.labels.shift();
      chart.data.datasets.forEach(ds => ds.data.shift());
    }

    chart.update('none');
  }

  // polling alarm aktif langsung dari API ThingsBoard / Mastify (v1.1: ACTIVE_UNACK + apiClient)
  async function fetchMastifyAlarms() {
    const url = getMastifyApiEndpoint(`/alarm/DEVICE/${state.config.deviceId}?status=ACTIVE_UNACK&pageSize=10&page=0&sortProperty=createdTime&sortOrder=DESC`);

    try {
      const res = await apiClient.get(url);
      const json = res.data;

      const rawList = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
      // Filter ketat: hindari alarm CLEARED atau sudah ada clearTs
      const activeList = rawList.filter(function (item) {
        const s = String(item.status || '').toUpperCase();
        const isCleared = s.startsWith('CLEARED') || (item.clearTs && item.clearTs > 0);
        return !isCleared;
      });

      if (!activeList || activeList.length === 0) return [];

      return activeList.map(function (item) {
        const timeStr = item.createdTime
          ? new Date(item.createdTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // alarmId: ThingsBoard menyimpan UUID di item.id.id (nested)
        const alarmId = (item.id && item.id.id) ? item.id.id : (item.id || '');

        return {
          id: alarmId,
          timestamp: timeStr,
          level: normalizeSeverityTier(item.severity),
          ruleType: formatAlarmRuleName(item.type),
          // Mastify jarang kirim details.message saat status Active — fallback ke lookup ALARM_RULE_MAP
          message: (item.details && item.details.message) || getDefaultAlarmMessage(item.type),
          ruleStatus: item.status || 'ACTIVE_UNACK'
        };
      });
    } catch (err) {
      return null;
    }
  }

  // Acknowledge alarm ke Mastify API (POST /api/alarm/{id}/ack)
  async function acknowledgeAlarm(alarmId) {
    if (!alarmId) return;

    if (state.currentMode === MODES.OFFLINE) {
      // Offline: hapus dari state.alarmLog untuk simulasi
      state.alarmLog = state.alarmLog.filter(function (a) { return a.id !== alarmId && a.ruleType !== alarmId; });
      renderAlarmSystem([], 'Offline Demo — Alarm Acknowledged (Local)');
      return;
    }

    const url = getMastifyApiEndpoint('/alarm/' + alarmId + '/ack');
    try {
      await apiClient.post(url, {});
      console.info('[GMS Alarm] Acknowledge berhasil untuk alarmId:', alarmId);
      // Re-fetch alarm setelah ack berhasil
      const freshAlarms = await fetchMastifyAlarms();
      if (freshAlarms !== null) {
        renderAlarmSystem(freshAlarms, 'Mastify Alarm API — Setelah Acknowledge');
      }
    } catch (err) {
      console.warn('[GMS Alarm] Gagal acknowledge alarm:', err.message);
    }
  }

  // normalisasi jenis alarm ke kode teknis acuan
  // lookup terpadu: normalisasi kode rule + pesan default fallback jika Mastify tidak kirim field message
  const ALARM_RULE_MAP = {
    FREQ:   { code: 'FREQ_FAULT',    msg: 'Frekuensi alternator menyimpang di luar batas nominal 50.0 Hz.' },
    TEMP:   { code: 'ENGINE_TEMP',   msg: 'Suhu pendingin engine terdeteksi melebihi ambang batas aman.' },
    OIL:    { code: 'OIL_PRESSURE',  msg: 'Tekanan pelumas oli di bawah ambang batas aman.' },
    PRESS:  { code: 'OIL_PRESSURE',  msg: 'Tekanan pelumas oli di bawah ambang batas aman.' },
    VOLT:   { code: 'VOLTAGE_FAULT', msg: 'Terdeteksi deviasi ketidakseimbangan tegangan 3-fasa NEMA.' },
    NEMA:   { code: 'VOLTAGE_FAULT', msg: 'Terdeteksi deviasi ketidakseimbangan tegangan 3-fasa NEMA.' },
    SENSOR: { code: 'SENSOR_FAULT',  msg: 'Arus loop 4-20mA sensor di luar rentang standar NAMUR NE43.' },
    NAMUR:  { code: 'SENSOR_FAULT',  msg: 'Arus loop 4-20mA sensor di luar rentang standar NAMUR NE43.' },
    FUEL:   { code: 'FUEL_LEVEL',    msg: 'Level solar tangki genset di bawah batas aman operasional.' },
    BATT:   { code: 'BATTERY_FAULT', msg: 'Tegangan baterai starter lemah di bawah batas 24.0 V.' },
    LOAD:   { code: 'LOAD_FAULT',      msg: 'Beban genset melebihi kapasitas daya nominal (overload).' },
    OVERLOAD: { code: 'LOAD_FAULT',    msg: 'Beban genset melebihi kapasitas daya nominal (overload).' },
    IMBAL:  { code: 'CURRENT_IMBALANCE', msg: 'Ketidakseimbangan arus 3-fasa melebihi ambang batas NEMA.' },
    CURREN: { code: 'CURRENT_IMBALANCE', msg: 'Ketidakseimbangan arus 3-fasa melebihi ambang batas NEMA.' },
    ENGINE: { code: 'ENGINE_FAULT',  msg: 'Anomali proteksi engine terdeteksi oleh rule chain.' },
    TRIP:   { code: 'ENGINE_FAULT',  msg: 'Anomali proteksi engine terdeteksi oleh rule chain.' },
    FAULT:  { code: 'ENGINE_FAULT',  msg: 'Anomali proteksi engine terdeteksi oleh rule chain.' }
  };

  function formatAlarmRuleName(ruleType) {
    const r = String(ruleType || '').toUpperCase().trim();
    const match = Object.keys(ALARM_RULE_MAP).find(k => r.includes(k));
    return match ? ALARM_RULE_MAP[match].code : (r || 'SYS_ALARM');
  }

  function getDefaultAlarmMessage(type) {
    const t = String(type || '').toUpperCase();
    const match = Object.keys(ALARM_RULE_MAP).find(k => t.includes(k));
    return match ? ALARM_RULE_MAP[match].msg : 'Peringatan anomali aktif dari Mastify Rule Chain.';
  }

  // 4 status resmi Mastify / ThingsBoard — hoisted agar tersedia di seluruh modul
  function formatMastifyStatus(statusStr) {
    const s = String(statusStr || '').toUpperCase().trim();
    if (s === 'ACTIVE_ACK' || s === 'ACKNOWLEDGED' || s === 'ACK') {
      return { text: 'Acknowledged', cssClass: 'status-acknowledged' };
    }
    if (s === 'CLEARED_UNACK' || s === 'UNACKNOWLEDGED' || s === 'UNACK') {
      return { text: 'Unacknowledged', cssClass: 'status-unacknowledged' };
    }
    if (s.startsWith('CLEARED') || s === 'CLEARED') {
      return { text: 'Cleared', cssClass: 'status-cleared' };
    }
    return { text: 'Active', cssClass: 'status-active' };
  }

  function normalizeSeverityTier(level) {
    const lvl = String(level || 'NORMAL').toUpperCase();
    if (lvl === 'CRITICAL') return 'CRITICAL';
    if (lvl === 'MAJOR' || lvl === 'WARNING' || lvl === 'SENSOR_FAULT') return 'MAJOR';
    return 'NORMAL';
  }

  function getTierClass(tier) {
    if (tier === 'CRITICAL') return 'tier-critical';
    if (tier === 'MAJOR') return 'tier-major';
    return 'tier-normal';
  }

  // evaluasi rule chain lokal — dipakai di offline mode & sebagai fallback jika Mastify API kosong
  // threshold sesuai Dokumen Detail Scope Teknis v1.1 PT MASCH
  function evaluateTelemetryAlarms(t, timeStr) {
    if (!t) return [];
    const alarms = [];
    const time = timeStr || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Konversi nilai parameter telemetri
    const temp = Number(t.engine_temp_c);
    const press = Number(t.oil_press_bar);

    // 1. Sensor Fault NAMUR NE43 Check (Prioritas Utama)
    const isTempSensorFault = (t.temp_status === 'SENSOR_FAULT' || temp < -50);
    const isPressSensorFault = (t.press_status === 'SENSOR_FAULT' || press < -50);
    const isFuelSensorFault = (t.fuel_status === 'SENSOR_FAULT');

    if (t.sensor_fault === true || isTempSensorFault || isPressSensorFault || isFuelSensorFault) {
      let sensorName = 'Transmisi 4-20mA';
      if (isTempSensorFault) sensorName = 'AI2 PT100 Coolant RTD';
      else if (isPressSensorFault) sensorName = 'AI1 Transducer Tekanan Pelumas';
      else if (isFuelSensorFault) sensorName = 'AI3 Hydrostatic Level Solar';

      alarms.push({
        timestamp: time,
        level: 'MAJOR',
        ruleType: 'SENSOR_FAULT',
        message: `Arus loop transmisi 4-20mA sensor (${sensorName}) di luar rentang standar NAMUR NE43 (< 3.6mA / > 21.0mA). Indikasi kabel putus atau short circuit.`,
        ruleStatus: 'ACTIVE'
      });
    }

    // 2. Suhu Coolant (engine_temp_c) - Dievaluasi jika sensor normal
    if (!isNaN(temp) && !isTempSensorFault) {
      if (temp >= 95.0 || t.temp_status === 'CRITICAL') {
        alarms.push({
          timestamp: time,
          level: 'CRITICAL',
          ruleType: 'ENGINE_TEMP',
          message: `Suhu pendingin engine sangat tinggi (${temp.toFixed(1)}°C >= 95.0°C). Risiko overheat fatal & engine seizure!`,
          ruleStatus: 'ACTIVE'
        });
      } else if (temp >= 85.0 || t.temp_status === 'MAJOR') {
        alarms.push({
          timestamp: time,
          level: 'MAJOR',
          ruleType: 'ENGINE_TEMP',
          message: `Suhu pendingin engine melebihi ambang batas aman (${temp.toFixed(1)}°C >= 85.0°C). Sirkulasi radiator perlu dicek.`,
          ruleStatus: 'ACTIVE'
        });
      }
    }

    // 3. Tekanan Pelumas / Oli (oil_press_bar) - Dievaluasi saat mesin RUNNING dan sensor normal
    const isEngineRunning = (t.engine_state === 'RUNNING');
    if (!isNaN(press) && isEngineRunning && !isPressSensorFault) {
      if (press < 1.8 || t.press_status === 'CRITICAL') {
        alarms.push({
          timestamp: time,
          level: 'CRITICAL',
          ruleType: 'OIL_PRESSURE',
          message: `Tekanan oli pelumas anjlok di bawah batas aman (< 1.8 bar: ${press.toFixed(2)} bar). Bahaya keausan fatal bearing!`,
          ruleStatus: 'ACTIVE'
        });
      } else if (press < 2.5 || t.press_status === 'MAJOR') {
        alarms.push({
          timestamp: time,
          level: 'MAJOR',
          ruleType: 'OIL_PRESSURE',
          message: `Tekanan oli pelumas di bawah batas nominal (< 2.5 bar: ${press.toFixed(2)} bar). Periksa filter oli dan pompa.`,
          ruleStatus: 'ACTIVE'
        });
      }
    }

    // 4. Ketidakseimbangan Tegangan 3-Fasa NEMA & Phase Loss
    const unbal = Number(t.v_unbal_pct !== undefined ? t.v_unbal_pct : 0);
    const v1 = Number(t.v_l1 !== undefined ? t.v_l1 : t.v_11 || 0);
    const v2 = Number(t.v_l2 !== undefined ? t.v_l2 : t.v_12 || 0);
    const v3 = Number(t.v_l3 !== undefined ? t.v_l3 : t.v_13 || 0);

    if (isEngineRunning) {
      if ((v1 > 0 && v1 < 190.0) || (v2 > 0 && v2 < 190.0) || (v3 > 0 && v3 < 190.0)) {
        alarms.push({
          timestamp: time,
          level: 'CRITICAL',
          ruleType: 'VOLTAGE_FAULT',
          message: `Tegangan fasa anjlok di bawah batas minimum (< 190V: L1=${v1.toFixed(1)}V, L2=${v2.toFixed(1)}V, L3=${v3.toFixed(1)}V). Potensi fasa hilang!`,
          ruleStatus: 'ACTIVE'
        });
      } else if (v1 > 250.0 || v2 > 250.0 || v3 > 250.0) {
        alarms.push({
          timestamp: time,
          level: 'CRITICAL',
          ruleType: 'VOLTAGE_FAULT',
          message: `Tegangan fasa melebihi ambang batas aman (> 250V). Anomali AVR alternator terdeteksi!`,
          ruleStatus: 'ACTIVE'
        });
      } else if (unbal > 3.0) {
        alarms.push({
          timestamp: time,
          level: 'CRITICAL',
          ruleType: 'VOLTAGE_FAULT',
          message: `Deviasi tegangan 3-fasa NEMA kritis (${unbal.toFixed(1)}% > 3.0%). Risiko overheat belitan alternator!`,
          ruleStatus: 'ACTIVE'
        });
      } else if (unbal > 2.0) {
        alarms.push({
          timestamp: time,
          level: 'MAJOR',
          ruleType: 'VOLTAGE_FAULT',
          message: `Ketidakseimbangan tegangan NEMA tinggi (${unbal.toFixed(1)}% > 2.0%). Beban fasa tidak merata.`,
          ruleStatus: 'ACTIVE'
        });
      }
    }

    // 5. Frekuensi Alternator (freq_hz)
    const freq = Number(t.freq_hz);
    if (!isNaN(freq) && isEngineRunning && freq > 0) {
      if (freq < 47.5 || freq > 52.5) {
        alarms.push({
          timestamp: time,
          level: 'CRITICAL',
          ruleType: 'FREQ_FAULT',
          message: `Frekuensi alternator di luar batas toleransi operasi (${freq.toFixed(1)} Hz). Batas normal: 47.5 - 52.5 Hz.`,
          ruleStatus: 'ACTIVE'
        });
      } else if (freq < 49.0 || freq > 51.0) {
        alarms.push({
          timestamp: time,
          level: 'MAJOR',
          ruleType: 'FREQ_FAULT',
          message: `Frekuensi alternator menyimpang dari nominal 50.0 Hz (${freq.toFixed(1)} Hz). Governor mesin perlu dicek.`,
          ruleStatus: 'ACTIVE'
        });
      }
    }

    // 6. Level Tangki Solar (fuel_level_mm)
    const fuelMm = Number(t.fuel_level_mm);
    if (!isNaN(fuelMm) && fuelMm > 0) {
      if (fuelMm < 150 || t.fuel_status === 'CRITICAL') {
        alarms.push({
          timestamp: time,
          level: 'CRITICAL',
          ruleType: 'FUEL_LEVEL',
          message: `Level solar tangki genset sangat rendah (< 150 mm: ${Math.round(fuelMm)} mm). Mesin berisiko kehabisan solar!`,
          ruleStatus: 'ACTIVE'
        });
      } else if (fuelMm < 300 || t.fuel_status === 'LOW') {
        alarms.push({
          timestamp: time,
          level: 'MAJOR',
          ruleType: 'FUEL_LEVEL',
          message: `Level solar tangki genset di bawah batas aman (< 300 mm: ${Math.round(fuelMm)} mm). Diperlukan pengisian solar.`,
          ruleStatus: 'ACTIVE'
        });
      }
    }

    // 7. Tegangan Baterai / Aki (battery_v)
    const battV = Number(t.battery_v);
    if (!isNaN(battV) && battV > 0 && battV < 24.0) {
      alarms.push({
        timestamp: time,
        level: 'MAJOR',
        ruleType: 'BATTERY_FAULT',
        message: `Tegangan baterai starter genset lemah (${battV.toFixed(1)} V < 24.0 V). Cek sistem alternator/charger aki.`,
        ruleStatus: 'ACTIVE'
      });
    }

    // 8. Overload Genset (load_pct)
    const load = Number(t.load_pct);
    if (!isNaN(load) && load > 100.0) {
      alarms.push({
        timestamp: time,
        level: 'CRITICAL',
        ruleType: 'LOAD_OVERLOAD',
        message: `Beban genset melebihi 100% kapasitas nominal (${load.toFixed(1)}% > 100%). Risiko breaker trip!`,
        ruleStatus: 'ACTIVE'
      });
    }

    // 9. Engine State FAULT
    if (t.engine_state === 'FAULT') {
      alarms.push({
        timestamp: time,
        level: 'CRITICAL',
        ruleType: 'ENGINE_FAULT',
        message: `Trip proteksi aktif! Mesin genset berhenti darurat akibat kondisi anomali terdeteksi.`,
        ruleStatus: 'ACTIVE'
      });
    }

    return alarms;
  }

  // render tabel alarm aktif & riwayat perubahan status (5 kolom teknis)
  function renderAlarmSystem(currentActiveAlarms, sourceLabel) {
    const activeList = currentActiveAlarms || [];
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Peta active rules saat ini
    const activeRuleMap = new Map();
    activeList.forEach(a => {
      activeRuleMap.set(a.ruleType, a);
    });

    // transisi ke CLEARED jika kondisi telemetri sudah normal kembali
    state.alarmLog.forEach(item => {
      if (item.ruleStatus === 'ACTIVE' && !activeRuleMap.has(item.ruleType)) {
        item.ruleStatus = 'CLEARED';
        item.timestamp = timeStr;
        item.message = `Parameter ${item.ruleType} telah kembali normal dalam batas toleransi aman.`;
      }
    });

    // update timestamp jika alarm masih aktif, atau unshift alarm baru
    activeList.forEach(newAlarm => {
      const existing = state.alarmLog.find(item => item.ruleType === newAlarm.ruleType && item.ruleStatus === 'ACTIVE');
      if (existing) {
        existing.message = newAlarm.message;
        existing.timestamp = newAlarm.timestamp || timeStr;
        existing.level = newAlarm.level;
      } else {
        state.alarmLog.unshift({
          timestamp: newAlarm.timestamp || timeStr,
          level: newAlarm.level,
          ruleType: newAlarm.ruleType,
          message: newAlarm.message,
          ruleStatus: 'ACTIVE'
        });
      }
    });

    // Batasi histori alarm log internal hingga 20 item
    if (state.alarmLog.length > 20) {
      state.alarmLog = state.alarmLog.slice(0, 20);
    }

    const tbody = DOM.alarmsTableBody || document.getElementById('alarmsTableBody');
    if (!tbody) return;

    const sourceNote = DOM.alarmSourceNote || document.getElementById('alarmSourceNote');
    if (sourceNote && sourceLabel) {
      sourceNote.textContent = `Evaluasi: ${sourceLabel}`;
    }

    const activeCount = state.alarmLog.filter(a => a.ruleStatus === 'ACTIVE').length;
    const countText = DOM.alarmActiveCountText || document.getElementById('alarmActiveCountText');
    if (countText) {
      countText.textContent = `${activeCount} Alarm Aktif`;
      if (activeCount > 0) {
        countText.className = 'alarm-count-indicator count-alert';
      } else {
        countText.className = 'alarm-count-indicator count-normal';
      }
    }

    // Jika seluruh histori alarm kosong
    if (state.alarmLog.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="table-empty table-empty-normal">
            <div class="empty-state-container">
              <span class="empty-state-dot"></span>
              <span class="empty-state-title">Tidak Ada Alarm Aktif (Sistem Normal)</span>
            </div>
          </td>
        </tr>`;
      return;
    }

    // tampilkan seluruh histori alarm — wrap pesan panjang alami (tidak dipotong)
    const displayRows = state.alarmLog;
    const rows = [];
    displayRows.forEach(function (alarm) {
      const tier = normalizeSeverityTier(alarm.level);
      const tierClass = getTierClass(tier);
      const statusInfo = formatMastifyStatus(alarm.ruleStatus);
      const isActive = (statusInfo.text === 'Active' || statusInfo.text === 'Acknowledged');
      const rowHighlightClass = isActive
        ? (tier === 'CRITICAL' ? 'alarm-row-active-critical' : 'alarm-row-active-major')
        : 'alarm-row-cleared';
      const ruleCode = String(alarm.ruleType || 'SYS_EVENT').toUpperCase();
      const statusTextHtml = `<span class="alarm-status-text ${statusInfo.cssClass}">${statusInfo.text}</span>`;

      // v1.1: tombol Acknowledge hanya muncul untuk alarm ACTIVE yang punya id
      const showAckBtn = isActive && alarm.id && alarm.id !== '';
      const ackCell = showAckBtn
        ? `<td class="col-aksi"><button class="btn-alarm-ack" data-alarm-id="${alarm.id}">Acknowledge</button></td>`
        : `<td class="col-aksi">${statusTextHtml}</td>`;

      rows.push(`
        <tr class="${rowHighlightClass}">
          <td class="alarm-time-cell col-waktu">${alarm.timestamp} WIB</td>
          <td class="col-tingkatan"><span class="tier-pill ${tierClass}">${tier}</span></td>
          <td><span class="alarm-rule-code">${ruleCode}</span></td>
          <td class="alarm-msg-cell" title="${alarm.message}">${alarm.message}</td>
          ${ackCell}
        </tr>`);
    });

    tbody.innerHTML = rows.join('');

    // Pasang event listener pada setiap tombol Acknowledge yang dirender
    tbody.querySelectorAll('.btn-alarm-ack').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const id = this.getAttribute('data-alarm-id');
        this.disabled = true;
        this.textContent = 'Proses...';
        await acknowledgeAlarm(id);
      });
    });
  }

  function renderMaintenancePanel(data) {
    if (!data) return;

    renderOdometerDigits(data.run_hours);

    const hasDue = (data.maint_due_h !== null && data.maint_due_h !== undefined);
    if (hasDue) {
      const dueHours = Number(data.maint_due_h);
      DOM.valMaintDue.textContent = Math.max(0, dueHours).toFixed(1);
      if (dueHours <= 0) {
        DOM.textMaintRemaining.textContent = '0.0 Jam (Jatuh Tempo)';
      } else {
        DOM.textMaintRemaining.textContent = `Tersisa ${dueHours.toFixed(1)} Jam`;
      }
      const percentDone = Math.max(0, Math.min(100, ((250 - dueHours) / 250) * 100));
      DOM.barMaintProgress.style.width = percentDone.toFixed(1) + '%';
      if (dueHours <= 0) {
        DOM.barMaintProgress.style.background = 'var(--color-critical)';
      } else if (dueHours <= 20.0) {
        DOM.barMaintProgress.style.background = 'var(--color-major)';
      } else {
        DOM.barMaintProgress.style.background = 'linear-gradient(90deg, #059669, #3b82f6)';
      }
    } else {
      DOM.valMaintDue.textContent = '--';
      DOM.textMaintRemaining.textContent = 'Menunggu Data Jam Kerja (NVS ESP32)';
      DOM.barMaintProgress.style.width = '0%';
    }

    const rawStatus = data.maintenance_status ? String(data.maintenance_status).trim() : null;
    if (rawStatus) {
      const statusUpper = rawStatus.toUpperCase();
      DOM.badgeMaintStatus.textContent = rawStatus;
      if (statusUpper.includes('SERVIS') || statusUpper.includes('CRIT') || statusUpper.includes('KADALUARSA')) {
        DOM.badgeMaintStatus.className = 'maint-status-badge badge-maint-critical';
      } else if (statusUpper.includes('PERLU') || statusUpper.includes('SEGERA') || statusUpper.includes('WARN')) {
        DOM.badgeMaintStatus.className = 'maint-status-badge badge-maint-warn';
      } else {
        DOM.badgeMaintStatus.className = 'maint-status-badge badge-maint-ok';
      }
    } else {
      DOM.badgeMaintStatus.textContent = 'BELUM TERDATA';
      DOM.badgeMaintStatus.className = 'maint-status-badge';
    }

    DOM.valFuelEst.textContent = (data.fuel_est_l !== null && data.fuel_est_l !== undefined)
      ? Number(data.fuel_est_l).toFixed(1) : '--';
  }

  function renderOdometerDigits(hours) {
    if (!DOM.odometerDigits) return;
    if (hours === null || hours === undefined) {
      let html = '';
      for (let i = 0; i < 5; i++) {
        html += '<span class="odo-digit">-</span>';
      }
      html += '<span class="odo-dot">.</span>';
      html += '<span class="odo-digit odo-tenth">-</span>';
      DOM.odometerDigits.innerHTML = html;
      return;
    }
    const num = Math.max(0, Number(hours) || 0);
    const intPart = Math.floor(num);
    const tenthPart = Math.floor((num * 10) % 10);

    const paddedInt = String(intPart).padStart(5, '0');
    const digits = paddedInt.split('');

    let html = '';
    digits.forEach(function (d) {
      html += `<span class="odo-digit">${d}</span>`;
    });
    html += `<span class="odo-dot">.</span>`;
    html += `<span class="odo-digit odo-tenth">${tenthPart}</span>`;

    DOM.odometerDigits.innerHTML = html;
  }

  // ===========================================================================
  // 7. INISIALISASI CHART.JS TIMESERIES (4 PARAMETER STANDAR GMS)
  // ===========================================================================
  function initChart() {
    if (!DOM.chartCanvas || !window.Chart) {
      console.warn('[GMS Chart] Chart.js belum tersedia.');
      return;
    }

    // seragamkan font global Chart.js ke font utama UI
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";

    const ctx = DOM.chartCanvas.getContext('2d');

    const gradBlue = ctx.createLinearGradient(0, 0, 0, 250);
    gradBlue.addColorStop(0, 'rgba(37, 99, 235, 0.14)');
    gradBlue.addColorStop(1, 'rgba(37, 99, 235, 0.0)');

    // Grafik dimulai bersih (zero seed) untuk kedua mode; titik data terakumulasi dinamis per siklus
    const initialLabels = [];
    const initialTemp = [];
    const initialPress = [];
    const initialLoad = [];
    const initialVolt = [];

    state.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: initialLabels,
        datasets: [
          {
            label: 'Suhu Coolant (°C)',
            data: initialTemp,
            borderColor: '#2563eb',
            backgroundColor: gradBlue,
            borderWidth: 2,
            tension: 0.35,
            fill: true,
            pointRadius: 2,
            pointHoverRadius: 5,
            yAxisID: 'y'
          },
          {
            label: 'Tekanan Oli (bar)',
            data: initialPress,
            borderColor: '#d97706',
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.35,
            pointRadius: 2,
            pointHoverRadius: 5,
            yAxisID: 'y1'
          },
          {
            label: 'Beban (%)',
            data: initialLoad,
            borderColor: '#7c3aed',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [4, 4],
            tension: 0.35,
            pointRadius: 2,
            pointHoverRadius: 5,
            yAxisID: 'y'
          },
          {
            label: 'Tegangan R / v_l1 (V)',
            data: initialVolt,
            borderColor: '#059669',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            tension: 0.35,
            pointRadius: 0,
            yAxisID: 'y2'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            borderColor: '#cbd5e1',
            borderWidth: 1,
            padding: 10,
            titleFont: { family: 'Plus Jakarta Sans', weight: 'bold' },
            bodyFont: { family: 'JetBrains Mono' }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(226, 232, 240, 0.7)' },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 9 },
              maxTicksLimit: 12,
              autoSkip: true
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Suhu (°C) / Beban (%)',
              color: '#475569',
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 10, weight: '600' }
            },
            grid: { color: 'rgba(226, 232, 240, 0.7)' },
            ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 9 } },
            min: 0,
            max: 100
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Tekanan (bar)',
              color: '#d97706',
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 10, weight: '600' }
            },
            grid: { drawOnChartArea: false },
            ticks: { color: '#d97706', font: { family: 'JetBrains Mono', size: 9 } },
            min: 0,
            max: 6
          },
          y2: {
            type: 'linear',
            display: false,
            position: 'right',
            grid: { drawOnChartArea: false },
            min: 180,
            max: 250
          }
        }
      }
    });

    // Metric filter buttons
    if (DOM.chartMetricToggles) {
      DOM.chartMetricToggles.addEventListener('click', function (e) {
        const btn = e.target.closest('.btn-chart-filter');
        if (!btn) return;

        DOM.chartMetricToggles.querySelectorAll('.btn-chart-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        applyChartFilter(btn.dataset.metric);
      });
    }
  }

  // filter parameter chart dan penyesuaian min-max sumbu Y dinamis
  function applyChartFilter(metric) {
    if (!state.chartInstance) return;
    state.activeChartFilter = metric;
    const chart = state.chartInstance;
    const datasets = chart.data.datasets;
    const scales = chart.options.scales;

    // Multi-Axis & Dynamic Min-Max Switching
    if (metric === 'all') {
      datasets[0].hidden = false;
      datasets[0].yAxisID = 'y';
      datasets[1].hidden = false;
      datasets[1].yAxisID = 'y1'; // Multi-axis right untuk tekanan oli
      datasets[2].hidden = false;
      datasets[2].yAxisID = 'y';
      datasets[3].hidden = false;
      datasets[3].yAxisID = 'y2';

      scales.y.display = true;
      scales.y.position = 'left';
      scales.y.min = 0;
      scales.y.max = 100;
      scales.y.title.display = true;
      scales.y.title.text = 'Suhu (°C) / Beban (%)';
      scales.y.title.color = '#475569';
      scales.y.ticks.color = '#64748b';

      scales.y1.display = true;
      scales.y1.position = 'right';
      scales.y1.min = 0;
      scales.y1.max = 6;
      scales.y1.title.display = true;
      scales.y1.title.text = 'Tekanan (bar)';
      scales.y1.title.color = '#d97706';
      scales.y1.ticks.color = '#d97706';

      scales.y2.display = false;
    } else if (metric === 'temp') {
      datasets[0].hidden = false;
      datasets[0].yAxisID = 'y';
      datasets[1].hidden = true;
      datasets[2].hidden = true;
      datasets[3].hidden = true;

      scales.y.display = true;
      scales.y.position = 'left';
      scales.y.min = 40;
      scales.y.max = 110;
      scales.y.title.display = true;
      scales.y.title.text = 'Suhu Coolant (°C)';
      scales.y.title.color = '#2563eb';
      scales.y.ticks.color = '#2563eb';

      scales.y1.display = false;
      scales.y2.display = false;
    } else if (metric === 'press') {
      datasets[0].hidden = true;
      datasets[1].hidden = false;
      datasets[1].yAxisID = 'y'; // Map langsung ke sumbu utama kiri
      datasets[2].hidden = true;
      datasets[3].hidden = true;

      scales.y.display = true;
      scales.y.position = 'left';
      scales.y.min = 0;
      scales.y.max = 6;
      scales.y.title.display = true;
      scales.y.title.text = 'Tekanan Oli Pelumas (bar)';
      scales.y.title.color = '#d97706';
      scales.y.ticks.color = '#d97706';

      scales.y1.display = false;
      scales.y2.display = false;
    } else if (metric === 'load') {
      datasets[0].hidden = true;
      datasets[1].hidden = true;
      datasets[2].hidden = false;
      datasets[2].yAxisID = 'y';
      datasets[3].hidden = true;

      scales.y.display = true;
      scales.y.position = 'left';
      scales.y.min = 0;
      scales.y.max = 100;
      scales.y.title.display = true;
      scales.y.title.text = 'Beban Genset (%)';
      scales.y.title.color = '#7c3aed';
      scales.y.ticks.color = '#7c3aed';

      scales.y1.display = false;
      scales.y2.display = false;
    } else if (metric === 'volt') {
      datasets[0].hidden = true;
      datasets[1].hidden = true;
      datasets[2].hidden = true;
      datasets[3].hidden = false;
      datasets[3].yAxisID = 'y'; // Map langsung ke sumbu utama kiri

      scales.y.display = true;
      scales.y.position = 'left';
      scales.y.min = 180;
      scales.y.max = 260;
      scales.y.title.display = true;
      scales.y.title.text = 'Tegangan Fasa R / v_l1 (V)';
      scales.y.title.color = '#059669';
      scales.y.ticks.color = '#059669';

      scales.y1.display = false;
      scales.y2.display = false;
    }

    chart.update();

    // Toggle Titik Warna Legend Footer Dinamis Sesuai Filter Aktif
    updateChartLegendVisibility(metric);
  }

  function updateChartLegendVisibility(metric) {
    if (!DOM.legendItemTemp || !DOM.legendItemPress || !DOM.legendItemLoad || !DOM.legendItemVolt) return;

    // map metric key -> which legend items are visible
    const VISIBILITY = {
      all:   { temp: true,  press: true,  load: true,  volt: true  },
      temp:  { temp: true,  press: false, load: false, volt: false },
      press: { temp: false, press: true,  load: false, volt: false },
      load:  { temp: false, press: false, load: true,  volt: false },
      volt:  { temp: false, press: false, load: false, volt: true  }
    };
    const vis = VISIBILITY[metric] || VISIBILITY.all;
    DOM.legendItemTemp.style.display  = vis.temp  ? 'inline-flex' : 'none';
    DOM.legendItemPress.style.display = vis.press ? 'inline-flex' : 'none';
    DOM.legendItemLoad.style.display  = vis.load  ? 'inline-flex' : 'none';
    DOM.legendItemVolt.style.display  = vis.volt  ? 'inline-flex' : 'none';
  }

  // ===========================================================================
  // 8. LOGIKA POLLING 2 MODE EKSPLISIT (LIVE vs OFFLINE)
  // ZERO AUTO-FALLBACK: Transisi hanya lewat intervensi pengguna
  // ===========================================================================
  async function executeTelemetryCycle() {
    updateLastSyncTimestamp();

    if (state.currentMode === MODES.OFFLINE) {
      // MODE 2: OFFLINE MODE / LOCAL TESTING (MQTTX)
      const frame = getNextOfflineFrame();
      renderRealtimePanel(frame);
      pushTimeseriesPoint(frame);
      renderMaintenancePanel(frame);

      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const evaluatedAlarms = evaluateTelemetryAlarms(frame, timeStr);
      renderAlarmSystem(evaluatedAlarms, 'Local Rule Chain (MQTTX Telemetry)');
      return;
    }

    // MODE 1: LIVE REST API
    try {
      const data = await fetchMastifyTelemetry();
      if (!data) throw new Error('Data telemetri kosong');

      if (DOM.statusDot) DOM.statusDot.className = 'rocker-led online';
      if (DOM.dataSourceText) DOM.dataSourceText.textContent = 'LIVE REST API (Mastify)';

      renderRealtimePanel(data);
      pushTimeseriesPoint(data);
      renderMaintenancePanel(data);

      // dual source: coba alarm langsung dari Mastify API, fallback ke evaluasi rule lokal
      const liveAlarms = await fetchMastifyAlarms();
      if (liveAlarms !== null && liveAlarms.length > 0) {
        renderAlarmSystem(liveAlarms, 'Mastify Live Alarm API');
      } else {
        // 2. Evaluasi parameter telemetri live dari data Mastify
        const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const evaluatedAlarms = evaluateTelemetryAlarms(data, timeStr);
        renderAlarmSystem(evaluatedAlarms, 'Mastify Live Telemetry Rule Chain');
      }

    } catch (err) {
      console.warn('[GMS Polling] Gagal menghubungi Mastify API:', err.message);

      // KETENTUAN UTAMA: TIDAK BOLEH AUTO-FALLBACK!
      let displayMsg = err.message;
      if (err.message && err.message.includes('401')) {
        displayMsg = 'Token Expired (HTTP 401)';
      }
      if (DOM.statusDot) DOM.statusDot.className = 'rocker-led error';
      if (DOM.dataSourceText) DOM.dataSourceText.textContent = `LIVE API: Gagal Terhubung (${displayMsg})`;
      if (DOM.lastSyncLabel) {
        DOM.lastSyncLabel.textContent = `Sinkron: Gagal (${new Date().toLocaleTimeString('id-ID')} WIB)`;
      }

      const tbody = DOM.alarmsTableBody || document.getElementById('alarmsTableBody');
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="table-empty" style="color: #b91c1c; font-style: normal; padding: 25px 10px !important;">
              <div style="font-weight: 700; font-size: 0.85rem; margin-bottom: 4px;">⚠️ LIVE REST API Terputus (${err.message})</div>
              <div style="font-size: 0.74rem; color: var(--text-muted);">Tidak dapat memverifikasi status alarm dari Mastify Cloud. Beralih ke <strong>OFFLINE DEMO</strong> untuk demonstrasi data lokal.</div>
            </td>
          </tr>`;
      }
      const countText = DOM.alarmActiveCountText || document.getElementById('alarmActiveCountText');
      if (countText) countText.textContent = 'Status: Disconnected';
    }
  }

  // generator data telemetri offline (mendukung injeksi skenario alarm via keyboard untuk demo sidang)
  function getNextOfflineFrame() {
    const frames = OFFLINE_CAPTURED_DATA.frames;
    const baseFrame = frames[state.offlineFrameIndex % frames.length];
    state.offlineFrameIndex++;

    // clone agar tidak mutasi dataset dasar
    const frame = Object.assign({}, baseFrame);

    // injeksi skenario alarm jika diaktifkan via hotkey keyboard
    if (state.activeSimulation === 'temp') {
      frame.engine_temp_c = 88.5;
      frame.temp_status = 'MAJOR';
      frame.engine_state_note = 'SIMULASI SIDANG: Peringatan Suhu Tinggi (Overheat)';
    } else if (state.activeSimulation === 'oil') {
      frame.oil_press_bar = 1.45;
      frame.press_status = 'CRITICAL';
      frame.engine_state_note = 'SIMULASI SIDANG: Tekanan Pelumas Oli Drop Rendah';
    } else if (state.activeSimulation === 'voltage') {
      frame.v_l1 = 208.0;
      frame.v_l2 = 227.0;
      frame.v_l3 = 239.5;
      frame.v_unbal_pct = 4.3;
      frame.voltage_balance = 'CRITICAL (FAULT)';
      frame.engine_state_note = 'SIMULASI SIDANG: Ketidakseimbangan Tegangan NEMA';
    } else if (state.activeSimulation === 'freq') {
      frame.freq_hz = 48.2;
      frame.engine_state_note = 'SIMULASI SIDANG: Deviasi Frekuensi Alternator';
    } else if (state.activeSimulation === 'imbalance') {
      // v1.1: Ketidakseimbangan Arus NEMA kritis
      frame.i_unbal_pct = 48.5;
      frame.i_l1 = 110.0;
      frame.i_l2 = 42.0;
      frame.i_l3 = 38.0;
      frame.engine_state_note = 'SIMULASI SIDANG: CURRENT_IMBALANCE NEMA Kritis (>40%)';
    } else if (state.activeSimulation === 'sensor_ai1') {
      // v1.1: Sensor Fault NAMUR NE43 AI1 (Tekanan Oli)
      frame.ai1_st = 'FAULT_LOW';
      frame.oil_press_bar = null; // sensor faulty — tidak ada pembacaan valid
      frame.engine_state_note = 'SIMULASI SIDANG: SENSOR_FAULT_AI1 — Loop 4-20mA Putus';
    }

    return frame;
  }

  // trigger skenario simulasi demo sidang (tanpa tombol di web: via Keyboard atau Console)
  window.gmsSimulate = function (scenarioKey) {
    const valid = ['normal', 'temp', 'oil', 'voltage', 'freq', 'imbalance', 'sensor_ai1'];
    const key = String(scenarioKey || 'normal').toLowerCase();
    state.activeSimulation = valid.includes(key) ? key : 'normal';
    console.info(`[GMS Demo Simulasi] Skenario aktif: ${state.activeSimulation.toUpperCase()}`);
    if (state.currentMode === MODES.OFFLINE) {
      executeTelemetryCycle();
    }
  };

  function setOperationMode(mode) {
    if (mode === state.currentMode) return;
    state.currentMode = mode;
    updateModeUI();
    executeTelemetryCycle();
  }

  function updateModeUI() {
    const isLive = (state.currentMode === MODES.LIVE);

    if (DOM.btnModeLive) {
      DOM.btnModeLive.classList.toggle('active', isLive);
    }
    if (DOM.btnModeOffline) {
      DOM.btnModeOffline.classList.toggle('active', !isLive);
    }

    // LED indikator hanya menyala pada tombol rocker yang dipilih
    if (isLive) {
      if (DOM.statusDot) {
        DOM.statusDot.classList.remove('hidden');
        DOM.statusDot.className = 'rocker-led online';
      }
      if (DOM.dotOffline) {
        DOM.dotOffline.classList.add('hidden');
      }
      if (DOM.dataSourceText) DOM.dataSourceText.textContent = 'LIVE REST API (Mastify)';
    } else {
      if (DOM.statusDot) {
        DOM.statusDot.classList.add('hidden');
      }
      if (DOM.dotOffline) {
        DOM.dotOffline.classList.remove('hidden');
        DOM.dotOffline.className = 'rocker-led offline';
      }
      if (DOM.dataSourceText) DOM.dataSourceText.textContent = 'OFFLINE DEMO (Local Data)';
    }
  }

  // ===========================================================================
  // 9. REALTIME CLOCK & UTILS
  // ===========================================================================
  function startRealtimeClock() {
    function updateClock() {
      const now = new Date();
      if (DOM.realtimeClock) {
        DOM.realtimeClock.textContent = now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) + ' WIB';
      }
    }
    updateClock();
    state.clockTimer = setInterval(updateClock, 1000);
  }

  function updateLastSyncTimestamp() {
    if (DOM.lastSyncLabel) {
      const timeStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      DOM.lastSyncLabel.textContent = `Sinkron: ${timeStr} WIB`;
    }
  }

  // ===========================================================================
  // 10. SETUP EVENT LISTENERS & BOOTSTRAP
  // ===========================================================================
  function setupEventListeners() {
    if (DOM.btnModeLive) {
      DOM.btnModeLive.addEventListener('click', function () {
        setOperationMode(MODES.LIVE);
      });
    }
    if (DOM.btnModeOffline) {
      DOM.btnModeOffline.addEventListener('click', function () {
        setOperationMode(MODES.OFFLINE);
      });
    }

    // Hotkey demo sidang (rahasia di keyboard, tanpa tombol tambahan di web):
    // Tekan 0 / N: Normal (Semua hijau, alarm cleared)
    // Tekan 1 / T: Overheat (Alarm ENGINE_TEMP)
    // Tekan 2 / P: Low Oil Pressure (Alarm OIL_PRESSURE)
    // Tekan 3 / V: Voltage Fault NEMA (Alarm VOLTAGE_FAULT)
    // Tekan 4 / F: Frequency Trip (Alarm FREQ_FAULT)
    // Tekan 5 / I: Current Imbalance NEMA >40% (Alarm CURRENT_IMBALANCE) [v1.1]
    // Tekan 6 / S: Sensor AI1 Fault NAMUR NE43 (Alarm SENSOR_FAULT_AI1) [v1.1]
    // Tekan C    : Clear Alarms (Normalkan semua alarm)
    window.addEventListener('keydown', function (e) {
      // abaikan jika user sedang mengetik di input field
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const k = e.key.toLowerCase();
      if (k === '0' || k === 'n') window.gmsSimulate('normal');
      else if (k === '1' || k === 't') window.gmsSimulate('temp');
      else if (k === '2' || k === 'p') window.gmsSimulate('oil');
      else if (k === '3' || k === 'v') window.gmsSimulate('voltage');
      else if (k === '4' || k === 'f') window.gmsSimulate('freq');
      else if (k === '5' || k === 'i') window.gmsSimulate('imbalance');   // v1.1: CURRENT_IMBALANCE
      else if (k === '6' || k === 's') window.gmsSimulate('sensor_ai1'); // v1.1: SENSOR_FAULT_AI1
      else if (k === 'c') window.gmsSimulate('normal');
    });

    // Settings modal: buka dengan gear button ⚙️
    if (DOM.btnOpenSettings) {
      DOM.btnOpenSettings.addEventListener('click', openSettingsModal);
    }
    if (DOM.btnCloseSettings) {
      DOM.btnCloseSettings.addEventListener('click', function () {
        if (DOM.settingsModal) DOM.settingsModal.classList.add('hidden');
      });
    }
    if (DOM.btnCancelSettings) {
      DOM.btnCancelSettings.addEventListener('click', function () {
        if (DOM.settingsModal) DOM.settingsModal.classList.add('hidden');
      });
    }
    if (DOM.btnSaveSettings) {
      DOM.btnSaveSettings.addEventListener('click', saveSettings);
    }
    // Klik backdrop (di luar modal card) menutup modal
    if (DOM.settingsModal) {
      DOM.settingsModal.addEventListener('click', function (e) {
        if (e.target === DOM.settingsModal) DOM.settingsModal.classList.add('hidden');
      });
    }

    // Cek juga URL parameter ?sim=temp / ?sim=oil untuk kemudahan demo
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const sim = urlParams.get('sim');
      if (sim) window.gmsSimulate(sim);
    } catch (_) { }
  }

  function openSettingsModal() {
    if (!DOM.settingsModal) return;
    if (DOM.inputHost) DOM.inputHost.value = state.config.mastifyHost || '';
    if (DOM.inputDeviceId) DOM.inputDeviceId.value = state.config.deviceId || '';
    if (DOM.inputUsername) DOM.inputUsername.value = safeGetStorage('GMS_USERNAME') || state.config.username || '';
    if (DOM.inputPassword) DOM.inputPassword.value = safeGetStorage('GMS_PASSWORD') || state.config.password || '';
    if (DOM.inputToken) DOM.inputToken.value = safeGetStorage('GMS_JWT_TOKEN') || state.config.jwtToken || '';
    DOM.settingsModal.classList.remove('hidden');
  }

  function saveSettings() {
    if (DOM.inputHost && DOM.inputHost.value.trim()) {
      state.config.mastifyHost = DOM.inputHost.value.trim();
    }
    if (DOM.inputDeviceId && DOM.inputDeviceId.value.trim()) {
      state.config.deviceId = DOM.inputDeviceId.value.trim();
    }
    const u = DOM.inputUsername ? DOM.inputUsername.value.trim() : '';
    const p = DOM.inputPassword ? DOM.inputPassword.value.trim() : '';
    const t = DOM.inputToken ? DOM.inputToken.value.trim() : '';

    if (u) { state.config.username = u; safeSetStorage('GMS_USERNAME', u); }
    if (p) { state.config.password = p; safeSetStorage('GMS_PASSWORD', p); }
    if (t) { state.config.jwtToken = t; safeSetStorage('GMS_JWT_TOKEN', t); }

    if (DOM.settingsModal) DOM.settingsModal.classList.add('hidden');
    console.info('[GMS Settings] Konfigurasi disimpan. Host:', state.config.mastifyHost, '| DeviceId:', state.config.deviceId);
    // Langsung coba konek dengan konfigurasi baru
    if (state.currentMode === MODES.LIVE) executeTelemetryCycle();
  }

  async function initApplication() {
    console.info('[GMS] Memulai Inisialisasi Dashboard Genset Monitoring System...');

    startRealtimeClock();
    await loadEnvironmentConfig();
    initChart();
    updateModeUI();

    const initialFrame = (USE_OFFLINE_DATA || state.currentMode === MODES.OFFLINE) ? (OFFLINE_CAPTURED_DATA.frames && OFFLINE_CAPTURED_DATA.frames[0] || {}) : {};
    renderRealtimePanel(initialFrame);
    renderMaintenancePanel(initialFrame);

    const initialAlarms = evaluateTelemetryAlarms(initialFrame);
    renderAlarmSystem(initialAlarms, 'Inisialisasi Sistem');

    setupEventListeners();

    executeTelemetryCycle();
    state.pollTimer = setInterval(executeTelemetryCycle, state.config.pollingIntervalMs);

    console.info('[GMS] Dashboard siap digunakan. Mode Awal: LIVE REST API.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApplication);
  } else {
    initApplication();
  }

})();

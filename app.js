/**
 * =============================================================================
 * GENSET MONITORING SYSTEM (GMS) - CLIENT DASHBOARD CORE
 * Demo Sidang Tugas Akhir • Single Page Read-Only Architecture
 * Diselaraskan dengan Dokumen Acuan: R3 Final & Detail Scope Teknis v1.1 PT MASCH
 * =============================================================================
 * ATURAN MUTLAK KODE:
 * 1. ARSITEKTUR 2 MODE BERSIH (TANPA AUTO-FALLBACK):
 *    - Mode 1: "LIVE REST API (Mastify)" -> Fetch langsung ke endpoint Mastify.
 *    - Mode 2: "OFFLINE MODE (Local Data)" -> Dataset lokal statis demo sidang.
 *    - Transisi HANYA terjadi lewat tombol toggle eksplisit oleh pengguna.
 * 2. ZERO LOGIC IN FRONTEND:
 *    - JavaScript (app.js) murni sebagai Presentation Layer.
 *    - Dilarang keras melakukan kalkulasi threshold, menghitung hour meter,
 *      mengevaluasi alarm logic, atau menghitung rumus model SFC di browser.
 *    - Semua nilai telemetri dan status ditampilkan secara matang dari backend/cloud.
 * =============================================================================
 */

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
    jwtToken: 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJmYXRpbmFAbWFzY2guY2MiLCJ1c2VySWQiOiJlMzg0ODBkMC1iYzUxLTExZjAtOWMxOS1iMTMxMGVkNmI3NzkiLCJzY29wZXMiOlsiVEVOQU5UX0FETUlOIl0sInNlc3Npb25JZCI6IjJiYTMwMWNiLTZhYmYtNDQ5Yi05ZjY5LTg5OGMxODFhMDU3NSIsImV4cCI6MTc5MjEzNDIyNCwiaXNzIjoidGhpbmdzYm9hcmQuaW8iLCJpYXQiOjE3OTIxMjUyMjQsImZpcnN0TmFtZSI6IkZhdGluYSIsImxhc3ROYW1lIjoiSHVzbmEiLCJlbmFibGVkIjp0cnVlLCJpc1B1YmxpYyI6ZmFsc2UsInRlbmFudElkIjoiYTdhYjlhOTAtYTYzYS0xMWVmLTg5ZTYtY2Q2OTVkYzJjMjQyIiwiY3VzdG9tZXJJZCI6IjEzODE0MDAwLTFkZDItMTFiMi04MDgwLTgwODA4MDgwODA4MCJ9.zO4H1_FSJhbPeH94Zj8FjTorJfDFH_UXVuhoOyffK_bOHrYYHNZDNyvPFSKRezP3tRviv-q_1HQZCr0PgjGZEw',
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
    currentAlarms: []
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
        engine_temp_c: 82.4,
        temp_status: 'NORMAL',
        oil_press_bar: 3.65,
        press_status: 'NORMAL',
        load_pct: 68.4,
        load_status: 'NORMAL',
        fuel_level_mm: 735.0,
        fuel_status: 'NORMAL',
        battery_v: 26.8,
        freq_hz: 50.0,
        v_unbal_pct: 0.6,
        voltage_balance: 'SEIMBANG (NORMAL)',
        v_l1: 227.0,
        v_l2: 227.9,
        v_l3: 230.0,
        run_hours: 1284.5,
        maint_due_h: 15.5,
        maintenance_status: 'SIAP OPERASI',
        fuel_est_l: 342.8
      },
      {
        engine_state: 'RUNNING',
        engine_state_note: 'Mesin Beroperasi Nominal • Menyuplai Beban',
        engine_temp_c: 83.1,
        temp_status: 'NORMAL',
        oil_press_bar: 3.62,
        press_status: 'NORMAL',
        load_pct: 70.1,
        load_status: 'NORMAL',
        fuel_level_mm: 733.0,
        fuel_status: 'NORMAL',
        battery_v: 26.8,
        freq_hz: 49.9,
        v_unbal_pct: 0.7,
        voltage_balance: 'SEIMBANG (NORMAL)',
        v_l1: 226.8,
        v_l2: 227.5,
        v_l3: 229.8,
        run_hours: 1284.5,
        maint_due_h: 15.5,
        maintenance_status: 'SIAP OPERASI',
        fuel_est_l: 343.1
      },
      {
        engine_state: 'RUNNING',
        engine_state_note: 'Mesin Beroperasi Nominal • Menyuplai Beban',
        engine_temp_c: 83.8,
        temp_status: 'NORMAL',
        oil_press_bar: 3.59,
        press_status: 'NORMAL',
        load_pct: 72.3,
        load_status: 'NORMAL',
        fuel_level_mm: 730.0,
        fuel_status: 'NORMAL',
        battery_v: 26.7,
        freq_hz: 50.1,
        v_unbal_pct: 0.8,
        voltage_balance: 'SEIMBANG (NORMAL)',
        v_l1: 226.4,
        v_l2: 227.2,
        v_l3: 229.5,
        run_hours: 1284.5,
        maint_due_h: 15.5,
        maintenance_status: 'SIAP OPERASI',
        fuel_est_l: 343.5
      },
      {
        engine_state: 'RUNNING',
        engine_state_note: 'Mesin Beroperasi Nominal • Menyuplai Beban',
        engine_temp_c: 84.5,
        temp_status: 'NORMAL',
        oil_press_bar: 3.58,
        press_status: 'NORMAL',
        load_pct: 71.8,
        load_status: 'NORMAL',
        fuel_level_mm: 728.0,
        fuel_status: 'NORMAL',
        battery_v: 26.8,
        freq_hz: 50.0,
        v_unbal_pct: 0.6,
        voltage_balance: 'SEIMBANG (NORMAL)',
        v_l1: 227.1,
        v_l2: 227.8,
        v_l3: 230.1,
        run_hours: 1284.5,
        maint_due_h: 15.5,
        maintenance_status: 'SIAP OPERASI',
        fuel_est_l: 343.9
      },
      {
        engine_state: 'RUNNING',
        engine_state_note: 'Mesin Beroperasi Nominal • Menyuplai Beban',
        engine_temp_c: 85.0,
        temp_status: 'MAJOR',
        oil_press_bar: 3.55,
        press_status: 'NORMAL',
        load_pct: 69.5,
        load_status: 'NORMAL',
        fuel_level_mm: 725.0,
        fuel_status: 'NORMAL',
        battery_v: 26.8,
        freq_hz: 49.9,
        v_unbal_pct: 0.5,
        voltage_balance: 'SEIMBANG (NORMAL)',
        v_l1: 227.5,
        v_l2: 228.0,
        v_l3: 230.2,
        run_hours: 1284.5,
        maint_due_h: 15.5,
        maintenance_status: 'SIAP OPERASI',
        fuel_est_l: 344.2
      },
      {
        engine_state: 'RUNNING',
        engine_state_note: 'Mesin Beroperasi Nominal • Menyuplai Beban',
        engine_temp_c: 84.7,
        temp_status: 'NORMAL',
        oil_press_bar: 3.58,
        press_status: 'NORMAL',
        load_pct: 67.8,
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
        fuel_est_l: 344.6
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
    ],

    // Titik seed histori grafik awal (4 parameter standar GMS)
    seedHistory: [
      { time: '09:00', temp: 80.2, press: 4.35, load: 62.0, volt: 227.0 },
      { time: '09:01', temp: 80.8, press: 4.32, load: 63.5, volt: 226.8 },
      { time: '09:02', temp: 81.3, press: 4.30, load: 64.8, volt: 226.5 },
      { time: '09:03', temp: 81.7, press: 4.28, load: 66.2, volt: 227.1 },
      { time: '09:04', temp: 82.1, press: 4.26, load: 67.5, volt: 227.4 },
      { time: '09:05', temp: 82.5, press: 4.24, load: 68.0, volt: 227.0 },
      { time: '09:06', temp: 82.9, press: 4.23, load: 68.9, volt: 226.9 },
      { time: '09:07', temp: 83.2, press: 4.22, load: 69.4, volt: 227.2 },
      { time: '09:08', temp: 83.6, press: 4.20, load: 70.2, volt: 227.3 },
      { time: '09:09', temp: 83.9, press: 4.19, load: 71.0, volt: 226.8 },
      { time: '09:10', temp: 84.2, press: 4.18, load: 70.5, volt: 227.0 },
      { time: '09:11', temp: 84.6, press: 4.17, load: 69.8, volt: 227.5 },
      { time: '09:12', temp: 84.8, press: 4.16, load: 69.2, volt: 227.2 },
      { time: '09:13', temp: 83.5, press: 4.21, load: 68.7, volt: 226.9 },
      { time: '09:14', temp: 82.4, press: 4.25, load: 68.4, volt: 227.0 }
    ]
  };

  // ===========================================================================
  // 3. CACHED DOM ELEMENTS
  // ===========================================================================
  const DOM = {
    // Header & Mode Controls
    statusDot: document.getElementById('statusDot'),
    dataSourceText: document.getElementById('dataSourceText'),
    btnToggleSource: document.getElementById('btnToggleSource'),
    btnSourceText: document.getElementById('btnSourceText'),
    realtimeClock: document.getElementById('realtimeClock'),
    lastSyncLabel: document.getElementById('lastSyncLabel'),

    // Panel 1: Status & Real-Time
    engineStateCard: document.getElementById('engineStateCard'),
    engineBeacon: document.getElementById('engineBeacon'),
    valEngineState: document.getElementById('valEngineState'),
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
    dotVoltageBalance: document.getElementById('dotVoltageBalance'),
    textVoltageBalance: document.getElementById('textVoltageBalance'),

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
  // 4. PEMUATAN KONFIGURASI DARI .env (SAFE VANILLA FETCH)
  // ===========================================================================
  async function loadEnvironmentConfig() {
    // 1. Ekstraksi kredensial & token dinamis dari URL query params (?token=... & ?deviceId=...)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryToken = urlParams.get('token') || urlParams.get('jwt');
      const queryHost = urlParams.get('host');
      const queryDevice = urlParams.get('deviceId') || urlParams.get('device');

      if (queryToken) {
        state.config.jwtToken = queryToken;
        try { localStorage.setItem('GMS_JWT_TOKEN', queryToken); } catch (e) {}
        console.info('[GMS Config] Menggunakan JWT Token dari URL parameter (?token=...)');
      } else {
        try {
          const cachedToken = localStorage.getItem('GMS_JWT_TOKEN');
          if (cachedToken) state.config.jwtToken = cachedToken;
        } catch (e) {}
      }

      if (queryHost) state.config.mastifyHost = queryHost;
      if (queryDevice) state.config.deviceId = queryDevice;
    } catch (e) {}

    // 2. Coba membaca file .env lokal (berhasil di localhost, 404 saat deploy di Vercel/Netlify)
    try {
      const response = await fetch('./.env', { cache: 'no-store' });
      if (!response.ok) return;
      const text = await response.text();
      const lines = text.split('\n');

      lines.forEach(function (line) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const separatorIdx = trimmed.indexOf('=');
        if (separatorIdx === -1) return;

        const key = trimmed.substring(0, separatorIdx).trim();
        const value = trimmed.substring(separatorIdx + 1).trim();

        if (key === 'MASTIFY_HOST') state.config.mastifyHost = value;
        if (key === 'MASTIFY_DEVICE_ID') state.config.deviceId = value;
        if (key === 'MASTIFY_JWT_TOKEN' && !state.config.jwtToken) state.config.jwtToken = value;
        if (key === 'POLLING_INTERVAL_MS') state.config.pollingIntervalMs = parseInt(value, 10) || 3000;
      });

      console.info('[GMS Config] Konfigurasi aktif:', {
        host: state.config.mastifyHost,
        deviceId: state.config.deviceId,
        interval: state.config.pollingIntervalMs
      });
    } catch (err) {
      console.warn('[GMS Config] Menggunakan konfigurasi cloud / fallback:', err.message);
    }
  }

  /**
   * Helper Penyusunan URL REST API dengan Deteksi Reverse-Proxy Otomatis
   * Menjamin 100% bebas dari kendala "Mixed Content" (HTTPS vs HTTP) dan CORS saat dideploy di Vercel / Netlify.
   */
  function getMastifyApiEndpoint(subPath) {
    const cleanSubPath = subPath.startsWith('/') ? subPath : `/${subPath}`;

    // Jika berjalan di HTTPS (seperti saat dideploy di Vercel atau Netlify)
    // dan target host adalah plain HTTP: gunakan reverse-proxy lokal '/api/mastify'
    if (window.location.protocol === 'https:' && state.config.mastifyHost.startsWith('http://')) {
      return `/api/mastify${cleanSubPath}`;
    }

    // Jika di localhost / HTTP lokal, langsung gunakan host tujuan
    return `${state.config.mastifyHost}/api${cleanSubPath}`;
  }

  // ===========================================================================
  // 5. REST API TELEMETRY FETCHER (MASTIFY CLOUD)
  // ===========================================================================
  async function fetchMastifyTelemetry() {
    const keys = [
      'engine_state', 'status',
      'engine_temp_c', 'temperature', 'temp_status',
      'oil_press_bar', 'pressure', 'press_status',
      'load_pct', 'load_status',
      'v_l1', 'v_l2', 'v_l3', 'v_11', 'v_12', 'v_13', 'voltage',
      'v_unbal_pct', 'voltage_balance',
      'battery_v',
      'freq_hz',
      'fuel_level_mm', 'fuel_vol_l', 'fuel_status',
      'run_hours', 'hourMeter', 'runHours',
      'maint_due_h', 'maintenance_status', 'maintenanceStatus', 'maint_status', 'maintStatus', 'maintenanceDueHours', 'maintDue',
      'fuel_est_l', 'fuelEstimate',
      'alarm_level', 'alarm_msg'
    ].join(',');

    const url = getMastifyApiEndpoint(`/plugins/telemetry/DEVICE/${state.config.deviceId}/values/timeseries?keys=${keys}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': `Bearer ${state.config.jwtToken}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      return parseMastifyResponse(json);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  function parseMastifyResponse(raw) {
    if (!raw || typeof raw !== 'object') return null;

    function getLatestVal(...candidateKeys) {
      for (const k of candidateKeys) {
        if (!k) continue;
        const entry = raw[k];
        if (entry !== undefined && entry !== null) {
          if (Array.isArray(entry) && entry.length > 0) {
            return entry[0].value;
          }
          return entry;
        }
      }
      return null;
    }

    const rawRunHours = parseFloat(getLatestVal('run_hours', 'hourMeter', 'runHours'));
    const parsedRunHours = isNaN(rawRunHours) ? 0 : rawRunHours;

    const rawMaintDue = parseFloat(getLatestVal('maint_due_h', 'maintenanceDueHours', 'maintDue'));
    const parsedMaintDue = !isNaN(rawMaintDue) ? rawMaintDue : Math.max(0, 250 - (parsedRunHours % 250));

    // Ambil string status maintenance dari payload backend (baik snake_case maupun camelCase)
    let parsedMaintStatus = getLatestVal('maintenance_status', 'maintenanceStatus', 'maint_status', 'maintStatus');
    if (parsedMaintStatus && typeof parsedMaintStatus === 'string') {
      parsedMaintStatus = parsedMaintStatus.trim();
    } else {
      // Evaluasi cadangan sesuai Detail Scope v1.1 jika backend tidak mengirimkan field status eksplisit
      if (parsedMaintDue <= 0) {
        parsedMaintStatus = 'PERLU SERVIS';
      } else if (parsedMaintDue <= 20.0) {
        parsedMaintStatus = 'PERLU SERVIS';
      } else {
        parsedMaintStatus = 'SIAP OPERASI';
      }
    }

    return {
      engine_state: getLatestVal('engine_state', 'status') || 'RUNNING',
      engine_temp_c: parseFloat(getLatestVal('engine_temp_c', 'temperature')) || 0,
      temp_status: getLatestVal('temp_status') || 'NORMAL',
      oil_press_bar: parseFloat(getLatestVal('oil_press_bar', 'pressure')) || 0,
      press_status: getLatestVal('press_status') || 'NORMAL',
      load_pct: parseFloat(getLatestVal('load_pct')) || 0,
      load_status: getLatestVal('load_status') || 'NORMAL',
      fuel_level_mm: parseFloat(getLatestVal('fuel_level_mm', 'fuel_vol_l')) || 735.0,
      fuel_status: getLatestVal('fuel_status') || 'NORMAL',
      battery_v: parseFloat(getLatestVal('battery_v')) || 26.8,
      freq_hz: parseFloat(getLatestVal('freq_hz')) || 50.0,
      v_unbal_pct: parseFloat(getLatestVal('v_unbal_pct')) || 0.6,
      voltage_balance: getLatestVal('voltage_balance') || 'SEIMBANG (NORMAL)',
      v_l1: parseFloat(getLatestVal('v_l1', 'v_11')) || 227.0,
      v_l2: parseFloat(getLatestVal('v_l2', 'v_12')) || 227.9,
      v_l3: parseFloat(getLatestVal('v_l3', 'v_13')) || 230.0,
      run_hours: parsedRunHours,
      maint_due_h: parsedMaintDue,
      maintenance_status: parsedMaintStatus,
      fuel_est_l: parseFloat(getLatestVal('fuel_est_l', 'fuelEstimate')) || 0,
      sensor_fault: (getLatestVal('sensor_fault') === true || getLatestVal('sensor_fault') === 'true')
    };
  }

  // ===========================================================================
  // 6. RENDER DATA KE 4 PANEL UTAMA (ZERO LOGIC CLIENT)
  // ===========================================================================

  /**
   * Panel 1: Render Status & Nilai Real-Time
   */
  function renderRealtimePanel(data) {
    if (!data) return;

    // 1. Engine State Machine Dinamis
    renderEngineStateMachine(data.engine_state, data.engine_state_note);

    // Aux metadata (Tegangan Aki VB & Frekuensi Alternator)
    if (DOM.valBatteryV && data.battery_v !== undefined) {
      DOM.valBatteryV.textContent = Number(data.battery_v).toFixed(1) + ' V';
    }
    if (DOM.valFreqHz && data.freq_hz !== undefined) {
      DOM.valFreqHz.textContent = Number(data.freq_hz).toFixed(1) + ' Hz';
    }

    // 2. 4 Telemetry Cards (Hardware label terpisah di baris bawah agar lapang)
    DOM.valEngineTemp.textContent = Number(data.engine_temp_c).toFixed(1);
    updateStatusPill(DOM.pillTempStatus, data.temp_status || 'NORMAL');

    DOM.valOilPressure.textContent = Number(data.oil_press_bar).toFixed(2);
    updateStatusPill(DOM.pillPressStatus, data.press_status || 'NORMAL');

    if (DOM.valFuelLevelMm && data.fuel_level_mm !== undefined) {
      DOM.valFuelLevelMm.textContent = Math.round(Number(data.fuel_level_mm));
    }
    updateStatusPill(DOM.pillFuelStatus, data.fuel_status || 'NORMAL');

    const loadVal = Number(data.load_pct) || 0;
    DOM.valLoadPct.textContent = loadVal.toFixed(1);
    DOM.barLoadPct.style.width = Math.min(Math.max(loadVal, 0), 100) + '%';
    updateStatusPill(DOM.pillLoadStatus, data.load_status || 'NORMAL');

    // 3. Konsistensi Tegangan 3-Fasa & Deviasi NEMA
    const v1 = Number(data.v_l1 !== undefined ? data.v_l1 : data.v_11 || 0);
    const v2 = Number(data.v_l2 !== undefined ? data.v_l2 : data.v_12 || 0);
    const v3 = Number(data.v_l3 !== undefined ? data.v_l3 : data.v_13 || 0);

    DOM.valV11.textContent = v1.toFixed(1);
    DOM.valV12.textContent = v2.toFixed(1);
    DOM.valV13.textContent = v3.toFixed(1);

    const unbal = Number(data.v_unbal_pct !== undefined ? data.v_unbal_pct : 0);
    if (DOM.valUnbalPct) {
      DOM.valUnbalPct.textContent = unbal.toFixed(1) + '%';
    }

    renderNemaVoltageBalance(data.voltage_balance, unbal);
  }

  function renderEngineStateMachine(rawState, stateNote) {
    if (!DOM.engineStateCard || !DOM.valEngineState) return;

    const stateStr = String(rawState || 'RUNNING').toUpperCase();
    DOM.engineStateCard.className = 'engine-state-card';

    let descText = stateNote;

    if (stateStr === 'RUNNING') {
      DOM.engineStateCard.classList.add('state-running');
      DOM.valEngineState.textContent = 'RUNNING';
      if (!descText) descText = 'Mesin Beroperasi Nominal • Menyuplai Beban';
    } else if (stateStr === 'STOPPED') {
      DOM.engineStateCard.classList.add('state-stopped');
      DOM.valEngineState.textContent = 'STOPPED';
      if (!descText) descText = 'Mesin Siaga / Mati • Tidak Menyuplai Beban';
    } else if (stateStr === 'STARTING') {
      DOM.engineStateCard.classList.add('state-starting');
      DOM.valEngineState.textContent = 'STARTING';
      if (!descText) descText = 'Proses Starter Mesin • Sinkronisasi Fasa';
    } else if (stateStr === 'STOPPING') {
      DOM.engineStateCard.classList.add('state-stopping');
      DOM.valEngineState.textContent = 'STOPPING';
      if (!descText) descText = 'Proses Cooldown Mesin Menuju Siaga';
    } else if (stateStr === 'FAULT') {
      DOM.engineStateCard.classList.add('state-fault');
      DOM.valEngineState.textContent = 'FAULT';
      if (!descText) descText = 'Trip Proteksi Aktif • Mesin Berhenti Darurat';
    } else {
      DOM.engineStateCard.classList.add('state-running');
      DOM.valEngineState.textContent = stateStr;
      if (!descText) descText = 'Status Operasi Terdeteksi';
    }

    if (DOM.engineStateSub) {
      DOM.engineStateSub.textContent = descText;
    }
  }

  function updateStatusPill(element, statusText) {
    if (!element) return;
    const txt = String(statusText || 'NORMAL').toUpperCase();
    element.textContent = txt;

    element.className = 'status-pill-small';
    if (txt === 'NORMAL') {
      element.classList.add('tier-normal');
    } else if (txt === 'MAJOR' || txt === 'WARNING' || txt === 'LOW') {
      element.classList.add('tier-major');
    } else if (txt === 'CRITICAL' || txt === 'EMPTY') {
      element.classList.add('tier-critical');
    } else if (txt === 'SENSOR_FAULT') {
      element.classList.add('tier-sensor-fault');
    } else {
      element.classList.add('tier-normal');
    }
  }

  function renderNemaVoltageBalance(balanceText, unbalancePct) {
    if (!DOM.badgeVoltageBalance || !DOM.textVoltageBalance) return;

    let text = balanceText;
    let badgeClass = 'badge-nema-normal';

    if (!text) {
      if (unbalancePct <= 2.0) {
        text = 'SEIMBANG (NORMAL)';
        badgeClass = 'badge-nema-normal';
      } else if (unbalancePct <= 3.0) {
        text = 'WARNING (UNBALANCED)';
        badgeClass = 'badge-nema-warning';
      } else {
        text = 'CRITICAL (FAULT)';
        badgeClass = 'badge-nema-critical';
      }
    } else {
      const up = text.toUpperCase();
      if (up.includes('CRIT') || up.includes('FAULT') || unbalancePct > 3.0) {
        badgeClass = 'badge-nema-critical';
      } else if (up.includes('WARN') || up.includes('MAJOR') || unbalancePct > 2.0) {
        badgeClass = 'badge-nema-warning';
      } else {
        badgeClass = 'badge-nema-normal';
      }
    }

    DOM.badgeVoltageBalance.className = `voltage-badge ${badgeClass}`;
    DOM.textVoltageBalance.textContent = text;
  }

  /**
   * Panel 2: Push titik data baru ke Chart.js Timeseries (4 Parameter Standar GMS)
   */
  function pushTimeseriesPoint(data) {
    if (!data || !state.chartInstance) return;

    const timeLabel = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const MAX_POINTS = 20;
    const chart = state.chartInstance;

    chart.data.labels.push(timeLabel);
    chart.data.datasets[0].data.push(Number(data.engine_temp_c));
    chart.data.datasets[1].data.push(Number(data.oil_press_bar));
    chart.data.datasets[2].data.push(Number(data.load_pct));
    chart.data.datasets[3].data.push(Number(data.v_l1 !== undefined ? data.v_l1 : data.v_11 || 0));

    if (chart.data.labels.length > MAX_POINTS) {
      chart.data.labels.shift();
      chart.data.datasets.forEach(ds => ds.data.shift());
    }

    chart.update('none');
  }

  /**
   * Panel 3: Render Active Alarms & Alarm History (3 Tingkat Severity Mastify: NORMAL, MAJOR, CRITICAL)
   */
  /**
   * Panel 3: REST API Live Alarm Fetcher (Mastify Cloud)
   */
  async function fetchMastifyAlarms() {
    const url = getMastifyApiEndpoint(`/alarm/DEVICE/${state.config.deviceId}?pageSize=10&page=0&searchStatus=ACTIVE&sortProperty=createdTime&sortOrder=DESC`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': `Bearer ${state.config.jwtToken}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (!response.ok) return null;

      const rawList = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
      // Filter ketat: Pastikan alarm yang berstatus CLEARED atau memiliki clearTs tidak dimasukkan
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

        return {
          timestamp: timeStr,
          level: normalizeSeverityTier(item.severity),
          ruleType: formatAlarmRuleName(item.type),
          message: (item.details && item.details.message) || item.type || 'Peringatan aktif dari Mastify Rule Chain.',
          ruleStatus: item.status || 'ACTIVE'
        };
      });
    } catch (err) {
      clearTimeout(timeoutId);
      return null;
    }
  }

  /**
   * Helper Pemetaan Nama Jenis Alarm ke Kode Teknis Asli (SCADA Industrial Standard)
   */
  function formatAlarmRuleName(ruleType) {
    const r = String(ruleType || '').toUpperCase().trim();
    if (r.includes('FREQ')) return 'FREQ_FAULT';
    if (r.includes('TEMP')) return 'ENGINE_TEMP';
    if (r.includes('OIL') || r.includes('PRESS')) return 'OIL_PRESSURE';
    if (r.includes('VOLT') || r.includes('NEMA')) return 'VOLTAGE_FAULT';
    if (r.includes('SENSOR') || r.includes('NAMUR')) return 'SENSOR_FAULT';
    if (r.includes('FUEL')) return 'FUEL_LEVEL';
    if (r.includes('BATT')) return 'BATTERY_FAULT';
    if (r.includes('LOAD')) return 'LOAD_OVERLOAD';
    if (r.includes('ENGINE') || r.includes('TRIP') || r.includes('FAULT')) return 'ENGINE_FAULT';
    return r || 'SYS_ALARM';
  }

  function getDefaultAlarmMessage(type) {
    const t = String(type || '').toUpperCase();
    if (t.includes('FREQ')) return 'Frekuensi alternator menyimpang di luar batas nominal 50.0 Hz.';
    if (t.includes('TEMP')) return 'Suhu pendingin engine terdeteksi melebihi ambang batas aman.';
    if (t.includes('OIL') || t.includes('PRESS')) return 'Tekanan pelumas oli di bawah ambang batas aman.';
    if (t.includes('VOLT')) return 'Terdeteksi deviasi ketidakseimbangan tegangan 3-fasa NEMA.';
    if (t.includes('SENSOR')) return 'Arus loop 4-20mA sensor di luar rentang standar NAMUR NE43.';
    if (t.includes('FUEL')) return 'Level solar tangki genset di bawah batas aman operasional.';
    if (t.includes('BATT')) return 'Tegangan baterai starter lemah di bawah batas 24.0 V.';
    if (t.includes('LOAD')) return 'Beban genset melebihi kapasitas daya nominal (overload).';
    return 'Peringatan anomali aktif dari Mastify Rule Chain.';
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

  /**
   * Evaluasi Otomatis Alarm dari Parameter Telemetri (Offline / MQTTX Testing / Fallback Rules)
   * Berdasarkan Aturan Ambang Batas Dokumen Detail Scope Teknis v1.1 PT MASCH
   */
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

  /**
   * Panel 3: Render Real-Time Active Alarms Table
   * Format 5 Kolom Resmi: WAKTU | TINGKATAN | JENIS ALARM | PESAN ALARM | STATUS
   */
  function renderAlarmSystem(alarms, sourceLabel) {
    state.currentAlarms = alarms || [];
    const count = state.currentAlarms.length;

    const tbody = DOM.alarmsTableBody || document.getElementById('alarmsTableBody');
    if (!tbody) return;

    const sourceNote = DOM.alarmSourceNote || document.getElementById('alarmSourceNote');
    if (sourceNote && sourceLabel) {
      sourceNote.textContent = `Evaluasi: ${sourceLabel}`;
    }

    const countText = DOM.alarmActiveCountText || document.getElementById('alarmActiveCountText');
    if (countText) {
      countText.textContent = `${count} Alarm Aktif`;
    }

    // KONDISI 1: SEMUA NORMAL (TIDAK ADA ALARM AKTIF) -> Keterangan Terpusat (Empty State)
    if (count === 0) {
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

    // KONDISI 2: TERDAPAT ALARM AKTIF (MAJOR / CRITICAL)
    let rowsHtml = '';
    state.currentAlarms.forEach(function (alarm) {
      const tier = normalizeSeverityTier(alarm.level);
      const tierClass = getTierClass(tier);
      const rowHighlightClass = (tier === 'CRITICAL') ? 'alarm-row-active-critical' : 'alarm-row-active-major';
      const ruleCode = String(alarm.ruleType || 'SYS_EVENT').toUpperCase();

      rowsHtml += `
        <tr class="${rowHighlightClass}">
          <td class="alarm-time-cell">${alarm.timestamp} WIB</td>
          <td><span class="tier-pill ${tierClass}">${tier}</span></td>
          <td><span class="alarm-rule-code">${ruleCode}</span></td>
          <td class="alarm-msg-cell">${alarm.message}</td>
          <td><span class="alarm-status-rule status-active">${alarm.ruleStatus || 'ACTIVE'}</span></td>
        </tr>`;
    });

    tbody.innerHTML = rowsHtml;
  }

  /**
   * Panel 4: Render Hour Meter & Maintenance (Zero Logic)
   */
  function renderMaintenancePanel(data) {
    if (!data) return;

    renderOdometerDigits(data.run_hours);

    const dueHours = Number(data.maint_due_h);
    const displayDue = !isNaN(dueHours) ? dueHours : 0;
    DOM.valMaintDue.textContent = Math.max(0, displayDue).toFixed(1);

    if (displayDue <= 0) {
      DOM.textMaintRemaining.textContent = '0.0 Jam (Jatuh Tempo)';
    } else {
      DOM.textMaintRemaining.textContent = `Tersisa ${displayDue.toFixed(1)} Jam`;
    }

    const rawStatus = String(data.maintenance_status || '').trim();
    let statusText = rawStatus;
    if (!statusText) {
      if (displayDue <= 0 || displayDue <= 20.0) {
        statusText = 'PERLU SERVIS';
      } else {
        statusText = 'SIAP OPERASI';
      }
    }

    DOM.badgeMaintStatus.textContent = statusText;

    const statusUpper = statusText.toUpperCase();
    // Detail Scope v1.1 S7:
    // - CRITICAL (maint_due_h <= 0 atau SERVIS OVERDUE): Wajib diservis -> Badge MERAH
    // - MAJOR (maint_due_h 1.0 - 20.0 jam atau PERLU SERVIS): Jadwal servis mendekat -> Badge KUNING/AMBER
    // - NORMAL (maint_due_h > 20.0 jam): SIAP OPERASI -> Badge HIJAU
    if (displayDue <= 0 || statusUpper.includes('OVERDUE') || statusUpper.includes('KRITIS') || statusUpper.includes('TERLAMBAT')) {
      DOM.badgeMaintStatus.className = 'maint-status-badge badge-maint-critical';
    } else if (statusUpper.includes('PERLU') || statusUpper.includes('SEGERA') || statusUpper.includes('WARN')) {
      DOM.badgeMaintStatus.className = 'maint-status-badge badge-maint-warn';
    } else if (statusUpper.includes('SIAP') || statusUpper.includes('NORMAL') || statusUpper.includes('OK')) {
      DOM.badgeMaintStatus.className = 'maint-status-badge badge-maint-ok';
    } else if (displayDue <= 20.0) {
      DOM.badgeMaintStatus.className = 'maint-status-badge badge-maint-warn';
    } else {
      DOM.badgeMaintStatus.className = 'maint-status-badge badge-maint-ok';
    }

    const percentDone = Math.max(0, Math.min(100, ((250 - displayDue) / 250) * 100));
    DOM.barMaintProgress.style.width = percentDone.toFixed(1) + '%';
    if (displayDue <= 0) {
      DOM.barMaintProgress.style.background = 'var(--color-critical)';
    } else if (displayDue <= 20.0) {
      DOM.barMaintProgress.style.background = 'var(--color-major)';
    } else {
      DOM.barMaintProgress.style.background = 'linear-gradient(90deg, #059669, #3b82f6)';
    }

    DOM.valFuelEst.textContent = Number(data.fuel_est_l).toFixed(1);
  }

  function renderOdometerDigits(hours) {
    if (!DOM.odometerDigits) return;
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

    const ctx = DOM.chartCanvas.getContext('2d');

    const gradBlue = ctx.createLinearGradient(0, 0, 0, 250);
    gradBlue.addColorStop(0, 'rgba(37, 99, 235, 0.14)');
    gradBlue.addColorStop(1, 'rgba(37, 99, 235, 0.0)');

    const initialLabels = OFFLINE_CAPTURED_DATA.seedHistory.map(item => item.time);
    const initialTemp = OFFLINE_CAPTURED_DATA.seedHistory.map(item => item.temp);
    const initialPress = OFFLINE_CAPTURED_DATA.seedHistory.map(item => item.press);
    const initialLoad = OFFLINE_CAPTURED_DATA.seedHistory.map(item => item.load);
    const initialVolt = OFFLINE_CAPTURED_DATA.seedHistory.map(item => item.volt);

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
            grid: { color: '#e2e8f0' },
            ticks: {
              color: '#64748b',
              font: { family: 'JetBrains Mono', size: 10 }
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
              font: { size: 10, weight: '600' }
            },
            grid: { color: '#e2e8f0' },
            ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } },
            suggestedMin: 50,
            suggestedMax: 100
          },
          y1: {
            type: 'linear',
            display: false,
            position: 'right',
            suggestedMin: 0,
            suggestedMax: 8
          },
          y2: {
            type: 'linear',
            display: false,
            position: 'right',
            suggestedMin: 180,
            suggestedMax: 250
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

  /**
   * Filter Grafik & Update Titik Indikator Legend Warna Secara Dinamis
   */
  function applyChartFilter(metric) {
    if (!state.chartInstance) return;
    const datasets = state.chartInstance.data.datasets;

    // Toggle datasets di Chart.js
    if (metric === 'all') {
      datasets[0].hidden = false;
      datasets[1].hidden = false;
      datasets[2].hidden = false;
      datasets[3].hidden = false;
    } else if (metric === 'temp') {
      datasets[0].hidden = false;
      datasets[1].hidden = true;
      datasets[2].hidden = true;
      datasets[3].hidden = true;
    } else if (metric === 'press') {
      datasets[0].hidden = true;
      datasets[1].hidden = false;
      datasets[2].hidden = true;
      datasets[3].hidden = true;
    } else if (metric === 'load') {
      datasets[0].hidden = true;
      datasets[1].hidden = true;
      datasets[2].hidden = false;
      datasets[3].hidden = true;
    } else if (metric === 'volt') {
      datasets[0].hidden = true;
      datasets[1].hidden = true;
      datasets[2].hidden = true;
      datasets[3].hidden = false;
    }

    state.chartInstance.update();

    // Toggle Titik Warna Legend Footer Dinamis Sesuai Filter Aktif
    updateChartLegendVisibility(metric);
  }

  function updateChartLegendVisibility(metric) {
    if (!DOM.legendItemTemp || !DOM.legendItemPress || !DOM.legendItemLoad || !DOM.legendItemVolt) return;

    if (metric === 'all') {
      DOM.legendItemTemp.style.display = 'inline-flex';
      DOM.legendItemPress.style.display = 'inline-flex';
      DOM.legendItemLoad.style.display = 'inline-flex';
      DOM.legendItemVolt.style.display = 'inline-flex';
    } else if (metric === 'temp') {
      DOM.legendItemTemp.style.display = 'inline-flex';
      DOM.legendItemPress.style.display = 'none';
      DOM.legendItemLoad.style.display = 'none';
      DOM.legendItemVolt.style.display = 'none';
    } else if (metric === 'press') {
      DOM.legendItemTemp.style.display = 'none';
      DOM.legendItemPress.style.display = 'inline-flex';
      DOM.legendItemLoad.style.display = 'none';
      DOM.legendItemVolt.style.display = 'none';
    } else if (metric === 'load') {
      DOM.legendItemTemp.style.display = 'none';
      DOM.legendItemPress.style.display = 'none';
      DOM.legendItemLoad.style.display = 'inline-flex';
      DOM.legendItemVolt.style.display = 'none';
    } else if (metric === 'volt') {
      DOM.legendItemTemp.style.display = 'none';
      DOM.legendItemPress.style.display = 'none';
      DOM.legendItemLoad.style.display = 'none';
      DOM.legendItemVolt.style.display = 'inline-flex';
    }
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

      DOM.statusDot.className = 'status-indicator-dot online';
      DOM.dataSourceText.textContent = 'LIVE REST API (Mastify)';

      renderRealtimePanel(data);
      pushTimeseriesPoint(data);
      renderMaintenancePanel(data);

      // MEKANISME DUAL ALARM SOURCE:
      // 1. Tarik alarm aktif langsung dari API Alarm Mastify
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
      DOM.statusDot.className = 'status-indicator-dot error';
      DOM.dataSourceText.textContent = `LIVE API: Gagal Terhubung (${err.message})`;
      if (DOM.lastSyncLabel) {
        DOM.lastSyncLabel.textContent = `Sinkron: Gagal (${new Date().toLocaleTimeString('id-ID')} WIB)`;
      }

      const tbody = DOM.alarmsTableBody || document.getElementById('alarmsTableBody');
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="table-empty" style="color: #b91c1c; font-style: normal; padding: 25px 10px !important;">
              <div style="font-weight: 700; font-size: 0.85rem; margin-bottom: 4px;">⚠️ LIVE REST API Terputus (${err.message})</div>
              <div style="font-size: 0.74rem; color: var(--text-muted);">Tidak dapat memverifikasi status alarm dari Mastify Cloud. Beralih ke <strong>OFFLINE MODE</strong> untuk demonstrasi data lokal.</div>
            </td>
          </tr>`;
      }
      const countText = DOM.alarmActiveCountText || document.getElementById('alarmActiveCountText');
      if (countText) countText.textContent = 'Status: Disconnected';
    }
  }

  function getNextOfflineFrame() {
    const frames = OFFLINE_CAPTURED_DATA.frames;
    const frame = frames[state.offlineFrameIndex % frames.length];
    state.offlineFrameIndex++;
    return frame;
  }

  function toggleOperationMode() {
    if (state.currentMode === MODES.LIVE) {
      state.currentMode = MODES.OFFLINE;

      DOM.statusDot.className = 'status-indicator-dot offline';
      DOM.dataSourceText.textContent = 'OFFLINE MODE (Local Data)';
      DOM.btnSourceText.textContent = 'Beralih ke LIVE REST API';
      DOM.btnToggleSource.classList.add('is-offline');

      console.info('[GMS Mode] Beralih ke OFFLINE MODE (Data Demo Sidang)');
    } else {
      state.currentMode = MODES.LIVE;

      DOM.statusDot.className = 'status-indicator-dot online';
      DOM.dataSourceText.textContent = 'LIVE REST API (Mastify)';
      DOM.btnSourceText.textContent = 'Beralih ke OFFLINE MODE';
      DOM.btnToggleSource.classList.remove('is-offline');

      console.info('[GMS Mode] Beralih ke LIVE REST API (Mastify Cloud)');
    }

    executeTelemetryCycle();
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
    if (DOM.btnToggleSource) {
      DOM.btnToggleSource.addEventListener('click', toggleOperationMode);
    }
  }

  async function initApplication() {
    console.info('[GMS] Memulai Inisialisasi Dashboard Genset Monitoring System...');

    startRealtimeClock();
    await loadEnvironmentConfig();
    initChart();

    const initialFrame = OFFLINE_CAPTURED_DATA.frames[0];
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

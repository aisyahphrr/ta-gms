// =============================================================================
// GENSET MONITORING SYSTEM (GMS) — Dashboard Monitoring Genset 3-Fasa
// Tugas Akhir IPB University x PT MASCH
//
// Operasi Sistem:
// 1. Mode Online (Live): Mengambil data telemetri real-time dari platform Mastify IoT.
// 2. Mode Offline (Data Lab): Menggunakan dataLab.js untuk simulasi pengujian.
// =============================================================================

(function () {
  'use strict';

  // ===========================================================================
  // 1. DEFINISI MODE & KONFIGURASI DEFAULT
  // ===========================================================================
  const USE_OFFLINE_DATA = false; // true = pakai dataLab.js, false = fetch dari Mastify API
  if (typeof window !== 'undefined') window.USE_OFFLINE_DATA = USE_OFFLINE_DATA;

  const MODES = {
    LIVE: 'LIVE',
    OFFLINE: 'OFFLINE'
  };

  const DEFAULT_CONFIG = {
    mastifyHost: 'http://178.128.107.238:8080',
    deviceId: '8e725dc0-d9af-11f1-b703-2ff028a3ac15',
    jwtToken: '',
    refreshToken: '',
    username: 'fatina@masch.cc',
    password: 'masch33!',
    pollingIntervalMs: 3000
  };

  // State runtime aplikasi
  const state = {
    currentMode: MODES.LIVE,
    config: Object.assign({}, DEFAULT_CONFIG),
    pollTimer: null,
    clockTimer: null,
    activeChartFilter: 'all',
    chartInstance: null,
    offlineFrameIndex: 0,
    currentAlarms: [],
    alarmLog: [],
    activeSimulation: 'normal'
  };

  // Helper akses penyimpanan lokal browser (localStorage)
  function safeGetStorage(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function safeSetStorage(key, val) {
    try { localStorage.setItem(key, val); } catch (_) { /* abaikan error */ }
  }

  // Helper format angka tampilan (menghasilkan '--' jika nilai null/undefined/NaN)
  function formatNum(val, dec) {
    if (val === null || val === undefined || isNaN(Number(val))) return '--';
    return Number(val).toFixed(dec);
  }

  // ===========================================================================
  // 2. DATASET LOKAL (DATA LAB DARI dataLab.js)
  // Dipisahkan ke file dataLab.js untuk modularitas dan kemudahan simulasi
  // ===========================================================================
  function getDataLabDataset() {
    if (typeof window !== 'undefined' && window.DATA_LAB && Array.isArray(window.DATA_LAB.frames)) {
      return window.DATA_LAB;
    }
    return { frames: [{}] };
  }

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
    // Parameter kelistrikan 3-fasa, daya, dan ketidakseimbangan arus
    valI1: document.getElementById('valI1'),
    valI2: document.getElementById('valI2'),
    valI3: document.getElementById('valI3'),
    valPKw: document.getElementById('valPKw'),
    valSKva: document.getElementById('valSKva'),
    valPf: document.getElementById('valPf'),
    badgeIUnbal: document.getElementById('badgeIUnbal'),
    valFuelVolL: document.getElementById('valFuelVolL'),

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
  // 4. KLIEN HTTP AXIOS & INTERCEPTOR AUTENTIKASI
  // Menangani penambahan token JWT dan auto-login otomatis saat sesi habis
  // ===========================================================================
  const apiClient = axios.create({
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
  });

  // Helper validasi apakah token JWT sudah kadaluarsa (exp timestamp)
  function isJwtExpired(token) {
    if (!token || typeof token !== 'string') return true;
    try {
      const cleanToken = token.replace('Bearer ', '').trim();
      const parts = cleanToken.split('.');
      if (parts.length !== 3) return true;
      // Decode base64 payload JWT di browser
      const payload = JSON.parse(atob(parts[1]));
      // Anggap expired jika waktu sekarang sudah melewati exp (diberi buffer 60 detik)
      return !payload.exp || (Date.now() >= (payload.exp - 60) * 1000);
    } catch (_) {
      return true;
    }
  }

  let _isRefreshing = false;
  let _refreshQueue = [];

  // Tambahkan header Authorization dari state/localStorage ke setiap request
  apiClient.interceptors.request.use(function (config) {
    const token = state.config.jwtToken || safeGetStorage('GMS_JWT_TOKEN');
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
        if (DOM.dataSourceText) DOM.dataSourceText.textContent = 'Autentikasi Mastify Gagal';
        if (DOM.statusDot) DOM.statusDot.className = 'rocker-led error';
        throw loginErr;
      }
    }
    throw error;
  });

  // Re-login otomatis ke Mastify di background tanpa intervensi user
  async function performLogin() {
    const user = state.config.username || safeGetStorage('GMS_USERNAME') || DEFAULT_CONFIG.username || 'fatina@masch.cc';
    const pass = state.config.password || safeGetStorage('GMS_PASSWORD') || DEFAULT_CONFIG.password || 'masch33!';
    if (!user || !pass) {
      throw new Error('Kredensial Mastify belum terkonfigurasi.');
    }
    const url = getMastifyApiEndpoint('/auth/login');
    // Gunakan axios biasa (bukan apiClient) agar tidak masuk loop interceptor
    const res = await axios.post(url, { username: user, password: pass }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    if (!res.data || !res.data.token) throw new Error('Respons login tidak mengandung token.');
    const newToken = res.data.token;
    state.config.jwtToken = newToken;
    if (res.data.refreshToken) {
      state.config.refreshToken = res.data.refreshToken;
      safeSetStorage('GMS_REFRESH_TOKEN', res.data.refreshToken);
    }
    safeSetStorage('GMS_JWT_TOKEN', newToken);
    console.info('[GMS Auth] Token JWT baru berhasil didapat via re-login di background.');
    return newToken;
  }

  // ===========================================================================
  // 4. PEMUATAN KONFIGURASI (URL Params → localStorage → DEFAULT_CONFIG)
  // ===========================================================================
  async function loadEnvironmentConfig() {
    // Prioritaskan parameter URL (?token= / ?jwt=) jika disediakan
    const urlParams = new URLSearchParams(window.location.search);
    const queryToken = urlParams.get('token') || urlParams.get('jwt');
    const queryHost = urlParams.get('host');
    const queryDevice = urlParams.get('deviceId') || urlParams.get('device');

    // URL param: ?username= ?password=
    const queryUsername = urlParams.get('username');
    const queryPassword = urlParams.get('password');

    if (queryToken && !isJwtExpired(queryToken)) {
      state.config.jwtToken = queryToken;
      safeSetStorage('GMS_JWT_TOKEN', queryToken);
    } else {
      const cachedToken = safeGetStorage('GMS_JWT_TOKEN');
      if (cachedToken && !isJwtExpired(cachedToken)) {
        state.config.jwtToken = cachedToken;
      } else {
        // Token di localStorage sudah kadaluarsa atau kosong, reset agar auto-login berjalan
        state.config.jwtToken = '';
        safeSetStorage('GMS_JWT_TOKEN', '');
      }
    }

    if (queryHost) state.config.mastifyHost = queryHost;
    if (queryDevice) state.config.deviceId = queryDevice;

    // Baca kredensial dari penyimpanan lokal jika tersedia
    const cachedUser = safeGetStorage('GMS_USERNAME');
    const cachedPass = safeGetStorage('GMS_PASSWORD');
    if (cachedUser) state.config.username = cachedUser;
    if (cachedPass) state.config.password = cachedPass;
    if (queryUsername) { state.config.username = queryUsername; safeSetStorage('GMS_USERNAME', queryUsername); }
    if (queryPassword) { state.config.password = queryPassword; safeSetStorage('GMS_PASSWORD', queryPassword); }

    // Fallback default kredensial proyek jika tidak ada di storage/query
    if (!state.config.username) state.config.username = DEFAULT_CONFIG.username;
    if (!state.config.password) state.config.password = DEFAULT_CONFIG.password;
    if (!state.config.deviceId) state.config.deviceId = DEFAULT_CONFIG.deviceId;
    if (!state.config.mastifyHost) state.config.mastifyHost = DEFAULT_CONFIG.mastifyHost;

    // Konfigurasi diambil dari URL params, localStorage, dan DEFAULT_CONFIG di atas.
    // Tidak ada fetch .env — file .env tidak tersedia di browser (Vercel memblokir akses ke file ini).

    // Pastikan kita punya JWT Token yang valid. Jika belum ada, otomatis login sekarang di background!
    if (!state.config.jwtToken && state.config.username && state.config.password) {
      try {
        await performLogin();
      } catch (loginErr) {
        console.warn('[GMS Auth] Auto-login awal tertunda:', loginErr.message);
      }
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
    // Daftar parameter telemetri yang diminta dari server Mastify
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
      'fuel_est_l', 'sim_fuel_est_l', 'fuelEstimate',
      'alarm_level', 'alarm_msg'
    ].join(',');

    const url = getMastifyApiEndpoint(`/plugins/telemetry/DEVICE/${state.config.deviceId}/values/timeseries?keys=${keys}`);

    // Kirim permintaan data telemetri dengan header autentikasi
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
    }

    // Helper konversi angka murni tanpa fallback buatan (null jika data belum tersedia)
    function safeNum(raw) {
      if (raw === null || raw === undefined || raw === '') return null;
      const v = parseFloat(raw);
      return isNaN(v) ? null : v;
    }

    const rawRunHours = safeNum(getLatestVal('run_hours', 'hourMeter', 'runHours'));
    let rawMaintDue = safeNum(getLatestVal('maint_due_h', 'maintenanceDueHours', 'maintDue'));
    if ((rawMaintDue === null || rawMaintDue === undefined) && rawRunHours !== null && rawRunHours !== undefined) {
      // Buku Induk Spesifikasi Section 3.K: maint_due_h = 250 - (run_hours % 250)
      rawMaintDue = parseFloat((250 - (rawRunHours % 250)).toFixed(1));
    }
    let parsedMaintStatus = getLatestVal('maintenance_status', 'maintenanceStatus', 'maint_status', 'maintStatus');
    if (parsedMaintStatus && typeof parsedMaintStatus === 'string') {
      parsedMaintStatus = parsedMaintStatus.trim();
    } else if (rawMaintDue !== null && rawMaintDue !== undefined) {
      if (rawMaintDue <= 0) parsedMaintStatus = 'JATUH TEMPO (SERVIS)';
      else if (rawMaintDue <= 20.0) parsedMaintStatus = 'PERLU SERVIS SEGERA';
      else parsedMaintStatus = 'TERJADWAL (NORMAL)';
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
    const iL1 = safeNum(getLatestVal('i_l1', 'i_1', 'i_r'));
    const iL2 = safeNum(getLatestVal('i_l2', 'i_2', 'i_s'));
    const iL3 = safeNum(getLatestVal('i_l3', 'i_3', 'i_t'));

    // Baca unbalance dan deviasi langsung dari data Mastify (Single Source of Truth)
    // Ketidakseimbangan tegangan NEMA (Prioritas: Mastify -> Hitung Langsung dari Tegangan 3-Fasa)
    let vUnbal = safeNum(getLatestVal('v_unbal_pct', 'voltage_unbalance', 'unbalance'));
    if (vUnbal === null && vL1 !== null && vL2 !== null && vL3 !== null) {
      const vAvg = (vL1 + vL2 + vL3) / 3.0;
      if (vAvg > 0) {
        const maxVDiff = Math.max(Math.abs(vL1 - vAvg), Math.abs(vL2 - vAvg), Math.abs(vL3 - vAvg));
        vUnbal = parseFloat(((maxVDiff / vAvg) * 100).toFixed(1));
      }
    }

    let voltBalanceText = getLatestVal('voltage_balance') || null;
    if (!voltBalanceText && vUnbal !== null) {
      if (vUnbal > 3.0) voltBalanceText = 'CRITICAL (FAULT)';
      else if (vUnbal > 2.0) voltBalanceText = 'WARNING (MAJOR)';
      else voltBalanceText = 'SEIMBANG (NORMAL)';
    }

    // Ketidakseimbangan arus NEMA (Prioritas: Mastify -> Hitung Langsung dari Arus 3-Fasa)
    let iUnbal = safeNum(getLatestVal('i_unbal_avg_15m', 'i_unbal_pct'));
    if (iUnbal === null && iL1 !== null && iL2 !== null && iL3 !== null) {
      const iAvg = (iL1 + iL2 + iL3) / 3.0;
      if (iAvg > 0) {
        const maxIDiff = Math.max(Math.abs(iL1 - iAvg), Math.abs(iL2 - iAvg), Math.abs(iL3 - iAvg));
        iUnbal = parseFloat(((maxIDiff / iAvg) * 100).toFixed(1));
      }
    }

    const loadPct = safeNum(getLatestVal('load_pct', 'load'));
    const loadStatus = getLatestVal('load_status') || (loadPct !== null ? 'NORMAL' : null);

    // Level solar dan volume solar murni dari field Mastify (Rule Chain)
    const fuelMmVal = safeNum(getLatestVal('fuel_level_mm'));
    const fuelVolVal = safeNum(getLatestVal('fuel_vol_l'));
    const fuelStatusVal = getLatestVal('fuel_status') || 'NORMAL';
    const tempStatusVal = getLatestVal('temp_status') || 'NORMAL';
    const pressStatusVal = getLatestVal('press_status') || 'NORMAL';

    // Estimasi konsumsi BBM kumulatif (Prioritas: fuel_est_l -> sim_fuel_est_l -> Hitung SFC)
    let fuelEstVal = safeNum(getLatestVal('fuel_est_l', 'sim_fuel_est_l', 'fuelEstimate'));
    if (fuelEstVal === null && rawRunHours !== null && rawRunHours > 0) {
      const activeKw = (pKw !== null && pKw > 0) ? pKw : 22.0;
      fuelEstVal = parseFloat((rawRunHours * activeKw * 0.24).toFixed(1));
    }

    return {
      // A. Engine & Mekanikal
      engine_state: getLatestVal('engine_state', 'status') || null,
      eng_speed_rpm: safeNum(getLatestVal('eng_speed_rpm', 'rpm', 'speed')),
      oil_press_bar: safeNum(getLatestVal('oil_press_bar', 'pressure')),
      press_status: pressStatusVal,
      coolant_temp_c: coolantTemp,
      engine_temp_c: coolantTemp,
      temp_status: tempStatusVal,
      fuel_level_mm: fuelMmVal !== null ? fuelMmVal : safeNum(getLatestVal('fuel_vol_l')),
      fuel_vol_l: fuelVolVal,
      fuel_status: fuelStatusVal,
      batt_volt_v: battVolt,
      battery_v: battVolt,
      run_hours: rawRunHours,
      maint_due_h: rawMaintDue,
      maintenance_status: parsedMaintStatus,
      fuel_est_l: fuelEstVal,

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
      v_unbal_pct: vUnbal,
      voltage_balance: voltBalanceText,
      i_l1: iL1,
      i_l2: iL2,
      i_l3: iL3,
      i_unbal_pct: iUnbal,
      i_unbal_avg_15m: safeNum(getLatestVal('i_unbal_avg_15m')) !== null ? safeNum(getLatestVal('i_unbal_avg_15m')) : iUnbal,
      freq_hz: safeNum(getLatestVal('freq_hz')),
      p_total_kw: pKw,
      p_kw: pKw,
      s_total_kva: sKva,
      s_kva: sKva,
      load_pct: loadPct,
      load_status: loadStatus,
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
  // 6. SINKRONISASI REAKTIF ALARM MASTIFY & RENDER PANEL MONITORING
  // ===========================================================================

  // Sinkronisasi status badge Panel 01 murni mengikuti alarm aktif Mastify (Pure Read-Only HMI)
  function syncSensorStatusFromAlarms(data, alarms) {
    if (!data) return;
    const list = Array.isArray(alarms) ? alarms : (state.alarmLog || []);

    function getSeverity(ruleType) {
      const found = list.find(a =>
        a.ruleType === ruleType &&
        (a.ruleStatus === 'ACTIVE' || a.ruleStatus === 'ACTIVE_UNACK' || a.ruleStatus === 'ACTIVE_ACK')
      );
      return found ? normalizeSeverityTier(found.level) : null;
    }

    // Sinkronisasi status kesehatan loop NAMUR jika terdeteksi alarm sensor fault dari Mastify
    if (!data.ai1_st && getSeverity('SENSOR_FAULT_AI1')) data.ai1_st = 'FAULT_LOW';
    if (!data.ai2_st && getSeverity('SENSOR_FAULT_AI2')) data.ai2_st = 'FAULT_LOW';
    if (!data.ai3_st && getSeverity('SENSOR_FAULT_AI3')) data.ai3_st = 'FAULT_LOW';

    // 1. Suhu Mesin: Alarm ENGINE_TEMP aktif -> CRITICAL / MAJOR, jika tidak -> NORMAL
    data.temp_status = getSeverity('ENGINE_TEMP') || 'NORMAL';

    // 2. Tekanan Oli: Alarm OIL_PRESSURE aktif -> CRITICAL / MAJOR, jika tidak -> NORMAL
    data.press_status = getSeverity('OIL_PRESSURE') || 'NORMAL';

    // 3. Level Solar: Alarm FUEL_LEVEL aktif -> CRITICAL / MAJOR, jika tidak -> NORMAL
    data.fuel_status = getSeverity('FUEL_LEVEL') || 'NORMAL';

    // 4. Beban Genset: Alarm LOAD_FAULT aktif -> CRITICAL / MAJOR, jika tidak -> NORMAL
    data.load_status = getSeverity('LOAD_FAULT') || (data.load_pct !== null && data.load_pct !== undefined ? 'NORMAL' : null);
  }

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

    const hasIUnbal = (data.i_unbal_pct !== null && data.i_unbal_pct !== undefined);
    if (DOM.valIUnbalPct) {
      DOM.valIUnbalPct.textContent = hasIUnbal ? Number(data.i_unbal_pct).toFixed(1) + '%' : '--%';
    }

    renderNemaVoltageBalance(data.voltage_balance, data.v_unbal_pct);

    // Arus beban 3-fasa
    if (DOM.valI1) DOM.valI1.textContent = (data.i_l1 !== null && data.i_l1 !== undefined) ? formatNum(data.i_l1, 2) : '--';
    if (DOM.valI2) DOM.valI2.textContent = (data.i_l2 !== null && data.i_l2 !== undefined) ? formatNum(data.i_l2, 2) : '--';
    if (DOM.valI3) DOM.valI3.textContent = (data.i_l3 !== null && data.i_l3 !== undefined) ? formatNum(data.i_l3, 2) : '--';

    // Daya aktif, daya semu, dan faktor daya
    if (DOM.valPKw) DOM.valPKw.textContent = (data.p_kw !== null && data.p_kw !== undefined)
      ? formatNum(data.p_kw, 2) + ' kW' : '--';
    if (DOM.valSKva) DOM.valSKva.textContent = (data.s_kva !== null && data.s_kva !== undefined)
      ? formatNum(data.s_kva, 2) + ' kVA' : '--';
    if (DOM.valPf) DOM.valPf.textContent = (data.pf !== null && data.pf !== undefined)
      ? formatNum(data.pf, 2) : '--';

    // Ketidakseimbangan arus 3-fasa sesuai standar NEMA
    if (DOM.badgeIUnbal) {
      const iu = data.i_unbal_pct;
      if (iu === null || iu === undefined) {
        DOM.badgeIUnbal.textContent = 'ARUS --';
        DOM.badgeIUnbal.className = 'voltage-badge';
      } else if (Number(iu) > 40) {
        DOM.badgeIUnbal.textContent = 'ARUS KRITIS (' + Number(iu).toFixed(1) + '%)';
        DOM.badgeIUnbal.className = 'voltage-badge badge-nema-critical';
      } else if (Number(iu) > 20) {
        DOM.badgeIUnbal.textContent = 'ARUS ASIMETRIS (' + Number(iu).toFixed(1) + '%)';
        DOM.badgeIUnbal.className = 'voltage-badge badge-nema-warning';
      } else {
        DOM.badgeIUnbal.textContent = 'ARUS SEIMBANG (' + Number(iu).toFixed(1) + '%)';
        DOM.badgeIUnbal.className = 'voltage-badge badge-nema-normal';
      }
    }

    // Estimasi volume solar
    if (DOM.valFuelVolL) {
      DOM.valFuelVolL.textContent = (data.fuel_vol_l !== null && data.fuel_vol_l !== undefined)
        ? '(' + formatNum(data.fuel_vol_l, 1) + ' L)' : '';
    }

    // Evaluasi kondisi loop sensor standar NAMUR NE43
    renderNamurSensorStatus(DOM.pillPressStatus, data.press_status, data.ai1_st, data.oil_press_bar);
    renderNamurSensorStatus(DOM.pillTempStatus, data.temp_status, data.ai2_st, data.engine_temp_c);
    renderNamurSensorStatus(DOM.pillFuelStatus, data.fuel_status, data.ai3_st, data.fuel_level_mm);
  }

  // Render status pill dengan override NAMUR NE43 jika sensor fault
  function renderNamurSensorStatus(pillEl, thresholdStatus, namurStatus, val) {
    if (!pillEl) return;
    const ns = String(namurStatus || '').toUpperCase().trim();
    if (ns === 'FAULT_LOW' || ns === 'FAULT_HIGH') {
      pillEl.textContent = ns.replace('_', ' ');
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

  // evaluasi status ketidakseimbangan tegangan 3-fasa NEMA (konsolidasi threshold & teks status — simetris tanpa dot)
  function renderNemaVoltageBalance(balanceText, unbalancePct) {
    if (!DOM.badgeVoltageBalance || !DOM.textVoltageBalance) return;

    if (unbalancePct === null || unbalancePct === undefined) {
      DOM.badgeVoltageBalance.className = 'voltage-badge';
      DOM.textVoltageBalance.textContent = 'TEGANGAN --';
      return;
    }

    const pct = parseFloat(unbalancePct) || 0;
    const up = String(balanceText || '').toUpperCase();

    let text = `TEGANGAN SEIMBANG (${pct.toFixed(1)}%)`;
    let badgeClass = 'badge-nema-normal';

    if (up.includes('CRIT') || up.includes('FAULT') || pct > 3.0) {
      badgeClass = 'badge-nema-critical';
      text = `TEGANGAN KRITIS (${pct.toFixed(1)}%)`;
    } else if (up.includes('WARN') || up.includes('MAJOR') || pct > 2.0) {
      badgeClass = 'badge-nema-warning';
      text = `TEGANGAN ASIMETRIS (${pct.toFixed(1)}%)`;
    } else {
      badgeClass = 'badge-nema-normal';
      text = `TEGANGAN SEIMBANG (${pct.toFixed(1)}%)`;
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

  // Mengambil daftar alarm aktif langsung dari server Mastify
  async function fetchMastifyAlarms() {
    // searchStatus=ACTIVE memfilter server-side untuk ACTIVE_UNACK dan ACTIVE_ACK
    // Mencegah alarm aktif terdorong keluar pagination akibat banyaknya riwayat alarm CLEARED
    const url = getMastifyApiEndpoint(`/alarm/DEVICE/${state.config.deviceId}?searchStatus=ACTIVE&pageSize=50&page=0&sortProperty=createdTime&sortOrder=DESC`);

    try {
      const res = await apiClient.get(url);
      const json = res.data;

      const rawList = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
      // Filter: buang alarm yang sudah berstatus CLEARED saja.
      // JANGAN filter berdasarkan clearTs > 0 — ThingsBoard kadang mengisi clearTs dengan nilai
      // non-zero pada alarm ACTIVE_UNACK/ACTIVE_ACK (misalnya FUEL_LEVEL), sehingga alarm aktif
      // bisa terbuang secara salah.
      const activeList = rawList.filter(function (item) {
        const s = String(item.status || '').toUpperCase();
        return !s.startsWith('CLEARED');
      });

      // Debug: log semua alarm yang lolos filter (berguna saat troubleshoot live)
      if (activeList.length > 0) {
        console.info('[GMS Alarm] Raw alarm lolos filter dari Mastify:', activeList.map(function(a) {
          return { type: a.type, status: a.status, clearTs: a.clearTs, details: a.details };
        }));
      }

      if (!activeList || activeList.length === 0) return [];

      return activeList.map(function (item) {
        const timeStr = item.createdTime
          ? new Date(item.createdTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // alarmId: ThingsBoard menyimpan UUID di item.id.id (nested)
        const alarmId = (item.id && item.id.id) ? item.id.id : (item.id || '');

        return {
          id: alarmId,
          isServerAlarm: true, // Alarm resmi server Mastify
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
  // Hanya berlaku untuk alarm resmi yang memiliki ID dari server Mastify
  async function acknowledgeAlarm(alarmId) {
    if (!alarmId) return;

    const url = getMastifyApiEndpoint('/alarm/' + alarmId + '/ack');
    try {
      await apiClient.post(url, {});
      console.info('[GMS Alarm] Acknowledge berhasil ke Mastify untuk alarmId:', alarmId);
      // Perbarui status lokal langsung ke ACTIVE_ACK
      const target = state.alarmLog.find(function (a) { return a.id === alarmId; });
      if (target) {
        target.ruleStatus = 'ACTIVE_ACK';
      }
      // Re-fetch alarm resmi dari server Mastify
      const freshAlarms = await fetchMastifyAlarms();
      if (freshAlarms !== null) {
        renderAlarmSystem(freshAlarms, 'Mastify Live Alarm API');
      }
    } catch (err) {
      console.warn('[GMS Alarm] Gagal acknowledge alarm ke Mastify:', err.message);
    }
  }

  // Memeriksa status keaktifan perangkat fisik di platform Mastify (Server Attribute: active)
  async function fetchDeviceActiveStatus() {
    try {
      const url = getMastifyApiEndpoint(`/plugins/telemetry/DEVICE/${state.config.deviceId}/values/attributes?serverKeys=active`);
      const res = await apiClient.get(url);
      const list = Array.isArray(res.data) ? res.data : [];
      const activeEntry = list.find(a => a.key === 'active');
      return activeEntry ? Boolean(activeEntry.value) : true;
    } catch (_) {
      return true;
    }
  }

  // normalisasi jenis alarm ke kode teknis acuan
  // lookup terpadu: normalisasi kode rule + pesan default fallback jika Mastify tidak kirim field message
  const ALARM_RULE_MAP = {
    // --- STANDAR ALARM KEYS (Eksak sesuai Device Profile Mastify) ---
    OIL_PRESSURE: { code: 'OIL_PRESSURE', msg: 'Tekanan oli pelumas di luar rentang batas aman operasional.' },
    ENGINE_TEMP: { code: 'ENGINE_TEMP', msg: 'Suhu pendingin engine terdeteksi melebihi ambang batas aman.' },
    VOLTAGE_FAULT: { code: 'VOLTAGE_FAULT', msg: 'Tegangan alternator 3-fasa menyimpang dari regulasi normal.' },
    FREQ_FAULT: { code: 'FREQ_FAULT', msg: 'Frekuensi output generator menyimpang di luar batas nominal 50.0 Hz.' },
    LOAD_FAULT: { code: 'LOAD_FAULT', msg: 'Beban genset melebihi kapasitas daya nominal (overload).' },
    CURRENT_IMBALANCE: { code: 'CURRENT_IMBALANCE', msg: 'Ketidakseimbangan arus 3-fasa NEMA melebihi ambang batas aman.' },
    FUEL_LEVEL: { code: 'FUEL_LEVEL', msg: 'Level solar tangki genset di bawah batas aman operasional.' },
    SENSOR_FAULT_AI1: { code: 'SENSOR_FAULT_AI1', msg: 'Sinyal loop 4-20mA sensor tekanan oli (AI1) fault: di luar rentang NAMUR NE43 (< 3.8mA / > 20.5mA).' },
    SENSOR_FAULT_AI2: { code: 'SENSOR_FAULT_AI2', msg: 'Sinyal loop 4-20mA sensor suhu pendingin engine (AI2 PT100) fault: di luar rentang NAMUR NE43.' },
    SENSOR_FAULT_AI3: { code: 'SENSOR_FAULT_AI3', msg: 'Sinyal loop 4-20mA sensor level solar (AI3 Hydrostatic) fault: di luar rentang NAMUR NE43.' },
    BATTERY_FAULT: { code: 'BATTERY_FAULT', msg: 'Tegangan baterai starter lemah di bawah batas 24.0 V.' },
    ENGINE_FAULT: { code: 'ENGINE_FAULT', msg: 'Anomali proteksi engine terdeteksi oleh rule chain.' },

    // --- FALLBACK SUBSTRING KEYS (Untuk kompatibilitas format parsial) ---
    FREQ: { code: 'FREQ_FAULT', msg: 'Frekuensi output generator menyimpang di luar batas nominal 50.0 Hz.' },
    TEMP: { code: 'ENGINE_TEMP', msg: 'Suhu pendingin engine terdeteksi melebihi ambang batas aman.' },
    OIL: { code: 'OIL_PRESSURE', msg: 'Tekanan oli pelumas di luar rentang batas aman operasional.' },
    PRESS: { code: 'OIL_PRESSURE', msg: 'Tekanan oli pelumas di luar rentang batas aman operasional.' },
    VOLT: { code: 'VOLTAGE_FAULT', msg: 'Tegangan alternator 3-fasa menyimpang dari regulasi normal.' },
    NEMA: { code: 'VOLTAGE_FAULT', msg: 'Tegangan alternator 3-fasa menyimpang dari regulasi normal.' },
    SENSOR: { code: 'SENSOR_FAULT_AI1', msg: 'Sinyal loop 4-20mA sensor di luar rentang standar NAMUR NE43.' },
    NAMUR: { code: 'SENSOR_FAULT_AI1', msg: 'Sinyal loop 4-20mA sensor di luar rentang standar NAMUR NE43.' },
    FUEL: { code: 'FUEL_LEVEL', msg: 'Level solar tangki genset di bawah batas aman operasional.' },
    BATT: { code: 'BATTERY_FAULT', msg: 'Tegangan baterai starter lemah di bawah batas 24.0 V.' },
    LOAD: { code: 'LOAD_FAULT', msg: 'Beban genset melebihi kapasitas daya nominal (overload).' },
    OVERLOAD: { code: 'LOAD_FAULT', msg: 'Beban genset melebihi kapasitas daya nominal (overload).' },
    IMBAL: { code: 'CURRENT_IMBALANCE', msg: 'Ketidakseimbangan arus 3-fasa NEMA melebihi ambang batas aman.' },
    CURREN: { code: 'CURRENT_IMBALANCE', msg: 'Ketidakseimbangan arus 3-fasa NEMA melebihi ambang batas aman.' },
    ENGINE: { code: 'ENGINE_FAULT', msg: 'Anomali proteksi engine terdeteksi oleh rule chain.' },
    TRIP: { code: 'ENGINE_FAULT', msg: 'Anomali proteksi engine terdeteksi oleh rule chain.' },
    FAULT: { code: 'ENGINE_FAULT', msg: 'Anomali proteksi engine terdeteksi oleh rule chain.' }
  };

  function formatAlarmRuleName(ruleType) {
    const r = String(ruleType || '').toUpperCase().trim();
    // Prioritas: exact match terlebih dahulu, lalu substring
    const exactKey = Object.keys(ALARM_RULE_MAP).find(k => r === k);
    if (exactKey) return ALARM_RULE_MAP[exactKey].code;
    const match = Object.keys(ALARM_RULE_MAP).find(k => r.includes(k));
    return match ? ALARM_RULE_MAP[match].code : (r || 'SYS_ALARM');
  }

  function getDefaultAlarmMessage(type) {
    const t = String(type || '').toUpperCase();
    // Prioritas: exact match terlebih dahulu, lalu substring
    const exactKey = Object.keys(ALARM_RULE_MAP).find(k => t === k);
    if (exactKey) return ALARM_RULE_MAP[exactKey].msg;
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

  // Ambil daftar alarm dari DATA_LAB untuk mode offline/simulasi sidang.
  // Alarm dibaca dari DATA_LAB.activeAlarms; skenario simulasi keypress menambahkan alarm sintetis
  // sesuai injeksi yang dilakukan di getNextOfflineFrame().
  function getOfflineAlarms(frame) {
    const dataset = getDataLabDataset();
    const baseAlarms = Array.isArray(dataset.activeAlarms) ? dataset.activeAlarms.map(a => Object.assign({}, a)) : [];
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Injeksi alarm sesuai skenario simulasi sidang aktif (hotkey keyboard)
    const sim = state.activeSimulation;
    const SIM_ALARMS = {
      temp: { id: null, isServerAlarm: false, timestamp: timeStr, level: 'MAJOR', ruleType: 'ENGINE_TEMP', message: 'SIMULASI: Suhu pendingin engine mendekati batas peringatan (88.5°C > 90.0°C).', ruleStatus: 'ACTIVE' },
      oil: { id: null, isServerAlarm: false, timestamp: timeStr, level: 'CRITICAL', ruleType: 'OIL_PRESSURE', message: 'SIMULASI: Tekanan pelumas oli drop kritis (1.45 bar < 2.5 bar).', ruleStatus: 'ACTIVE' },
      voltage: { id: null, isServerAlarm: false, timestamp: timeStr, level: 'CRITICAL', ruleType: 'VOLTAGE_FAULT', message: 'SIMULASI: Deviasi tegangan 3-fasa NEMA kritis (4.3% > 3.0%). Risiko overheat belitan alternator.', ruleStatus: 'ACTIVE' },
      freq: { id: null, isServerAlarm: false, timestamp: timeStr, level: 'MAJOR', ruleType: 'FREQ_FAULT', message: 'SIMULASI: Frekuensi alternator menyimpang dari nominal 50.0 Hz (48.2 Hz).', ruleStatus: 'ACTIVE' },
      imbalance: { id: null, isServerAlarm: false, timestamp: timeStr, level: 'CRITICAL', ruleType: 'CURRENT_IMBALANCE', message: 'SIMULASI: Ketidakseimbangan arus 3-fasa rata-rata kritis (48.5% > 40.0%).', ruleStatus: 'ACTIVE' },
      sensor_ai1: { id: null, isServerAlarm: false, timestamp: timeStr, level: 'MAJOR', ruleType: 'SENSOR_FAULT_AI1', message: 'SIMULASI: Loop 4-20mA sensor AI1 Pressure Transducer terputus (< 3.8mA). NAMUR NE43 FAULT_LOW.', ruleStatus: 'ACTIVE' },
      sensor_ai2: { id: null, isServerAlarm: false, timestamp: timeStr, level: 'CRITICAL', ruleType: 'SENSOR_FAULT_AI2', message: 'SIMULASI: Loop 4-20mA sensor AI2 PT100 Suhu Pendingin Engine terputus (< 3.8mA). NAMUR NE43 FAULT_LOW.', ruleStatus: 'ACTIVE' },
      sensor_ai3: { id: null, isServerAlarm: false, timestamp: timeStr, level: 'CRITICAL', ruleType: 'SENSOR_FAULT_AI3', message: 'SIMULASI: Loop 4-20mA sensor AI3 Hydrostatic Level Solar terputus (< 3.8mA). NAMUR NE43 FAULT_LOW.', ruleStatus: 'ACTIVE' }
    };

    if (sim && sim !== 'normal' && SIM_ALARMS[sim]) {
      // Skenario simulasi aktif: tampilkan hanya alarm skenario yang dipilih
      return [SIM_ALARMS[sim]];
    }

    // Normal offline: gunakan alarm dari DATA_LAB.activeAlarms
    return baseAlarms.map(a => Object.assign({ isServerAlarm: false }, a));
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
    // ACTIVE_ACK tidak di-CLEAR paksa di sini — biarkan Mastify yang tentukan clearTs-nya
    state.alarmLog.forEach(item => {
      if ((item.ruleStatus === 'ACTIVE' || item.ruleStatus === 'ACTIVE_UNACK') && !activeRuleMap.has(item.ruleType)) {
        item.ruleStatus = 'CLEARED';
        item.timestamp = timeStr;
        item.message = `Parameter ${item.ruleType} telah kembali normal dalam batas toleransi aman.`;
      }
    });

    // update timestamp jika alarm masih aktif, atau unshift alarm baru (anti-duplikasi)
    activeList.forEach(newAlarm => {
      const existing = state.alarmLog.find(item => item.ruleType === newAlarm.ruleType &&
        (item.ruleStatus === 'ACTIVE' || item.ruleStatus === 'ACTIVE_UNACK' || item.ruleStatus === 'ACTIVE_ACK'));
      if (existing) {
        existing.id = newAlarm.id || existing.id;
        existing.isServerAlarm = newAlarm.isServerAlarm !== undefined ? newAlarm.isServerAlarm : existing.isServerAlarm;
        existing.message = newAlarm.message;
        existing.timestamp = newAlarm.timestamp || timeStr;
        existing.level = newAlarm.level;
        if (existing.ruleStatus !== 'ACTIVE_ACK') {
          existing.ruleStatus = newAlarm.ruleStatus || 'ACTIVE';
        }
      } else {
        state.alarmLog.unshift({
          id: newAlarm.id || null,
          isServerAlarm: Boolean(newAlarm.isServerAlarm),
          timestamp: newAlarm.timestamp || timeStr,
          level: newAlarm.level,
          ruleType: newAlarm.ruleType,
          message: newAlarm.message,
          ruleStatus: newAlarm.ruleStatus || 'ACTIVE'
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

    const activeCount = state.alarmLog.filter(a => a.ruleStatus === 'ACTIVE' || a.ruleStatus === 'ACTIVE_UNACK').length;
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
      const isUnack = (alarm.ruleStatus === 'ACTIVE_UNACK' || statusInfo.text === 'Active');

      // Tombol / dialog konfirmasi Acknowledge HANYA aktif untuk alarm resmi dari API Mastify
      const canAcknowledge = isUnack && alarm.isServerAlarm && alarm.id;

      const ackCell = canAcknowledge
        ? `<td class="col-aksi">
            <span class="alarm-status-text status-active btn-status-click" 
                  data-alarm-id="${alarm.id}" 
                  data-rule-code="${ruleCode}" 
                  title="Klik untuk Acknowledge alarm resmi ke Mastify">
              Active
            </span>
          </td>`
        : `<td class="col-aksi">
            <span class="alarm-status-text ${statusInfo.cssClass}">
              ${statusInfo.text}
            </span>
          </td>`;

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

    // Dialog konfirmasi sistem web saat tulisan Active diklik
    tbody.querySelectorAll('.btn-status-click').forEach(function (el) {
      el.addEventListener('click', async function () {
        const id = this.getAttribute('data-alarm-id');
        const code = this.getAttribute('data-rule-code') || 'ALARM';
        const confirmed = window.confirm(`Konfirmasi Acknowledge Alarm: ${code}?\n\nKirim konfirmasi penanganan alarm ke platform Mastify Cloud.`);
        if (confirmed) {
          this.textContent = 'Proses...';
          this.style.pointerEvents = 'none';
          await acknowledgeAlarm(id);
        }
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

    let rawStatus = data.maintenance_status ? String(data.maintenance_status).trim() : null;
    if (!rawStatus && hasDue) {
      const dueHours = Number(data.maint_due_h);
      if (dueHours <= 0) {
        rawStatus = 'JATUH TEMPO (SERVIS)';
      } else if (dueHours <= 20.0) {
        rawStatus = 'PERLU SERVIS SEGERA';
      } else {
        rawStatus = 'TERJADWAL (NORMAL)';
      }
    }

    if (rawStatus) {
      const statusUpper = rawStatus.toUpperCase();
      DOM.badgeMaintStatus.textContent = rawStatus;
      if (statusUpper.includes('JATUH TEMPO') || statusUpper.includes('CRIT') || statusUpper.includes('KADALUARSA')) {
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
    if (window.Chart && window.Chart.defaults && window.Chart.defaults.font) {
      window.Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
    }

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
      all: { temp: true, press: true, load: true, volt: true },
      temp: { temp: true, press: false, load: false, volt: false },
      press: { temp: false, press: true, load: false, volt: false },
      load: { temp: false, press: false, load: true, volt: false },
      volt: { temp: false, press: false, load: false, volt: true }
    };
    const vis = VISIBILITY[metric] || VISIBILITY.all;
    DOM.legendItemTemp.style.display = vis.temp ? 'inline-flex' : 'none';
    DOM.legendItemPress.style.display = vis.press ? 'inline-flex' : 'none';
    DOM.legendItemLoad.style.display = vis.load ? 'inline-flex' : 'none';
    DOM.legendItemVolt.style.display = vis.volt ? 'inline-flex' : 'none';
  }

  // ===========================================================================
  // 8. LOGIKA POLLING 2 MODE EKSPLISIT (LIVE vs OFFLINE)
  // ZERO AUTO-FALLBACK: Transisi hanya lewat intervensi pengguna
  // ===========================================================================
  async function executeTelemetryCycle() {
    updateLastSyncTimestamp();

    if (USE_OFFLINE_DATA || state.currentMode === MODES.OFFLINE) {
      // MODE OFFLINE: gunakan DATA_LAB dari dataLab.js (simulasi sidang / demo)
      const frame = getNextOfflineFrame();
      const offlineAlarms = getOfflineAlarms(frame);
      syncSensorStatusFromAlarms(frame, offlineAlarms);

      renderRealtimePanel(frame);
      pushTimeseriesPoint(frame);
      renderMaintenancePanel(frame);
      renderAlarmSystem(offlineAlarms, 'Offline (DATA_LAB — dataLab.js)');
      console.info('[GMS Telemetry] Mode: OFFLINE | LED: Indigo/Ungu (Offline Simulasi)');
      return;
    }

    // MODE LIVE: sumber tunggal — REST API Mastify (Single Source of Truth)
    try {
      // Polling telemetri, alarm, dan status keaktifan perangkat fisik di Mastify
      const [data, liveAlarms, isDeviceActive] = await Promise.all([
        fetchMastifyTelemetry(),
        fetchMastifyAlarms(),
        fetchDeviceActiveStatus()
      ]);
      if (!data) throw new Error('Data telemetri kosong');

      if (DOM.statusDot) {
        if (!isDeviceActive) {
          DOM.statusDot.className = 'rocker-led inactive';
          console.info('[GMS Telemetry] Mode: LIVE REST API | Perangkat Mastify: Inactive/Standby | LED: Abu-abu (Inactive)');
        } else {
          DOM.statusDot.className = 'rocker-led online';
          console.info('[GMS Telemetry] Mode: LIVE REST API | Perangkat Mastify: Active | LED: Hijau (Online)');
        }
      }
      if (DOM.dataSourceText) DOM.dataSourceText.textContent = 'LIVE REST API (Mastify)';

      // 1. Simpan & Render Alarm Resmi Mastify ke Panel 03
      if (liveAlarms !== null) {
        state.currentAlarms = liveAlarms;
        renderAlarmSystem(liveAlarms, 'Mastify Cloud Alarm API');
      }

      // 2. Sinkronkan status badge Panel 01 murni berdasarkan alarm aktif Mastify
      syncSensorStatusFromAlarms(data, liveAlarms !== null ? liveAlarms : state.currentAlarms);

      // 3. Render Panel Telemetri, Timeseries, & Maintenance
      renderRealtimePanel(data);
      pushTimeseriesPoint(data);
      renderMaintenancePanel(data);

    } catch (err) {
      console.warn(`[GMS Telemetry] Mode: LIVE REST API | Status: Terputus (${err.message}) | LED: Merah (Error)`);

      if (DOM.statusDot) DOM.statusDot.className = 'rocker-led error';
      if (DOM.dataSourceText) DOM.dataSourceText.textContent = `LIVE API: Terputus (${err.message})`;
      if (DOM.lastSyncLabel) {
        DOM.lastSyncLabel.textContent = `Sinkron: Terputus (${new Date().toLocaleTimeString('id-ID')} WIB)`;
      }
      // Pertahankan data terakhir di layar; tidak render frame fallback offline di mode Live
    }
  }

  // generator data telemetri offline (mendukung injeksi skenario alarm via keyboard untuk demo sidang)
  function getNextOfflineFrame() {
    const dataset = (typeof window !== 'undefined' && window.DATA_LAB) ? window.DATA_LAB : OFFLINE_CAPTURED_DATA;
    const frames = dataset.frames || OFFLINE_CAPTURED_DATA.frames;
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
      // Skenario simulasi: ketidakseimbangan arus NEMA tinggi
      frame.i_unbal_pct = 48.5;
      frame.i_l1 = 110.0;
      frame.i_l2 = 42.0;
      frame.i_l3 = 38.0;
      frame.engine_state_note = 'SIMULASI SIDANG: CURRENT_IMBALANCE NEMA Kritis (>40%)';
    } else if (state.activeSimulation === 'sensor_ai1') {
      // Skenario simulasi: loop sensor tekanan oli terputus
      frame.ai1_st = 'FAULT_LOW';
      frame.oil_press_bar = null; // sensor faulty — tidak ada pembacaan valid
      frame.engine_state_note = 'SIMULASI SIDANG: SENSOR_FAULT_AI1 — Loop 4-20mA Putus';
    } else if (state.activeSimulation === 'sensor_ai2') {
      // Skenario simulasi: loop sensor suhu pendingin engine terputus
      frame.ai2_st = 'FAULT_LOW';
      frame.engine_temp_c = null; // sensor faulty — tidak ada pembacaan valid
      frame.engine_state_note = 'SIMULASI SIDANG: SENSOR_FAULT_AI2 — Loop 4-20mA PT100 Putus';
    } else if (state.activeSimulation === 'sensor_ai3') {
      // Skenario simulasi: loop sensor level solar terputus
      frame.ai3_st = 'FAULT_LOW';
      frame.fuel_level_mm = null; // sensor faulty — tidak ada pembacaan valid
      frame.fuel_vol_l = null;
      frame.engine_state_note = 'SIMULASI SIDANG: SENSOR_FAULT_AI3 — Loop 4-20mA Hydrostatic Putus';
    }

    return frame;
  }

  // trigger skenario simulasi demo sidang (tanpa tombol di web: via Keyboard atau Console)
  window.gmsSimulate = function (scenarioKey) {
    const valid = ['normal', 'temp', 'oil', 'voltage', 'freq', 'imbalance', 'sensor_ai1', 'sensor_ai2', 'sensor_ai3'];
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
    console.info(`[GMS Mode] Pengguna mengalihkan mode operasi ke: ${mode === MODES.LIVE ? 'LIVE REST API' : 'OFFLINE'}`);
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
      if (DOM.dataSourceText) DOM.dataSourceText.textContent = 'OFFLINE (Local Data)';
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
    // Tekan 5 / I: Simulasi ketidakseimbangan arus NEMA
    // Tekan 6 / S: Simulasi sensor tekanan oli putus (NAMUR NE43)
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
      else if (k === '5' || k === 'i') window.gmsSimulate('imbalance');   // Simulasi ketidakseimbangan arus
      else if (k === '6' || k === 's') window.gmsSimulate('sensor_ai1'); // Simulasi anomali sensor AI1
      else if (k === '7') window.gmsSimulate('sensor_ai2');           // Simulasi anomali sensor AI2
      else if (k === '8') window.gmsSimulate('sensor_ai3');           // Simulasi anomali sensor AI3
      else if (k === 'c') window.gmsSimulate('normal');
    });

    // Cek juga URL parameter ?sim=temp / ?sim=oil untuk kemudahan demo
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const sim = urlParams.get('sim');
      if (sim) window.gmsSimulate(sim);
    } catch (_) { }
  }

  async function initApplication() {
    try {
      console.info('[GMS] Memulai Inisialisasi Dashboard Genset Monitoring System...');

      startRealtimeClock();
      setupEventListeners();
      await loadEnvironmentConfig();
      initChart();
      updateModeUI();

      const initialFrame = (state.currentMode === MODES.OFFLINE)
        ? (OFFLINE_CAPTURED_DATA.frames && OFFLINE_CAPTURED_DATA.frames[0] || {})
        : {};
      renderRealtimePanel(initialFrame);
      renderMaintenancePanel(initialFrame);

      // Inisialisasi alarm panel: kosongkan log lalu mulai polling
      renderAlarmSystem([], 'Menunggu Data Alarm Mastify...');

      executeTelemetryCycle();
      state.pollTimer = setInterval(executeTelemetryCycle, state.config.pollingIntervalMs);

      console.info('[GMS] Dashboard siap digunakan. Mode Awal: LIVE REST API.');
    } catch (err) {
      console.error('[GMS Init Error]', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApplication);
  } else {
    initApplication();
  }

})();

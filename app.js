/**
 * SISTEM MONITORING GENSET INDUSTRI
 * ESP32-S3 Telemetry Engine & Calibration Simulator
 * Vanilla JavaScript (No Frameworks)
 * Tema: Soft Blue Serenity
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. STATE MANAGEMENT & DEFAULT CONFIGURATION
  // =========================================================================

  const STORAGE_KEY_CAL = 'GENSET_CALIBRATION_CONFIG_V2';
  const STORAGE_KEY_POINTS = 'GENSET_CALIBRATION_POINTS_V2';

  // Konfigurasi Default Kalibrasi
  const DEFAULT_CONFIG = {
    shuntResistor: 150,     // Ohm (150 Ohm -> 0.6V to 3.0V)
    tempOffset: 0.00,       // °C
    tempSpan: 1.000,        // Multiplier
    levelOffset: 0.00,      // Liter/Unit
    levelSpan: 1.000,       // Multiplier
    a2Zero: 0.000           // Volt
  };

  // 5 Titik Referensi Kalibrasi Teoretis (4mA, 8mA, 12mA, 16mA, 20mA)
  const THEORETICAL_POINTS = [
    { current: 4.00,  pct: 0,   temp: 0.0,   level: 0.0 },
    { current: 8.00,  pct: 25,  temp: 50.0,  level: 125.0 },
    { current: 12.00, pct: 50,  temp: 100.0, level: 250.0 },
    { current: 16.00, pct: 75,  temp: 150.0, level: 375.0 },
    { current: 20.00, pct: 100, temp: 200.0, level: 500.0 }
  ];

  // Nilai Awal Titik Ukur Aktual
  const DEFAULT_MEASURED_POINTS = [
    { temp: 0.2,   level: 1.0 },
    { temp: 50.4,  level: 126.2 },
    { temp: 99.7,  level: 249.0 },
    { temp: 150.8, level: 376.5 },
    { temp: 199.5, level: 498.5 }
  ];

  // Muat Konfigurasi dari LocalStorage
  let calConfig = loadConfig();
  let measuredPoints = loadMeasuredPoints();

  // State Simulasi & Telemetri
  let isSimulating = true;
  let updateIntervalId = null;
  let uptimeSeconds = 14 * 86400 + 6 * 3600 + 32 * 60 + 45; // 14h 6j 32m 45d

  // Nilai Telemetri Aktif
  const telemetry = {
    waterLevel: 340.0,       // 0-500 Liter
    waterCurrent: 14.88,     // mA
    waterVoltage: 2.23,      // V
    temperature: 82.4,       // 0-200 °C
    tempCurrent: 10.59,      // mA
    tempVoltage: 1.59,       // V
    a2Voltage: 1.842,        // V
    a2Current: 12.28,        // mA
    a2Raw: 14736,            // ADC count
    a2Engineering: 51.7,     // %
    // Modbus EWIG
    voltageR: 220.4,
    voltageS: 219.1,
    voltageT: 221.8,
    voltageAvg: 220.4,
    currentR: 31.2,
    currentS: 29.4,
    currentT: 32.0,
    currentTotal: 92.6,
    // Unavailable telemetry
    powerKW: null,
    frequencyHz: null,
    powerFactor: null,
    energyKWh: null,
    // System status
    wifiRssi: -62,
    freeHeap: 248600
  };

  // Buffer Histori Grafik
  const CHART_MAX_POINTS = 35;
  const chartHistory = {
    timestamps: [],
    water: [],
    temp: [],
    voltage: [],
    current: []
  };
  let activeChartMetric = 'water'; // 'water' | 'temp' | 'voltage' | 'current'

  // Log Aktivitas Diagnostik
  let systemLogs = [
    { time: getFormattedTime(-120), module: 'ESP32', level: 'SUCCESS', msg: 'Boot CPU Core 0 & 1 sukses. Free Heap: 254 KB' },
    { time: getFormattedTime(-110), module: 'WIFI',  level: 'SUCCESS', msg: 'Terhubung ke SSID "PLANT_GENSET_WLAN_01" (IP: 192.168.1.120)' },
    { time: getFormattedTime(-100), module: 'I2C',   level: 'SUCCESS', msg: 'ADS1115 terdeteksi pada alamat 0x48. Mode: Continuous 128 SPS' },
    { time: getFormattedTime(-90),  module: 'MODBUS',level: 'SUCCESS', msg: 'EWIG Power Meter Slave 01 responsif pada UART2 9600-8-N-1' },
    { time: getFormattedTime(-60),  module: 'MQTT',  level: 'INFO',    msg: 'Koneksi Gateway MQTT lokal standby. Menunggu sinkronisasi broker eksternal' },
    { time: getFormattedTime(-30),  module: 'CAL',   level: 'INFO',    msg: 'Parameter kalibrasi aktif dimuat dari LocalStorage peramban' },
    { time: getFormattedTime(0),    module: 'TELEMETRY', level: 'SUCCESS', msg: 'Loop pembacaan telemetri aktif dengan interval 1000ms' }
  ];

  // =========================================================================
  // 2. DOM ELEMENT REFERENCES
  // =========================================================================

  const DOM = {
    // Navigasi & Clock
    navTabs: document.querySelectorAll('.nav-tab'),
    pageViews: document.querySelectorAll('.page-view'),
    systemClock: document.getElementById('systemClock'),
    demoModeBadge: document.getElementById('demoModeBadge'),
    btnToggleSim: document.getElementById('btnToggleSim'),
    simBtnText: document.getElementById('simBtnText'),
    lastTelemetryDash: document.getElementById('lastTelemetryDash'),

    // Page 1: Dashboard Sensors
    valWaterLevel: document.getElementById('valWaterLevel'),
    valWaterPercent: document.getElementById('valWaterPercent'),
    valWaterCurrent: document.getElementById('valWaterCurrent'),
    valWaterVoltage: document.getElementById('valWaterVoltage'),
    tankLiquidBar: document.getElementById('tankLiquidBar'),
    waterLevelBadge: document.getElementById('waterLevelBadge'),

    valTemperature: document.getElementById('valTemperature'),
    valTempCenter: document.getElementById('valTempCenter'),
    valTempCurrent: document.getElementById('valTempCurrent'),
    valTempVoltage: document.getElementById('valTempVoltage'),
    tempArcProgress: document.getElementById('tempArcProgress'),
    tempBadge: document.getElementById('tempBadge'),

    valA2Voltage: document.getElementById('valA2Voltage'),
    valA2Current: document.getElementById('valA2Current'),
    valA2Raw: document.getElementById('valA2Raw'),
    valA2Engineering: document.getElementById('valA2Engineering'),

    // Electrical EWIG
    valVR: document.getElementById('valVR'),
    valVS: document.getElementById('valVS'),
    valVT: document.getElementById('valVT'),
    valVAvg: document.getElementById('valVAvg'),
    barVR: document.getElementById('barVR'),
    barVS: document.getElementById('barVS'),
    barVT: document.getElementById('barVT'),

    valIR: document.getElementById('valIR'),
    valIS: document.getElementById('valIS'),
    valIT: document.getElementById('valIT'),
    valITotal: document.getElementById('valITotal'),
    barIR: document.getElementById('barIR'),
    barIS: document.getElementById('barIS'),
    barIT: document.getElementById('barIT'),

    // Chart
    realtimeChart: document.getElementById('realtimeChart'),
    chartTooltip: document.getElementById('chartTooltip'),
    btnChartToggles: document.querySelectorAll('.btn-chart-toggle'),
    activeChartLegend: document.getElementById('activeChartLegend'),
    chartBufferInfo: document.getElementById('chartBufferInfo'),
    btnExportCSV: document.getElementById('btnExportCSV'),

    // Page 2: Simulator & Kalibrasi
    simCurrentSlider: document.getElementById('simCurrentSlider'),
    simSliderValBadge: document.getElementById('simSliderValBadge'),
    simManualCurrent: document.getElementById('simManualCurrent'),
    presetButtons: document.querySelectorAll('.btn-preset'),
    simResVolt: document.getElementById('simResVolt'),
    simResRaw: document.getElementById('simResRaw'),
    simResTemp: document.getElementById('simResTemp'),
    simResLevel: document.getElementById('simResLevel'),
    simLoopStatusBox: document.getElementById('simLoopStatusBox'),
    simLoopStatusText: document.getElementById('simLoopStatusText'),

    // Tabel Kalibrasi
    tableCalPoints: document.getElementById('tableCalPoints'),
    pointTempInputs: document.querySelectorAll('.point-temp-in'),
    pointLevelInputs: document.querySelectorAll('.point-level-in'),
    btnAutoFillIdeal: document.getElementById('btnAutoFillIdeal'),

    // Form Kalibrasi & Storage
    cfgShuntResistor: document.getElementById('cfgShuntResistor'),
    cfgTempOffset: document.getElementById('cfgTempOffset'),
    cfgTempSpan: document.getElementById('cfgTempSpan'),
    cfgLevelOffset: document.getElementById('cfgLevelOffset'),
    cfgLevelSpan: document.getElementById('cfgLevelSpan'),
    cfgA2Zero: document.getElementById('cfgA2Zero'),
    btnSaveCalibration: document.getElementById('btnSaveCalibration'),
    btnResetCalibration: document.getElementById('btnResetCalibration'),
    btnExportCalJSON: document.getElementById('btnExportCalJSON'),
    calFileInput: document.getElementById('calFileInput'),
    localStorageStatusText: document.getElementById('localStorageStatusText'),

    // Page 3: Device & Logs
    deviceUptimeVal: document.getElementById('deviceUptimeVal'),
    valFreeHeap: document.getElementById('valFreeHeap'),
    valWifiRSSI: document.getElementById('valWifiRSSI'),
    jsonPayloadPreview: document.getElementById('jsonPayloadPreview'),
    jsonLastUpdated: document.getElementById('jsonLastUpdated'),
    btnCopyJSON: document.getElementById('btnCopyJSON'),
    copyJsonBtnText: document.getElementById('copyJsonBtnText'),
    logTableBody: document.getElementById('logTableBody'),
    btnClearLogs: document.getElementById('btnClearLogs'),
    btnDownloadLogs: document.getElementById('btnDownloadLogs'),
    btnTriggerDiag: document.getElementById('btnTriggerDiag')
  };

  // =========================================================================
  // 3. INITIALIZATION & ROUTING
  // =========================================================================

  function initApp() {
    setupNavigation();
    initClock();
    initFormValues();
    initSimulator();
    recalculateAllReferenceErrors();
    initChartBuffer();
    renderLogs();
    setupEventListeners();

    // Jalankan Siklus Telemetri Realtime
    startSimulationLoop();

    // Render Canvas Awal
    window.requestAnimationFrame(renderRealtimeChart);
  }

  // Navigasi 3 Halaman
  function setupNavigation() {
    DOM.navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetPage = tab.getAttribute('data-page');

        DOM.navTabs.forEach(t => t.classList.remove('active'));
        DOM.pageViews.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const activePageView = document.getElementById(`page-${targetPage}`);
        if (activePageView) {
          activePageView.classList.add('active');
        }

        // Render ulang canvas jika pindah ke dashboard
        if (targetPage === 'dashboard') {
          setTimeout(renderRealtimeChart, 50);
        }
      });
    });
  }

  // Jam Digital Header
  function initClock() {
    function updateClock() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      DOM.systemClock.textContent = `${h}:${m}:${s} WIB`;
    }
    updateClock();
    setInterval(updateClock, 1000);
  }

  // Format Helper Waktu untuk Log
  function getFormattedTime(offsetSeconds = 0) {
    const d = new Date(Date.now() + offsetSeconds * 1000);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  // Format Uptime
  function formatUptime(totalSec) {
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${days}h ${String(hours).padStart(2, '0')}j ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}d`;
  }

  // =========================================================================
  // 4. PERSISTENCE & LOCALSTORAGE (BROWSER-ONLY NOTICE)
  // =========================================================================

  function loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CAL);
      if (raw) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn('Gagal memuat konfigurasi kalibrasi:', e);
    }
    return { ...DEFAULT_CONFIG };
  }

  function saveConfig() {
    try {
      calConfig.shuntResistor = parseFloat(DOM.cfgShuntResistor.value) || 150;
      calConfig.tempOffset = parseFloat(DOM.cfgTempOffset.value) || 0;
      calConfig.tempSpan = parseFloat(DOM.cfgTempSpan.value) || 1;
      calConfig.levelOffset = parseFloat(DOM.cfgLevelOffset.value) || 0;
      calConfig.levelSpan = parseFloat(DOM.cfgLevelSpan.value) || 1;
      calConfig.a2Zero = parseFloat(DOM.cfgA2Zero.value) || 0;

      localStorage.setItem(STORAGE_KEY_CAL, JSON.stringify(calConfig));
      DOM.localStorageStatusText.textContent = `Status: Tersimpan (${new Date().toLocaleTimeString()} WIB)`;

      addLog('CAL', 'SUCCESS', 'Konfigurasi kalibrasi berhasil disimpan ke LocalStorage');
      showToast('Konfigurasi kalibrasi berhasil disimpan ke LocalStorage!');

      // Update simulasi dengan konfigurasi baru
      updateSimulatorCalculations(parseFloat(DOM.simCurrentSlider.value));
    } catch (e) {
      alert('Gagal menyimpan ke LocalStorage: ' + e.message);
    }
  }

  function resetConfig() {
    if (confirm('Kembalikan konfigurasi kalibrasi ke standar pabrik?')) {
      calConfig = { ...DEFAULT_CONFIG };
      localStorage.removeItem(STORAGE_KEY_CAL);
      localStorage.removeItem(STORAGE_KEY_POINTS);
      measuredPoints = JSON.parse(JSON.stringify(DEFAULT_MEASURED_POINTS));

      initFormValues();
      updatePointInputFields();
      recalculateAllReferenceErrors();
      updateSimulatorCalculations(parseFloat(DOM.simCurrentSlider.value));

      DOM.localStorageStatusText.textContent = 'Status: Standar Pabrik Dimuat';
      addLog('CAL', 'INFO', 'Konfigurasi kalibrasi direset ke standar pabrik');
      showToast('Konfigurasi berhasil direset ke standar pabrik!');
    }
  }

  function loadMeasuredPoints() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_POINTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === 5) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Gagal memuat titik kalibrasi:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_MEASURED_POINTS));
  }

  function saveMeasuredPoints() {
    try {
      localStorage.setItem(STORAGE_KEY_POINTS, JSON.stringify(measuredPoints));
    } catch (e) {
      console.warn('Gagal menyimpan titik kalibrasi:', e);
    }
  }

  function initFormValues() {
    DOM.cfgShuntResistor.value = String(calConfig.shuntResistor);
    DOM.cfgTempOffset.value = calConfig.tempOffset.toFixed(2);
    DOM.cfgTempSpan.value = calConfig.tempSpan.toFixed(3);
    DOM.cfgLevelOffset.value = calConfig.levelOffset.toFixed(1);
    DOM.cfgLevelSpan.value = calConfig.levelSpan.toFixed(3);
    DOM.cfgA2Zero.value = calConfig.a2Zero.toFixed(3);
  }

  function updatePointInputFields() {
    DOM.pointTempInputs.forEach((inEl, idx) => {
      inEl.value = (measuredPoints[idx] ? measuredPoints[idx].temp : 0).toFixed(1);
    });
    DOM.pointLevelInputs.forEach((inEl, idx) => {
      inEl.value = (measuredPoints[idx] ? measuredPoints[idx].level : 0).toFixed(1);
    });
  }

  // =========================================================================
  // 5. KALKULASI MATEMATIS 4-20mA & KALIBRASI
  // =========================================================================

  /**
   * Pemetaan 4-20mA ke Suhu (0-200 °C)
   * Formula: T = ((I - 4) / 16) * 200 * Span + Offset
   */
  function currentToTemperature(currentMA, span = calConfig.tempSpan, offset = calConfig.tempOffset) {
    if (currentMA < 0) currentMA = 0;
    const clampedCurrent = Math.max(4.0, Math.min(20.0, currentMA));
    const normalized = (clampedCurrent - 4.0) / 16.0;
    const result = normalized * 200.0 * span + offset;
    return Math.max(0.0, Math.min(200.0, result));
  }

  /**
   * Pemetaan 4-20mA ke Level Tangki (0-500 Liter/Unit)
   * Formula: Level = ((I - 4) / 16) * 500 * Span + Offset
   */
  function currentToLevel(currentMA, span = calConfig.levelSpan, offset = calConfig.levelOffset) {
    if (currentMA < 0) currentMA = 0;
    const clampedCurrent = Math.max(4.0, Math.min(20.0, currentMA));
    const normalized = (clampedCurrent - 4.0) / 16.0;
    const result = normalized * 500.0 * span + offset;
    return Math.max(0.0, Math.min(500.0, result));
  }

  /**
   * Kalkulasi Tegangan Shunt Resistor
   * V_shunt = I (Ampere) * R (Ohm) = (I_mA / 1000) * R_shunt
   */
  function currentToShuntVoltage(currentMA, rShunt = calConfig.shuntResistor) {
    return (currentMA / 1000.0) * rShunt;
  }

  /**
   * Estimasi Raw ADC ADS1115 (16-bit, Gain 1 = ±4.096V, LSB = 0.125mV = 0.000125V)
   */
  function voltageToRawADC(voltageV) {
    return Math.round(voltageV / 0.000125);
  }

  // =========================================================================
  // 6. SIMULATOR INTERAKTIF KALIBRASI (PAGE 2)
  // =========================================================================

  function initSimulator() {
    updatePointInputFields();
    updateSimulatorCalculations(parseFloat(DOM.simCurrentSlider.value));

    // Slider listener
    DOM.simCurrentSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      DOM.simManualCurrent.value = val.toFixed(2);
      updateSimulatorCalculations(val);
      updateActivePresetBtn(val);
    });

    // Manual number input listener
    DOM.simManualCurrent.addEventListener('input', (e) => {
      let val = parseFloat(e.target.value);
      if (isNaN(val)) val = 4.0;
      val = Math.max(0, Math.min(25, val));
      DOM.simCurrentSlider.value = Math.max(3.5, Math.min(21.0, val));
      updateSimulatorCalculations(val);
      updateActivePresetBtn(val);
    });

    // Preset buttons
    DOM.presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseFloat(btn.getAttribute('data-current'));
        DOM.simCurrentSlider.value = val;
        DOM.simManualCurrent.value = val.toFixed(2);
        updateSimulatorCalculations(val);
        updateActivePresetBtn(val);
      });
    });
  }

  function updateActivePresetBtn(currentVal) {
    DOM.presetButtons.forEach(btn => {
      const pVal = parseFloat(btn.getAttribute('data-current'));
      if (Math.abs(pVal - currentVal) < 0.05) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function updateSimulatorCalculations(currentMA) {
    DOM.simSliderValBadge.textContent = `${currentMA.toFixed(2)} mA`;

    const vShunt = currentToShuntVoltage(currentMA);
    const rawADC = voltageToRawADC(vShunt);
    const calcTemp = currentToTemperature(currentMA);
    const calcLevel = currentToLevel(currentMA);

    DOM.simResVolt.textContent = `${vShunt.toFixed(3)} V`;
    DOM.simResRaw.textContent = rawADC.toLocaleString();
    DOM.simResTemp.textContent = `${calcTemp.toFixed(1)} °C`;
    DOM.simResLevel.textContent = `${calcLevel.toFixed(1)} Unit`;

    // Evaluasi loop status
    const statusBox = DOM.simLoopStatusBox;
    const statusText = DOM.simLoopStatusText;
    const dot = statusBox.querySelector('.loop-status-dot');

    if (currentMA < 3.8) {
      statusBox.style.backgroundColor = 'var(--status-danger-bg)';
      dot.className = 'loop-status-dot error';
      statusText.textContent = `Peringatan: Loop Arus Terputus / Di Bawah 4mA (${currentMA.toFixed(2)} mA)`;
    } else if (currentMA > 20.5) {
      statusBox.style.backgroundColor = 'var(--status-warning-bg)';
      dot.className = 'loop-status-dot warn';
      statusText.textContent = `Peringatan: Loop Arus Saturasi / Melebihi 20mA (${currentMA.toFixed(2)} mA)`;
    } else {
      statusBox.style.backgroundColor = 'var(--status-normal-bg)';
      dot.className = 'loop-status-dot normal';
      statusText.textContent = `Status Sinyal: Normal Dalam Rentang Standar 4–20 mA (${currentMA.toFixed(2)} mA)`;
    }
  }

  // =========================================================================
  // 7. TABEL 5 TITIK REFERENSI & GALAT (MEASUREMENT ERROR)
  // =========================================================================

  function recalculateAllReferenceErrors() {
    THEORETICAL_POINTS.forEach((theo, idx) => {
      const meas = measuredPoints[idx] || { temp: theo.temp, level: theo.level };

      // Galat Suhu (% Full Scale = 200 °C)
      const diffTemp = meas.temp - theo.temp;
      const errTempPct = (diffTemp / 200.0) * 100.0;

      // Galat Level (% Full Scale = 500)
      const diffLevel = meas.level - theo.level;
      const errLevelPct = (diffLevel / 500.0) * 100.0;

      // Update DOM cell
      const errTempCell = document.getElementById(`errTemp${idx}`);
      const errLevelCell = document.getElementById(`errLevel${idx}`);
      const statusBadge = document.getElementById(`accStatus${idx}`);

      if (errTempCell) {
        errTempCell.textContent = `${diffTemp >= 0 ? '+' : ''}${errTempPct.toFixed(2)}%`;
        errTempCell.className = `font-mono error-cell ${Math.abs(errTempPct) <= 1.0 ? 'good' : 'bad'}`;
      }

      if (errLevelCell) {
        errLevelCell.textContent = `${diffLevel >= 0 ? '+' : ''}${errLevelPct.toFixed(2)}%`;
        errLevelCell.className = `font-mono error-cell ${Math.abs(errLevelPct) <= 1.0 ? 'good' : 'bad'}`;
      }

      if (statusBadge) {
        const isPass = Math.abs(errTempPct) <= 1.0 && Math.abs(errLevelPct) <= 1.0;
        if (isPass) {
          statusBadge.textContent = 'Akurat (<1%)';
          statusBadge.className = 'badge-acc acc-pass';
        } else {
          statusBadge.textContent = 'Perlu Tuning (>1%)';
          statusBadge.className = 'badge-acc acc-fail';
        }
      }
    });

    saveMeasuredPoints();
  }

  // =========================================================================
  // 8. SIMULASI TELEMETRI REALTIME (ENGINE)
  // =========================================================================

  function startSimulationLoop() {
    if (updateIntervalId) clearInterval(updateIntervalId);
    updateIntervalId = setInterval(tickTelemetrySimulation, 1000);
  }

  function tickTelemetrySimulation() {
    uptimeSeconds++;
    DOM.deviceUptimeVal.textContent = formatUptime(uptimeSeconds);

    if (!isSimulating) {
      DOM.lastTelemetryDash.textContent = 'Diperbarui: Jeda Simulasi';
      return;
    }

    // Variasi acak halus sensor analog
    // Water level: ~340 Liter (±2.5)
    telemetry.waterLevel = Math.max(10, Math.min(490, telemetry.waterLevel + (Math.random() - 0.49) * 2.2));
    telemetry.waterCurrent = 4.0 + (telemetry.waterLevel / 500.0) * 16.0;
    telemetry.waterVoltage = currentToShuntVoltage(telemetry.waterCurrent);

    // Suhu mesin: ~82.4 °C (±0.4)
    telemetry.temperature = Math.max(20, Math.min(130, telemetry.temperature + (Math.random() - 0.5) * 0.35));
    telemetry.tempCurrent = 4.0 + (telemetry.temperature / 200.0) * 16.0;
    telemetry.tempVoltage = currentToShuntVoltage(telemetry.tempCurrent);

    // ADS1115 A2: Input ~1.84V
    telemetry.a2Voltage = Math.max(0.6, Math.min(3.0, telemetry.a2Voltage + (Math.random() - 0.5) * 0.015));
    telemetry.a2Current = (telemetry.a2Voltage / calConfig.shuntResistor) * 1000.0;
    telemetry.a2Raw = voltageToRawADC(telemetry.a2Voltage);
    telemetry.a2Engineering = ((telemetry.a2Current - 4.0) / 16.0) * 100.0;

    // Modbus EWIG: Tegangan 3 Phase
    telemetry.voltageR = 220.0 + (Math.random() - 0.5) * 2.5;
    telemetry.voltageS = 219.0 + (Math.random() - 0.5) * 2.2;
    telemetry.voltageT = 221.5 + (Math.random() - 0.5) * 2.4;
    telemetry.voltageAvg = (telemetry.voltageR + telemetry.voltageS + telemetry.voltageT) / 3.0;

    // Arus 3 Phase
    telemetry.currentR = 31.0 + (Math.random() - 0.5) * 1.5;
    telemetry.currentS = 29.2 + (Math.random() - 0.5) * 1.4;
    telemetry.currentT = 32.1 + (Math.random() - 0.5) * 1.6;
    telemetry.currentTotal = telemetry.currentR + telemetry.currentS + telemetry.currentT;

    // Free heap memory fluctuation
    telemetry.freeHeap = Math.round(248600 + (Math.random() - 0.5) * 1200);

    // Update UI Cards
    updateDashboardUI();

    // Catat ke Buffer Grafik
    recordChartHistory();

    // Render Canvas
    renderRealtimeChart();

    // Update JSON Preview
    updateJSONPayloadPreview();

    // Timestamp
    DOM.lastTelemetryDash.textContent = `Diperbarui: ${getFormattedTime(0)}`;
  }

  function updateDashboardUI() {
    // 1. Water Level
    DOM.valWaterLevel.textContent = Math.round(telemetry.waterLevel);
    const waterPct = (telemetry.waterLevel / 500.0) * 100.0;
    DOM.valWaterPercent.textContent = `${waterPct.toFixed(1)}%`;
    DOM.valWaterCurrent.textContent = `${telemetry.waterCurrent.toFixed(2)} mA`;
    DOM.valWaterVoltage.textContent = `${telemetry.waterVoltage.toFixed(2)} V`;
    DOM.tankLiquidBar.style.height = `${Math.min(100, Math.max(0, waterPct))}%`;

    // Badge Water Status
    if (telemetry.waterLevel < 100) {
      DOM.waterLevelBadge.textContent = 'Kritis Rendah';
      DOM.waterLevelBadge.className = 'card-status-badge status-danger';
    } else if (telemetry.waterLevel < 150) {
      DOM.waterLevelBadge.textContent = 'Peringatan Rendah';
      DOM.waterLevelBadge.className = 'card-status-badge status-warning';
    } else {
      DOM.waterLevelBadge.textContent = 'Normal';
      DOM.waterLevelBadge.className = 'card-status-badge status-normal';
    }

    // 2. Temperature
    DOM.valTemperature.textContent = telemetry.temperature.toFixed(1);
    DOM.valTempCenter.textContent = telemetry.temperature.toFixed(1);
    DOM.valTempCurrent.textContent = `${telemetry.tempCurrent.toFixed(2)} mA`;
    DOM.valTempVoltage.textContent = `${telemetry.tempVoltage.toFixed(2)} V`;

    // Arc Circle: radius 65, keliling = 2 * PI * 65 = 408.4
    // 0°C -> dashoffset 408; 200°C -> dashoffset 0
    const tempCirc = 408;
    const tempRatio = Math.min(1, Math.max(0, telemetry.temperature / 200.0));
    const offset = tempCirc - (tempCirc * tempRatio);
    DOM.tempArcProgress.style.strokeDashoffset = offset;

    if (telemetry.temperature > 105.0) {
      DOM.tempBadge.textContent = 'Bahaya Panas';
      DOM.tempBadge.className = 'card-status-badge status-danger';
      DOM.tempArcProgress.style.stroke = 'var(--status-danger)';
    } else if (telemetry.temperature > 95.0) {
      DOM.tempBadge.textContent = 'Suhu Tinggi';
      DOM.tempBadge.className = 'card-status-badge status-warning';
      DOM.tempArcProgress.style.stroke = 'var(--status-warning)';
    } else {
      DOM.tempBadge.textContent = 'Optimal';
      DOM.tempBadge.className = 'card-status-badge status-normal';
      DOM.tempArcProgress.style.stroke = 'var(--primary-blue)';
    }

    // 3. ADS1115 A2
    DOM.valA2Voltage.textContent = telemetry.a2Voltage.toFixed(3);
    DOM.valA2Current.textContent = `${telemetry.a2Current.toFixed(2)} mA`;
    DOM.valA2Raw.textContent = `${telemetry.a2Raw.toLocaleString()} / 32,768`;
    DOM.valA2Engineering.textContent = `${telemetry.a2Engineering.toFixed(1)} %`;

    // 4. EWIG Electrical
    DOM.valVR.textContent = `${telemetry.voltageR.toFixed(1)} V`;
    DOM.valVS.textContent = `${telemetry.voltageS.toFixed(1)} V`;
    DOM.valVT.textContent = `${telemetry.voltageT.toFixed(1)} V`;
    DOM.valVAvg.textContent = `${telemetry.voltageAvg.toFixed(1)} V`;

    // Scale 0-250V
    DOM.barVR.style.width = `${Math.min(100, (telemetry.voltageR / 250) * 100)}%`;
    DOM.barVS.style.width = `${Math.min(100, (telemetry.voltageS / 250) * 100)}%`;
    DOM.barVT.style.width = `${Math.min(100, (telemetry.voltageT / 250) * 100)}%`;

    DOM.valIR.textContent = `${telemetry.currentR.toFixed(1)} A`;
    DOM.valIS.textContent = `${telemetry.currentS.toFixed(1)} A`;
    DOM.valIT.textContent = `${telemetry.currentT.toFixed(1)} A`;
    DOM.valITotal.textContent = `${telemetry.currentTotal.toFixed(1)} A`;

    // Scale 0-60A
    DOM.barIR.style.width = `${Math.min(100, (telemetry.currentR / 60) * 100)}%`;
    DOM.barIS.style.width = `${Math.min(100, (telemetry.currentS / 60) * 100)}%`;
    DOM.barIT.style.width = `${Math.min(100, (telemetry.currentT / 60) * 100)}%`;

    // System info
    DOM.valFreeHeap.textContent = `${(telemetry.freeHeap / 1024).toFixed(1)} KB (Optimal)`;
  }

  // =========================================================================
  // 9. TIME-SERIES CHART RENDERER (CANVAS 2D)
  // =========================================================================

  function initChartBuffer() {
    const now = Date.now();
    for (let i = CHART_MAX_POINTS; i >= 0; i--) {
      const t = new Date(now - i * 1000);
      const timeStr = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`;
      chartHistory.timestamps.push(timeStr);
      chartHistory.water.push(335 + Math.sin(i * 0.3) * 12 + Math.random() * 4);
      chartHistory.temp.push(81 + Math.cos(i * 0.2) * 2.5 + Math.random() * 0.8);
      chartHistory.voltage.push(220 + (Math.random() - 0.5) * 2.2);
      chartHistory.current.push(31 + (Math.random() - 0.5) * 1.5);
    }
  }

  function recordChartHistory() {
    const timeStr = getFormattedTime(0);
    chartHistory.timestamps.push(timeStr);
    chartHistory.water.push(telemetry.waterLevel);
    chartHistory.temp.push(telemetry.temperature);
    chartHistory.voltage.push(telemetry.voltageR);
    chartHistory.current.push(telemetry.currentR);

    if (chartHistory.timestamps.length > CHART_MAX_POINTS) {
      chartHistory.timestamps.shift();
      chartHistory.water.shift();
      chartHistory.temp.shift();
      chartHistory.voltage.shift();
      chartHistory.current.shift();
    }

    DOM.chartBufferInfo.textContent = `Buffer: ${chartHistory.timestamps.length} Titik Data Aktif`;
  }

  function renderRealtimeChart() {
    const canvas = DOM.realtimeChart;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Support devicePixelRatio
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Bersihkan Canvas
    ctx.clearRect(0, 0, width, height);

    const padLeft = 55;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 35;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    if (plotW <= 0 || plotH <= 0) {
      ctx.restore();
      return;
    }

    // Pilih dataset dan skala
    let data = [];
    let minVal = 0;
    let maxVal = 500;
    let unit = 'Liter';

    switch (activeChartMetric) {
      case 'water':
        data = chartHistory.water;
        minVal = 0;
        maxVal = 500;
        unit = 'Liter';
        DOM.activeChartLegend.textContent = 'Level Air Tangki (0–500 Liter)';
        break;
      case 'temp':
        data = chartHistory.temp;
        minVal = 0;
        maxVal = 140;
        unit = '°C';
        DOM.activeChartLegend.textContent = 'Suhu Mesin & Pelumas (0–140 °C)';
        break;
      case 'voltage':
        data = chartHistory.voltage;
        minVal = 180;
        maxVal = 250;
        unit = 'V';
        DOM.activeChartLegend.textContent = 'Tegangan Fasa R (180–250 V)';
        break;
      case 'current':
        data = chartHistory.current;
        minVal = 0;
        maxVal = 50;
        unit = 'A';
        DOM.activeChartLegend.textContent = 'Arus Beban Fasa R (0–50 A)';
        break;
    }

    // Gambar Garis Kisi-Kisi (Grid Lines)
    const gridRows = 4;
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = '#64748B';
    ctx.textAlign = 'right';

    for (let r = 0; r <= gridRows; r++) {
      const y = padTop + (plotH / gridRows) * r;
      const v = maxVal - ((maxVal - minVal) / gridRows) * r;

      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();

      ctx.fillText(`${Math.round(v)} ${unit}`, padLeft - 8, y + 3.5);
    }

    // Gambar Waktu Sumbu X
    ctx.textAlign = 'center';
    const xSteps = 5;
    for (let c = 0; c <= xSteps; c++) {
      const x = padLeft + (plotW / xSteps) * c;
      const idx = Math.floor((chartHistory.timestamps.length - 1) * (c / xSteps));
      const tLabel = chartHistory.timestamps[idx] || '';

      ctx.fillText(tLabel, x, height - 12);
    }

    if (data.length < 2) {
      ctx.restore();
      return;
    }

    // Plot Points Coordinates
    const points = [];
    const stepX = plotW / (data.length - 1);

    for (let i = 0; i < data.length; i++) {
      const x = padLeft + i * stepX;
      const ratio = (data[i] - minVal) / (maxVal - minVal);
      const clampedRatio = Math.max(0, Math.min(1, ratio));
      const y = padTop + plotH - (clampedRatio * plotH);
      points.push({ x, y, val: data[i] });
    }

    // Buat Area Gradient Fill di Bawah Kurva (Industrial Cobalt)
    const gradient = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.28)');
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0.01)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, padTop + plotH);
    ctx.lineTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      // Kurva Bezier Halus
      const xc = (points[i].x + points[i - 1].x) / 2;
      const yc = (points[i].y + points[i - 1].y) / 2;
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.lineTo(points[points.length - 1].x, padTop + plotH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Gambar Garis Utama
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const xc = (points[i].x + points[i - 1].x) / 2;
      const yc = (points[i].y + points[i - 1].y) / 2;
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Gambar Titik Terakhir (Pulse Dot)
    const lastP = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(lastP.x, lastP.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#1D4ED8';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  // =========================================================================
  // 10. DEVICE & CONNECTIVITY FEATURES (PAGE 3)
  // =========================================================================

  function updateJSONPayloadPreview() {
    const payload = {
      device_id: "ESP32S3_GENSET_01",
      uptime_seconds: uptimeSeconds,
      timestamp: new Date().toISOString(),
      sensors: {
        water_level: {
          value: parseFloat(telemetry.waterLevel.toFixed(1)),
          unit: "liter",
          current_ma: parseFloat(telemetry.waterCurrent.toFixed(2)),
          adc_pin: "A1"
        },
        temperature: {
          value: parseFloat(telemetry.temperature.toFixed(1)),
          unit: "celsius",
          current_ma: parseFloat(telemetry.tempCurrent.toFixed(2)),
          adc_pin: "A0"
        },
        ads1115_a2: {
          voltage_v: parseFloat(telemetry.a2Voltage.toFixed(3)),
          current_ma: parseFloat(telemetry.a2Current.toFixed(2)),
          raw_adc: telemetry.a2Raw
        }
      },
      electrical: {
        voltage_r: parseFloat(telemetry.voltageR.toFixed(1)),
        voltage_s: parseFloat(telemetry.voltageS.toFixed(1)),
        voltage_t: parseFloat(telemetry.voltageT.toFixed(1)),
        current_r: parseFloat(telemetry.currentR.toFixed(1)),
        current_s: parseFloat(telemetry.currentS.toFixed(1)),
        current_t: parseFloat(telemetry.currentT.toFixed(1)),
        power_kw: null,
        frequency_hz: null,
        power_factor: null,
        energy_kwh: null
      },
      system_status: {
        wifi_rssi_dbm: telemetry.wifiRssi,
        free_heap_bytes: telemetry.freeHeap,
        i2c_status: "OK",
        modbus_status: "OK"
      }
    };

    DOM.jsonPayloadPreview.textContent = JSON.stringify(payload, null, 2);
    DOM.jsonLastUpdated.textContent = `Terakhir Diterima: ${getFormattedTime(0)}`;
  }

  function addLog(module, level, msg) {
    const entry = {
      time: getFormattedTime(0),
      module,
      level,
      msg
    };
    systemLogs.unshift(entry);
    if (systemLogs.length > 50) systemLogs.pop();
    renderLogs();
  }

  function renderLogs() {
    DOM.logTableBody.innerHTML = '';
    systemLogs.forEach(log => {
      const tr = document.createElement('tr');
      const lvlClass = `log-lvl-${log.level.toLowerCase()}`;
      tr.innerHTML = `
        <td class="font-mono text-muted">${log.time}</td>
        <td><strong>${log.module}</strong></td>
        <td><span class="${lvlClass}">${log.level}</span></td>
        <td>${log.msg}</td>
      `;
      DOM.logTableBody.appendChild(tr);
    });
  }

  // =========================================================================
  // 11. EVENT LISTENERS & USER ACTIONS
  // =========================================================================

  function setupEventListeners() {
    // 1. Toggle Simulasi (Pause / Resume)
    DOM.btnToggleSim.addEventListener('click', () => {
      isSimulating = !isSimulating;
      if (isSimulating) {
        DOM.simBtnText.textContent = 'Jeda Simulasi';
        DOM.demoModeBadge.querySelector('.status-text').textContent = 'Simulasi Aktif (Demo)';
        DOM.demoModeBadge.querySelector('.status-dot').className = 'status-dot pulse';
        addLog('SYSTEM', 'INFO', 'Simulasi aliran telemetri dilanjutkan');
      } else {
        DOM.simBtnText.textContent = 'Lanjutkan Simulasi';
        DOM.demoModeBadge.querySelector('.status-text').textContent = 'Simulasi Dijeda';
        DOM.demoModeBadge.querySelector('.status-dot').className = 'status-dot';
        addLog('SYSTEM', 'WARN', 'Simulasi telemetri dihentikan sementara oleh pengguna');
      }
    });

    // 2. Chart Metric Toggles
    DOM.btnChartToggles.forEach(btn => {
      btn.addEventListener('click', () => {
        DOM.btnChartToggles.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeChartMetric = btn.getAttribute('data-metric');
        renderRealtimeChart();
      });
    });

    // 3. Ekspor Data Grafik CSV
    DOM.btnExportCSV.addEventListener('click', () => {
      let csvContent = 'data:text/csv;charset=utf-8,Waktu,Level_Air_Liter,Suhu_Celsius,Tegangan_R_Volt,Arus_R_Ampere\n';
      for (let i = 0; i < chartHistory.timestamps.length; i++) {
        csvContent += `${chartHistory.timestamps[i]},${chartHistory.water[i].toFixed(1)},${chartHistory.temp[i].toFixed(1)},${chartHistory.voltage[i].toFixed(1)},${chartHistory.current[i].toFixed(1)}\n`;
      }
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `telemetri_genset_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Data telemetri berhasil diekspor ke format CSV!');
    });

    // 4. Input Tabel Kalibrasi
    DOM.pointTempInputs.forEach(inEl => {
      inEl.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        const val = parseFloat(e.target.value) || 0;
        if (!measuredPoints[idx]) measuredPoints[idx] = {};
        measuredPoints[idx].temp = val;
        recalculateAllReferenceErrors();
      });
    });

    DOM.pointLevelInputs.forEach(inEl => {
      inEl.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        const val = parseFloat(e.target.value) || 0;
        if (!measuredPoints[idx]) measuredPoints[idx] = {};
        measuredPoints[idx].level = val;
        recalculateAllReferenceErrors();
      });
    });

    // 5. Isi Nilai Ideal pada Tabel Referensi
    DOM.btnAutoFillIdeal.addEventListener('click', () => {
      THEORETICAL_POINTS.forEach((theo, idx) => {
        measuredPoints[idx] = { temp: theo.temp, level: theo.level };
      });
      updatePointInputFields();
      recalculateAllReferenceErrors();
      showToast('Nilai ideal 100% teoretis berhasil diterapkan ke tabel!');
    });

    // 6. Tombol Simpan & Reset Kalibrasi
    DOM.btnSaveCalibration.addEventListener('click', saveConfig);
    DOM.btnResetCalibration.addEventListener('click', resetConfig);

    // 7. Ekspor Kalibrasi JSON
    DOM.btnExportCalJSON.addEventListener('click', () => {
      const exportData = {
        app: 'GENSET_MONITORING_SYSTEM',
        version: '2.0.0',
        export_date: new Date().toISOString(),
        calibration_config: calConfig,
        measured_reference_points: measuredPoints
      };
      const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute('href', jsonStr);
      dlAnchor.setAttribute('download', `genset_calibration_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      document.body.removeChild(dlAnchor);
      showToast('Konfigurasi kalibrasi berhasil diekspor ke JSON!');
    });

    // 8. Impor Kalibrasi JSON
    DOM.calFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed && parsed.calibration_config) {
            calConfig = { ...DEFAULT_CONFIG, ...parsed.calibration_config };
            if (Array.isArray(parsed.measured_reference_points)) {
              measuredPoints = parsed.measured_reference_points;
            }
            saveConfig();
            saveMeasuredPoints();
            initFormValues();
            updatePointInputFields();
            recalculateAllReferenceErrors();
            updateSimulatorCalculations(parseFloat(DOM.simCurrentSlider.value));
            showToast('Konfigurasi berhasil diimpor dari berkas JSON!');
          } else {
            alert('Format berkas JSON kalibrasi tidak valid.');
          }
        } catch (err) {
          alert('Gagal membaca berkas JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    // 9. Salin JSON Payload ke Clipboard
    DOM.btnCopyJSON.addEventListener('click', () => {
      const text = DOM.jsonPayloadPreview.textContent;
      navigator.clipboard.writeText(text).then(() => {
        DOM.copyJsonBtnText.textContent = 'Tersalin!';
        setTimeout(() => {
          DOM.copyJsonBtnText.textContent = 'Salin JSON';
        }, 2000);
        showToast('JSON payload berhasil disalin ke clipboard!');
      }).catch(() => {
        alert('Gagal menyalin. Silakan pilih dan salin manual.');
      });
    });

    // 10. Manajemen Log
    DOM.btnClearLogs.addEventListener('click', () => {
      if (confirm('Kosongkan semua entri riwayat aktivitas log?')) {
        systemLogs = [];
        renderLogs();
        showToast('Riwayat log berhasil dikosongkan.');
      }
    });

    DOM.btnDownloadLogs.addEventListener('click', () => {
      let text = '=== LOG DIAGNOSTIK GENSET MONITORING ===\n';
      text += `Tanggal Ekspor: ${new Date().toLocaleString()} WIB\n\n`;
      systemLogs.forEach(l => {
        text += `[${l.time}] [${l.module}] [${l.level}] ${l.msg}\n`;
      });
      const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
      const link = document.createElement('a');
      link.setAttribute('href', dataUri);
      link.setAttribute('download', `genset_diagnostics_log_${new Date().toISOString().slice(0, 10)}.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Berkas log diagnostik berhasil diunduh!');
    });

    // 11. Uji Diagnostik Sistem (Self-Test Sequence)
    DOM.btnTriggerDiag.addEventListener('click', () => {
      addLog('DIAG', 'INFO', 'Memulai uji diagnostik komprehensif...');
      setTimeout(() => addLog('DIAG', 'SUCCESS', 'I2C Bus ACK: ADS1115 (0x48) terhubung dan sehat'), 400);
      setTimeout(() => addLog('DIAG', 'SUCCESS', 'UART2 Modbus RTU: Respon EWIG 9600 baud valid (CRC OK)'), 800);
      setTimeout(() => addLog('DIAG', 'SUCCESS', 'Wi-Fi RSSI: -62 dBm stabil, ping gateway 192.168.1.1: 4ms'), 1200);
      setTimeout(() => addLog('DIAG', 'INFO', 'Memori SRAM: 248 KB bebas, fragmentasi heap 4.2%'), 1600);
      setTimeout(() => {
        addLog('DIAG', 'SUCCESS', 'Seluruh uji diagnostik selesai dengan status LULUS.');
        showToast('Uji diagnostik sistem berhasil diselesaikan!');
      }, 2000);
    });

    // Handle Window Resize for Canvas Redraw
    window.addEventListener('resize', () => {
      renderRealtimeChart();
    });
  }

  // =========================================================================
  // 12. TOAST NOTIFICATION COMPONENT
  // =========================================================================

  function showToast(message) {
    let toast = document.getElementById('appToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'appToast';
      toast.style.position = 'fixed';
      toast.style.bottom = '24px';
      toast.style.right = '24px';
      toast.style.backgroundColor = '#294E73';
      toast.style.color = '#FFFFFF';
      toast.style.padding = '10px 18px';
      toast.style.borderRadius = '8px';
      toast.style.boxShadow = '0 6px 20px rgba(41, 78, 115, 0.25)';
      toast.style.fontSize = '0.825rem';
      toast.style.fontWeight = '600';
      toast.style.zIndex = '9999';
      toast.style.transition = 'opacity 0.25s, transform 0.25s';
      toast.style.transform = 'translateY(10px)';
      toast.style.opacity = '0';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.transform = 'translateY(10px)';
      toast.style.opacity = '0';
    }, 2800);
  }

  // Jalankan Saat DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();

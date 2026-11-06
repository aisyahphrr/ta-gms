// =============================================================================
// GENSET MONITORING SYSTEM (GMS) — DATA LAB & SIMULASI OFFLINE
// Ref: Spesifikasi Teknis TA GMS IPB x PT MASCH (45 Standar Kunci Proyek)
// Digunakan saat USE_OFFLINE_DATA = true atau fallback otomatis saat API terputus
// =============================================================================

const DATA_LAB = {
  // Snapshot telemetri berputar siklis mencakup 45 parameter standar
  frames: [
    {
      // --- A. Engine & Mekanikal ---
      engine_state: 'RUNNING',
      engine_state_note: 'Mesin Beroperasi Nominal • Menyuplai Beban',
      eng_speed_rpm: 1500,
      oil_press_bar: 3.85,
      coolant_temp_c: 83.4,
      engine_temp_c: 83.4,
      temp_status: 'NORMAL',
      press_status: 'NORMAL',
      fuel_level_mm: 725.0,
      fuel_vol_l: 367.5,
      fuel_status: 'NORMAL',
      batt_volt_v: 26.8,
      battery_v: 26.8,
      run_hours: 1284.5,
      maint_due_h: 15.5,
      maintenance_status: 'SIAP OPERASI',
      fuel_est_l: 344.2,

      // --- B. Kelistrikan 3-Fasa AC ---
      v_l1_n: 227.5,
      v_l2_n: 228.0,
      v_l3_n: 230.2,
      v_l1: 227.5,
      v_l2: 228.0,
      v_l3: 230.2,
      v_l1_l2: 394.5,
      v_l2_l3: 395.2,
      v_l3_l1: 397.0,
      v_unbal_pct: 0.5,
      voltage_balance: 'SEIMBANG (NORMAL)',
      i_l1: 77.7,
      i_l2: 37.4,
      i_l3: 39.9,
      i_unbal_pct: 18.5,
      i_unbal_avg_15m: 17.8,
      freq_hz: 50.0,
      p_total_kw: 33.4,
      p_kw: 33.4,
      s_total_kva: 35.3,
      s_kva: 35.3,
      load_pct: 69.5,
      load_status: 'NORMAL',
      pf_avg: 0.94,
      pf: 0.94,

      // --- C. Hardware Diagnostic & Fault Flags ---
      fault_ai1: false,
      fault_ai2: false,
      fault_modbus: false,
      maint_req: false,
      ai1_st: 'OK',
      ai2_st: 'OK',
      ai3_st: 'OK',
      sensor_fault: false,

      // --- Metadata & Timestamp ---
      alarm_level: 'NORMAL',
      alarm_msg: 'Sistem Genset Beroperasi Normal',
      ts: Date.now()
    },
    {
      // --- Frame 2: Beban sedikit berubah ---
      engine_state: 'RUNNING',
      engine_state_note: 'Mesin Beroperasi Nominal • Menyuplai Beban',
      eng_speed_rpm: 1498,
      oil_press_bar: 3.82,
      coolant_temp_c: 83.2,
      engine_temp_c: 83.2,
      temp_status: 'NORMAL',
      press_status: 'NORMAL',
      fuel_level_mm: 724.0,
      fuel_vol_l: 367.8,
      fuel_status: 'NORMAL',
      batt_volt_v: 26.8,
      battery_v: 26.8,
      run_hours: 1284.5,
      maint_due_h: 15.5,
      maintenance_status: 'SIAP OPERASI',
      fuel_est_l: 344.6,

      v_l1_n: 227.2,
      v_l2_n: 227.9,
      v_l3_n: 230.1,
      v_l1: 227.2,
      v_l2: 227.9,
      v_l3: 230.1,
      v_l1_l2: 394.0,
      v_l2_l3: 395.0,
      v_l3_l1: 396.8,
      v_unbal_pct: 0.6,
      voltage_balance: 'SEIMBANG (NORMAL)',
      i_l1: 76.9,
      i_l2: 37.1,
      i_l3: 39.5,
      i_unbal_pct: 18.2,
      i_unbal_avg_15m: 17.9,
      freq_hz: 50.0,
      p_total_kw: 33.0,
      p_kw: 33.0,
      s_total_kva: 34.9,
      s_kva: 34.9,
      load_pct: 68.2,
      load_status: 'NORMAL',
      pf_avg: 0.94,
      pf: 0.94,

      fault_ai1: false,
      fault_ai2: false,
      fault_modbus: false,
      maint_req: false,
      ai1_st: 'OK',
      ai2_st: 'OK',
      ai3_st: 'OK',
      sensor_fault: false,

      alarm_level: 'NORMAL',
      alarm_msg: 'Sistem Genset Beroperasi Normal',
      ts: Date.now()
    },
    {
      // --- Frame 3 ---
      engine_state: 'RUNNING',
      engine_state_note: 'Mesin Beroperasi Nominal • Menyuplai Beban',
      eng_speed_rpm: 1502,
      oil_press_bar: 3.80,
      coolant_temp_c: 83.6,
      engine_temp_c: 83.6,
      temp_status: 'NORMAL',
      press_status: 'NORMAL',
      fuel_level_mm: 721.0,
      fuel_vol_l: 368.0,
      fuel_status: 'NORMAL',
      batt_volt_v: 26.7,
      battery_v: 26.7,
      run_hours: 1284.5,
      maint_due_h: 15.5,
      maintenance_status: 'SIAP OPERASI',
      fuel_est_l: 345.0,

      v_l1_n: 226.8,
      v_l2_n: 227.5,
      v_l3_n: 229.8,
      v_l1: 226.8,
      v_l2: 227.5,
      v_l3: 229.8,
      v_l1_l2: 393.5,
      v_l2_l3: 394.8,
      v_l3_l1: 396.2,
      v_unbal_pct: 0.7,
      voltage_balance: 'SEIMBANG (NORMAL)',
      i_l1: 78.2,
      i_l2: 37.8,
      i_l3: 40.1,
      i_unbal_pct: 18.8,
      i_unbal_avg_15m: 18.0,
      freq_hz: 50.0,
      p_total_kw: 34.1,
      p_kw: 34.1,
      s_total_kva: 36.0,
      s_kva: 36.0,
      load_pct: 71.0,
      load_status: 'NORMAL',
      pf_avg: 0.95,
      pf: 0.95,

      fault_ai1: false,
      fault_ai2: false,
      fault_modbus: false,
      maint_req: false,
      ai1_st: 'OK',
      ai2_st: 'OK',
      ai3_st: 'OK',
      sensor_fault: false,

      alarm_level: 'NORMAL',
      alarm_msg: 'Sistem Genset Beroperasi Normal',
      ts: Date.now()
    },
    {
      // --- Frame 4 ---
      engine_state: 'RUNNING',
      engine_state_note: 'Mesin Beroperasi Nominal • Menyuplai Beban',
      eng_speed_rpm: 1505,
      oil_press_bar: 3.78,
      coolant_temp_c: 83.8,
      engine_temp_c: 83.8,
      temp_status: 'NORMAL',
      press_status: 'NORMAL',
      fuel_level_mm: 719.0,
      fuel_vol_l: 368.3,
      fuel_status: 'NORMAL',
      batt_volt_v: 26.8,
      battery_v: 26.8,
      run_hours: 1284.5,
      maint_due_h: 15.5,
      maintenance_status: 'SIAP OPERASI',
      fuel_est_l: 345.4,

      v_l1_n: 227.0,
      v_l2_n: 227.6,
      v_l3_n: 229.9,
      v_l1: 227.0,
      v_l2: 227.6,
      v_l3: 229.9,
      v_l1_l2: 393.8,
      v_l2_l3: 395.0,
      v_l3_l1: 396.5,
      v_unbal_pct: 0.6,
      voltage_balance: 'SEIMBANG (NORMAL)',
      i_l1: 79.0,
      i_l2: 38.2,
      i_l3: 40.4,
      i_unbal_pct: 18.6,
      i_unbal_avg_15m: 18.1,
      freq_hz: 50.0,
      p_total_kw: 34.5,
      p_kw: 34.5,
      s_total_kva: 36.4,
      s_kva: 36.4,
      load_pct: 72.1,
      load_status: 'NORMAL',
      pf_avg: 0.95,
      pf: 0.95,

      fault_ai1: false,
      fault_ai2: false,
      fault_modbus: false,
      maint_req: false,
      ai1_st: 'OK',
      ai2_st: 'OK',
      ai3_st: 'OK',
      sensor_fault: false,

      alarm_level: 'NORMAL',
      alarm_msg: 'Sistem Genset Beroperasi Normal',
      ts: Date.now()
    }
  ],

  // Daftar alarm contoh (HANYA MENGGUNAKAN SEVERITY RESMI: CRITICAL atau MAJOR)
  activeAlarms: [
    {
      id: 'alarm-mock-01',
      timestamp: '09:05:12',
      level: 'MAJOR',
      ruleType: 'ENGINE_TEMP',
      message: 'Suhu pendingin engine mendekati ambang batas peringatan (85.0°C).',
      ruleStatus: 'ACTIVE_UNACK'
    },
    {
      id: 'alarm-mock-02',
      timestamp: '08:42:19',
      level: 'MAJOR',
      ruleType: 'SENSOR_FAULT_AI1',
      message: 'Loop arus AI1 Pressure Sensor terdeteksi fluktuasi di luar batas valid (< 3.8mA).',
      ruleStatus: 'ACTIVE_UNACK'
    }
  ],

  // Catatan kronologis riwayat alarm (Severity: CRITICAL atau MAJOR)
  alarmHistory: [
    {
      id: 'alarm-mock-hist-01',
      timestamp: '09:12:45',
      level: 'MAJOR',
      ruleType: 'VOLTAGE_FAULT',
      message: 'Deviasi tegangan 3-fasa sempat menyentuh 2.2%. Status telah kembali seimbang.',
      ruleStatus: 'CLEARED'
    },
    {
      id: 'alarm-mock-hist-02',
      timestamp: '09:05:12',
      level: 'MAJOR',
      ruleType: 'ENGINE_TEMP',
      message: 'Suhu pendingin engine mendekati ambang batas peringatan (85.0°C).',
      ruleStatus: 'ACTIVE_UNACK'
    },
    {
      id: 'alarm-mock-hist-03',
      timestamp: '08:42:19',
      level: 'MAJOR',
      ruleType: 'SENSOR_FAULT_AI1',
      message: 'Loop arus AI1 Pressure Sensor terdeteksi fluktuasi di luar batas valid (< 3.8mA).',
      ruleStatus: 'ACTIVE_UNACK'
    },
    {
      id: 'alarm-mock-hist-04',
      timestamp: '07:15:02',
      level: 'CRITICAL',
      ruleType: 'OIL_PRESSURE',
      message: 'Peringatan tekanan pelumas rendah saat start-up (di bawah 1.8 bar).',
      ruleStatus: 'ACTIVE_ACK'
    },
    {
      id: 'alarm-mock-hist-05',
      timestamp: '06:30:15',
      level: 'MAJOR',
      ruleType: 'FREQ_FAULT',
      message: 'Frekuensi alternator sempat menyentuh 48.9 Hz sebelum kembali ke nominal 50.0 Hz.',
      ruleStatus: 'CLEARED'
    }
  ]
};

// Ekspos ke global scope (browser window)
if (typeof window !== 'undefined') {
  window.DATA_LAB = DATA_LAB;
  window.OFFLINE_CAPTURED_DATA = DATA_LAB;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DATA_LAB;
}

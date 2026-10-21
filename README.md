# Dashboard Demo Genset Monitoring System (GMS) - Sidang Tugas Akhir

Dashboard antarmuka web *Single Page Layout* (Read-Only) untuk pemantauan telemetri Genset Industri 3-Fasa berbasis mikrokontroler ESP32-S3 dan platform Mastify Cloud IoT.

---

## 1. Kepatuhan Spesifikasi Teknis (R3 Scope & Detail Scope v1.1)

1. **Sifat & Batasan (Read-Only Demo)**:
   - Dirancang khusus untuk keperluan demo dan sidang Tugas Akhir tanpa fitur login/manajemen akun.
   - Tanpa tombol kontrol perangkat (pencegahan risiko kontrol berbahaya).
   - Tanpa ekspor laporan kompleks.
2. **Arsitektur Maksimal 4 Panel Utama (Single Page)**:
   - **Panel 01: Status & Nilai Real-Time**: Status `engine_state` (RUNNING/STOPPED), suhu pendingin (`engine_temp_c`), tekanan oli (`oil_press_bar`), persentase beban (`load_pct`), serta konsistensi tegangan 3-fasa (`v_11`, `v_12`, `v_13`).
   - **Panel 02: Grafik Histori / Timeseries**: Line chart interaktif berbasis *Chart.js* untuk visualisasi tren multi-parameter terhadap waktu.
   - **Panel 03: Tabel Log Alarm Otomatis**: Menampilkan log peringatan hasil evaluasi *Rule Chain Mastify* dengan 4 tingkatan wajib (`NORMAL`, `WARNING`, `CRITICAL`, `SENSOR_FAULT`).
   - **Panel 04: Hour Meter & Status Maintenance**: Indikator akumulasi jam kerja mesin (`run_hours`), status servis (`maint_due_h`), dan estimasi konsumsi bahan bakar model SFC (`fuel_est_l`).
3. **Prinsip Zero Logic in Frontend**:
   - Kode JavaScript (`app.js`) **tidak melakukan** kalkulasi threshold, increment hour meter, penentuan status alarm, maupun penghitungan konsumsi bahan bakar model SFC.
   - Frontend bertindak murni sebagai *presentation layer* yang merender data matang dari Firmware C ESP32-S3 dan Rule Chain Mastify.
4. **Cadangan Data Lokal (Offline Backup untuk Sidang)**:
   - Dilengkapi *captured dataset* lokal dari pengujian riil genset 3-fasa.
   - Dilengkapi deteksi otomatis (*auto-fallback*) dan tombol manual beralih ke mode offline jika koneksi Wi-Fi ruang sidang mengalami gangguan.

---

## 2. Struktur File Proyek

```text
ta-gms/
├── index.html        # Layout Single-Page 4 panel utama semantik
├── style.css         # Desain visual SCADA industrial cyber-slate responsif
├── app.js            # Controller frontend (polling REST, Chart.js, zero-logic, offline fallback)
├── .env.example      # Template konfigurasi variabel lingkungan REST API Mastify
├── .env              # Konfigurasi aktif lokal (diabaikan oleh git)
├── .gitignore        # Mencegah file kredensial .env ter-push ke repository
└── README.md         # Dokumentasi panduan teknis operasional
```

---

## 3. Konfigurasi Lingkungan (`.env`)

Duplikasi file `.env.example` menjadi `.env` dan sesuaikan parameter berikut:

```env
# Host endpoint REST API Mastify
MASTIFY_HOST=https://iot.mastify.com

# Device UUID target pada sistem Mastify
MASTIFY_DEVICE_ID=d89e2480-7389-11ef-9366-0775d79db145

# JWT Bearer Token otentikasi Mastify
MASTIFY_JWT_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_actual_token

# Interval polling data telemetri (milidetik)
POLLING_INTERVAL_MS=3000

# Auto fallback ke cadangan lokal jika API/koneksi terputus
AUTO_FALLBACK_OFFLINE=true
```

---

## 4. Cara Menjalankan Proyek

Jalankan web server lokal menggunakan modul HTTP bawaan Python di direktori proyek:

```bash
python -m http.server 8000
```

Buka peramban pada alamat:
```
http://localhost:8000
```

---

## 5. Pemetaan Key Telemetri Mastify REST API

Endpoint penarikan telemetri:
`GET /api/plugins/telemetry/DEVICE/{deviceId}/values/timeseries?keys=...`
Header otentikasi: `X-Authorization: Bearer {JWT_TOKEN}`

| Key Telemetri / Alias | Deskripsi Parameter | Satuan / Format |
|---|---|---|
| `engine_state` / `status` | Status operasional engine | `RUNNING` / `STOPPED` |
| `engine_temp_c` / `temperature` | Suhu engine coolant (PT100) | `°C` |
| `oil_press_bar` / `pressure` | Tekanan oli pelumas | `bar` |
| `load_pct` | Persentase beban genset | `%` (0 - 100) |
| `v_11`, `v_12`, `v_13` | Tegangan 3-Fasa (EWIG RS485) | `Volt` |
| `run_hours` / `hourMeter` | Total akumulasi jam kerja | `Jam` |
| `maint_due_h` / `maintenanceStatus` | Jam menuju jadwal servis | `Jam` / Status string |
| `fuel_est_l` / `fuelEstimate` | Estimasi konsumsi BBM (SFC model) | `Liter` |
| `alarm_level`, `alarm_msg` | Tingkat keparahan & pesan alarm | Rule Chain output |

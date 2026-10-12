# Sistem Monitoring Genset Industri (TA-GMS)

Dashboard Monitoring Genset Industri Realtime berbasis web modern untuk pemantauan telemetri sensor analog ADS1115, pengukuran kelistrikan EWIG Modbus RS485, dan modul kalibrasi sinyal arus 4–20mA dengan integrasi mikrokontroler ESP32-S3.

## Fitur Utama

1. **Dashboard Monitoring Realtime**
   - Pemantauan Level Air Tangki (Water Level 0–500 Liter) dengan visualisasi tangki cairan dinamis.
   - Pemantauan Suhu Mesin & Pelumas (Temperature 0–200 °C) dengan radial gauge presisi.
   - Kanal Analog ADS1115 A2 (Voltase, Arus mA, Raw ADC 16-bit, Engineering %).
   - Pengukuran Kelistrikan EWIG Modbus RS485 (Tegangan 3-Fasa V_R, V_S, V_T dan Arus Beban I_R, I_S, I_T).
   - Penanganan status unavailable untuk register daya, frekuensi, power factor, dan energi.
   - Grafik tren waktu nyata (*Time-Series Chart*) berbasis HTML5 Canvas dengan ekspor data ke format CSV.

2. **Modul Kalibrasi Sensor (4–20mA)**
   - Simulator interaktif kalibrasi arus loop 4–20mA.
   - Tabel verifikasi 5 titik referensi industri (0%, 25%, 50%, 75%, 100% Span) beserta perhitungan persentase galat (*Measurement Error*).
   - Konfigurasi nilai resistor shunt (150Ω / 250Ω), zero offset, dan span multiplier.
   - Manajemen konfigurasi kalibrasi via browser LocalStorage (Simpan, Reset Pabrik, Ekspor JSON, Impor JSON).

3. **Device & Connectivity**
   - Topologi visual alur telemetri hardware-to-cloud.
   - Spesifikasi perangkat keras ESP32-S3, status Wi-Fi, dan bus industri (I²C & RS485).
   - Parameter gateway MQTT (Broker, Client ID, Topics QoS 1).
   - Live incoming telemetry JSON payload preview dengan tombol salin.
   - Log diagnostik dan riwayat aktivitas sistem dengan fitur uji mandiri dan unduh log.

## Teknologi
- **Frontend**: HTML5, Vanilla CSS3, Vanilla JavaScript (Tanpa dependensi / framework eksternal).
- **Tema Visual**: Industrial Cobalt & Deep Slate (High-contrast enterprise SCADA theme).
- **Kompatibilitas**: ESP32-S3 Telemetry Engine, ADS1115 ADC, EWIG Digital Power Meter.

## Menjalankan Proyek
Jalankan web server lokal menggunakan Python:
```bash
python -m http.server 8000
```
Buka peramban di: `http://localhost:8000`

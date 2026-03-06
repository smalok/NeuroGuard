/*
  NeuroGuard — EEG ESP8266 Firmware (RAW MODE)
  3-Electrode EEG (Active, Reference, Ground)
  via Instrumentation Amp → ESP8266 A0
  NO FILTERS — sends raw ADC value for software processing.

  Wiring:
    Amp OUTPUT → ESP8266 A0 (must be 0-1V!)
    Amp VCC    → ESP8266 3V3
    Amp GND    → ESP8266 GND

  Output: {"eeg": <raw_adc_0_1023>}  @ 115200 baud, ~100Hz
*/

#define EEG_PIN       A0
#define STATUS_LED    2       // D4 (active LOW)
#define BAUD_RATE     115200
#define SAMPLE_DELAY  10      // ms → ~100 Hz

unsigned long lastSample = 0;
int saturationCount = 0;

void setup() {
    Serial.begin(BAUD_RATE);
    pinMode(EEG_PIN, INPUT);
    pinMode(STATUS_LED, OUTPUT);
    digitalWrite(STATUS_LED, HIGH);
    delay(500);
    Serial.println("{\"status\":\"EEG_ESP8266_READY\",\"version\":\"2.2\",\"mode\":\"raw\"}");
    for (int i = 0; i < 3; i++) {
        digitalWrite(STATUS_LED, LOW); delay(200);
        digitalWrite(STATUS_LED, HIGH); delay(200);
    }
}

void loop() {
    unsigned long now = millis();
    if (now - lastSample < SAMPLE_DELAY) return;
    lastSample = now;

    int rawEEG = analogRead(EEG_PIN);

    // Simple electrode-off detection: stuck at rails
    if (rawEEG <= 5 || rawEEG >= 1018) saturationCount++;
    else saturationCount = 0;
    bool electrodesOff = (saturationCount > 50);

    // LED feedback
    digitalWrite(STATUS_LED, electrodesOff ? ((now / 150) % 2 == 0 ? LOW : HIGH) : HIGH);

    // Send RAW unfiltered value regardless of saturation, to show actual noise/flatline
    Serial.print("{\"eeg\":");
    Serial.print(rawEEG);
    if (electrodesOff) {
        Serial.print(",\"electrodes_off\":true");
    }
    Serial.println("}");

    yield();
}

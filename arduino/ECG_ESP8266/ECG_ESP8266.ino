/*
  NeuroGuard — ECG ESP8266 Firmware (RAW MODE)
  3-Lead ECG (RA, LA, LL) via AD8232 → ESP8266 A0
  NO FILTERS — sends raw ADC value for software processing.

  Wiring:
    AD8232 OUTPUT → ESP8266 A0
    AD8232 3.3V   → ESP8266 3V3
    AD8232 GND    → ESP8266 GND
    AD8232 LO+    → ESP8266 D5 (GPIO14)
    AD8232 LO-    → ESP8266 D6 (GPIO12)

  Output: {"ecg": <raw_adc_0_1023>}  @ 115200 baud, ~100Hz
*/

#define ECG_PIN       A0
#define LEADS_OFF_P   14      // D5
#define LEADS_OFF_N   12      // D6
#define STATUS_LED    2       // D4 (active LOW)
#define BAUD_RATE     115200
#define SAMPLE_DELAY  10      // ms → ~100 Hz

unsigned long lastSample = 0;

void setup() {
    Serial.begin(BAUD_RATE);
    pinMode(ECG_PIN, INPUT);
    pinMode(LEADS_OFF_P, INPUT);
    pinMode(LEADS_OFF_N, INPUT);
    pinMode(STATUS_LED, OUTPUT);
    digitalWrite(STATUS_LED, HIGH);
    delay(500);
    Serial.println("{\"status\":\"ECG_ESP8266_READY\",\"version\":\"2.2\",\"mode\":\"raw\"}");
    for (int i = 0; i < 3; i++) {
        digitalWrite(STATUS_LED, LOW); delay(100);
        digitalWrite(STATUS_LED, HIGH); delay(100);
    }
}

void loop() {
    unsigned long now = millis();
    if (now - lastSample < SAMPLE_DELAY) return;
    lastSample = now;

    bool leadsOff = (digitalRead(LEADS_OFF_P) == HIGH || digitalRead(LEADS_OFF_N) == HIGH);
    int rawECG = analogRead(ECG_PIN);

    // LED: fast blink if leads off, slow blink if connected
    digitalWrite(STATUS_LED, leadsOff ? ((now / 200) % 2 == 0 ? LOW : HIGH) : HIGH);

    // Send RAW unfiltered value regardless of leads off, so the graph shows noise instead of a frozen flatline
    Serial.print("{\"ecg\":");
    Serial.print(rawECG);
    if (leadsOff) {
        Serial.print(",\"leads_off\":true");
    }
    Serial.println("}");

    yield();
}

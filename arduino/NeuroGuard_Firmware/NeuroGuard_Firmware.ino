/*
  NeuroGuard System - Firmware V1.0
  ---------------------------------
  Reads A4 (ECG) and A5 (EMG) analog inputs and streams
  JSON data over Serial at 115200 baud.

  Format: {"ecg": <val>, "emg": <val>}
  Sample Rate: ~100Hz (10ms delay)
*/

void setup() {
  Serial.begin(115200);
  pinMode(A4, INPUT); // ECG Sensor Output
  pinMode(A5, INPUT); // EMG Sensor Output
}

void loop() {
  int ecgValue = analogRead(A4);
  int emgValue = analogRead(A5);

  // Create JSON string
  Serial.print("{\"ecg\":");
  Serial.print(ecgValue);
  Serial.print(",\"emg\":");
  Serial.print(emgValue);
  Serial.println("}");

  delay(10); // Maintain roughly 100Hz sampling rate
}

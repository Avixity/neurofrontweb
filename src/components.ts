export type ComponentKey = 'ad8232' | 'esp32' | 'gsr' | 'temperature' | 'battery' | 'charger';
export const components: Record<ComponentKey, { name: string; image?: string; sensor?: string; description: string }> = {
  ad8232: { name: 'AD8232 ECG front end', image: 'ad8232.webp', sensor: 'electrical', description: 'Picks up small electrical impulses through the electrode contacts, then amplifies and filters the signal for the ESP32 to read. Good contact helps produce a clearer trace.' },
  esp32: { name: 'ESP32 development board', image: 'esp32.webp', description: 'Reads the primary electrical signal and sends samples to the companion dashboard over Bluetooth. This prototype uses a standard development board.' },
  gsr: { name: 'GSR / EDA sensor', image: 'gsr.webp', sensor: 'eda', description: 'Measures changes in skin conductance associated with sweat-gland activity. Contact and environment also affect it. Its independent data channel is still being integrated into the dashboard.' },
  temperature: { name: 'NTC thermistor', image: 'thermistor.webp', sensor: 'thermal', description: 'Changes resistance with temperature, providing slower thermal context. Its exact attachment is not visible in the reference photographs; the model placement is illustrative.' },
  battery: { name: 'Rechargeable Li-ion battery', description: 'Stores energy for the wired prototype. The foil pouch sits inside the separate controller enclosure. This close-up shows the reconstructed model, not a component photograph.' },
  charger: { name: 'TP4056 charging module', description: 'Provides the charging circuit for the rechargeable cell inside the controller. This close-up shows the reconstructed model, not a component photograph.' }
};

export const equipmentTypes = [
  'Transformer', 'Switchgear', 'Circuit Breaker', 'Motor', 'Generator', 'Panel', 'Cable', 'Lighting', 'Outlet',
  'Junction Box', 'Smoke Detector', 'Heat Detector', 'Manual Call Point', 'Temperature Sensor', 'Pressure Transmitter',
  'Temperature Transmitter', 'Level Switch', 'Beacons',
];

export const zoneOptions = ['Zone 0', 'Zone 1', 'Zone 2', 'Non Hazardous Area'];

export function equipmentOptionKey(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function equipmentOptions(defaults: string[], saved: (string | null | undefined)[], current: string) {
  const options = new Map<string, {label: string; value: string}>();
  for (const value of [...defaults, current, ...saved]) {
    if (!value?.trim()) continue;
    const key = equipmentOptionKey(value);
    if (!options.has(key)) options.set(key, {label: value, value});
  }
  return [...options.values()];
}

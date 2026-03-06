import { useState, useEffect, useCallback } from 'react';

const ESP_BASE = 'http://172.24.3.254';
const POLL_INTERVAL = 5000;

export const useEspHumidity = (enabled: boolean) => {
  const [humidity, setHumidity] = useState<number | null>(null);
  const [pumpActive, setPumpActive] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHumidity = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch(`${ESP_BASE}/umidade`, { mode: 'cors', signal: AbortSignal.timeout(3000) });
      const data = await res.json();
      const value = data.umidade ?? data.humidity;
      if (typeof value === 'number') {
        setHumidity(Math.round(value));
        setError(null);
      }
      if (typeof data.bomba === 'boolean') {
        setPumpActive(data.bomba);
      }
    } catch {
      setError('Sensor offline');
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    fetchHumidity();
    const id = setInterval(fetchHumidity, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [enabled, fetchHumidity]);

  const sendCommand = useCallback(async (command: 'irrigar_on' | 'irrigar_off') => {
    try {
      const res = await fetch(`${ESP_BASE}/comando`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
        mode: 'cors',
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      if (typeof data.bomba === 'boolean') {
        setPumpActive(data.bomba);
      }
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }, []);

  return { espHumidity: humidity, espPumpActive: pumpActive, espError: error, sendCommand };
};

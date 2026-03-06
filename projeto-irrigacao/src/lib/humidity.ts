// Humidity decay configuration
const DECAY_RATE_PER_HOUR = 2; // Loses 2% humidity per hour
const MIN_HUMIDITY = 0;

/**
 * Calculate current humidity based on last watered time
 * Humidity decreases linearly over time since last watering
 * 
 * @param baseHumidity - The humidity stored in the database
 * @param lastWateredAt - Timestamp of last watering
 * @param hasSensor - If plant has a sensor, use direct humidity value
 */
export const calculateCurrentHumidity = (
  baseHumidity: number,
  lastWateredAt: string,
  hasSensor: boolean = false
): number => {
  // If plant has a sensor, return the database value directly
  // (it's updated in real-time by the ESP32)
  if (hasSensor) {
    return Math.max(MIN_HUMIDITY, Math.min(100, baseHumidity));
  }

  // Otherwise, calculate decay based on time
  const lastWatered = new Date(lastWateredAt);
  const now = new Date();
  const hoursElapsed = (now.getTime() - lastWatered.getTime()) / (1000 * 60 * 60);
  
  const decayedHumidity = baseHumidity - (hoursElapsed * DECAY_RATE_PER_HOUR);
  
  return Math.max(MIN_HUMIDITY, Math.round(decayedHumidity));
};

/**
 * Get humidity status for display purposes
 */
export const getHumidityStatus = (humidity: number) => {
  if (humidity >= 70) return 'healthy';
  if (humidity >= 40) return 'okay';
  if (humidity >= 20) return 'thirsty';
  return 'critical';
};

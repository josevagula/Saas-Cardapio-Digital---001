import { VisualConfig } from '../types';

/**
 * Determines whether the store is open based on visualConfig operating hours and manual toggle.
 */
export function checkIsStoreOpen(config?: VisualConfig): boolean {
  if (!config) return true;

  // If manually set to false (forced closed), respect that
  if (config.isStoreOpenManual === false) {
    return false;
  }

  // If opening or closing times are not set, return true if manual is not false
  if (!config.openingTime || !config.closingTime) {
    return true;
  }

  try {
    const now = new Date();

    // Check day of week if operatingDaysList is defined
    if (config.operatingDaysList && config.operatingDaysList.length > 0) {
      const daysMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
      const todayCode = daysMap[now.getDay()];
      if (!config.operatingDaysList.includes(todayCode)) {
        return false;
      }
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [openH, openM] = config.openingTime.split(':').map(Number);
    const [closeH, closeM] = config.closingTime.split(':').map(Number);

    const openMinutes = (openH || 0) * 60 + (openM || 0);
    const closeMinutes = (closeH || 0) * 60 + (closeM || 0);

    if (closeMinutes > openMinutes) {
      // Standard daytime/evening hours e.g., 18:00 to 23:30
      return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
    } else if (closeMinutes < openMinutes) {
      // Overnight hours e.g., 18:00 to 02:00
      return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
    } else {
      // 24 hours open if same time
      return true;
    }
  } catch {
    return true;
  }
}

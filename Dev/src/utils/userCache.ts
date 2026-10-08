export const userCache = {
  get: <T>(userId: string | number, key: string, defaultValue: T): T => {
    if (!userId) return defaultValue;
    const stored = localStorage.getItem(`cache_${userId}_${key}`);
    if (stored !== null) {
      try {
        return JSON.parse(stored) as T;
      } catch (e) {
        return defaultValue;
      }
    }
    return defaultValue;
  },
  
  set: <T>(userId: string | number, key: string, value: T): void => {
    if (!userId) return;
    localStorage.setItem(`cache_${userId}_${key}`, JSON.stringify(value));
  },
  
  remove: (userId: string | number, key: string): void => {
    if (!userId) return;
    localStorage.removeItem(`cache_${userId}_${key}`);
  }
};

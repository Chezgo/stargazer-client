const canLog = import.meta.env.DEV;

export const logger = {
  debug: (...args) => { if (canLog) console.debug(...args); },
  info: (...args) => { if (canLog) console.info(...args); },
  warn: (...args) => { if (canLog) console.warn(...args); },
  error: (...args) => { if (canLog) console.error(...args); }
};

const formatTimestamp = () => new Date().toISOString();

export const logger = {
  info: (msg, meta = {}) => {
    console.log(`[${formatTimestamp()}] [INFO]: ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  warn: (msg, meta = {}) => {
    console.warn(`[${formatTimestamp()}] [WARN]: ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
  },
  error: (msg, err = null) => {
    console.error(`[${formatTimestamp()}] [ERROR]: ${msg}`, err ? (err.stack || err) : '');
  },
  debug: (msg, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${formatTimestamp()}] [DEBUG]: ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
    }
  }
};

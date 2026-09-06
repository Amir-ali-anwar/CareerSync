// Minimal structured (JSON-lines) logger. No external dependency - the app's log
// volume doesn't justify pulling in pino/winston yet; this can be swapped later
// without touching call sites (they only ever call logger.info/warn/error).
const serialize = (level, message, meta = {}) =>
  JSON.stringify({ level, time: new Date().toISOString(), message, ...meta });

const logger = {
  info: (message, meta) => console.log(serialize("info", message, meta)),
  warn: (message, meta) => console.warn(serialize("warn", message, meta)),
  error: (message, meta) => console.error(serialize("error", message, meta)),
};

export default logger;

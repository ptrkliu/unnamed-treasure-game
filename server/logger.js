const PREFIX = '[incan-gold]';

function log(level, ...args) {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} ${PREFIX} [${level}]`, ...args);
}

module.exports = {
  info(...args) {
    log('INFO', ...args);
  },
  debug(...args) {
    log('DEBUG', ...args);
  },
  error(...args) {
    log('ERROR', ...args);
  },
};

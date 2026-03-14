(function () {
  const PREFIX = '[incan-gold] [client]';

  window.incanLog = {
    info(...args) {
      console.log(PREFIX, '[INFO]', ...args);
    },
    debug(...args) {
      console.log(PREFIX, '[DEBUG]', ...args);
    },
  };
})();

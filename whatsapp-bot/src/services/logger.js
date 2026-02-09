// Simple logger for WhatsApp bot
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];

function formatMessage(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.length ? ' ' + args.map(a => 
    typeof a === 'object' ? JSON.stringify(a) : a
  ).join(' ') : '';
  
  return `${timestamp} [${level.toUpperCase()}] ${message}${formattedArgs}`;
}

export const logger = {
  error(message, ...args) {
    if (currentLevel >= LOG_LEVELS.error) {
      console.error(formatMessage('error', message, ...args));
    }
  },

  warn(message, ...args) {
    if (currentLevel >= LOG_LEVELS.warn) {
      console.warn(formatMessage('warn', message, ...args));
    }
  },

  info(message, ...args) {
    if (currentLevel >= LOG_LEVELS.info) {
      console.log(formatMessage('info', message, ...args));
    }
  },

  debug(message, ...args) {
    if (currentLevel >= LOG_LEVELS.debug) {
      console.log(formatMessage('debug', message, ...args));
    }
  }
};

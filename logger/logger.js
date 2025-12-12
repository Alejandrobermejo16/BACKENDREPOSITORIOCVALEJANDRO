const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: 'debug', // niveles: error, warn, info, verbose, debug, silly
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
  ),
  transports: [
    new transports.Console(), // muestra en consola
    new transports.File({ filename: 'app.log' }) // también guarda en archivo
  ],
});

module.exports = logger;

/**
 * Simple logging utility
 */

enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

class Logger {
  private logLevel = process.env.LOG_LEVEL || 'INFO';

  private log(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;

    console.log(logMessage, data ? JSON.stringify(data, null, 2) : '');
  }

  error(message: string, data?: any) {
    this.log(LogLevel.ERROR, message, data);
  }

  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data);
  }

  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data);
  }

  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data);
  }
}

export const logger = new Logger();

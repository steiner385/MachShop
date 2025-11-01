/**
 * Oracle EBS Surrogate - Logger Utility
 * Provides consistent logging across the application
 */

export class Logger {
  private static instance: Logger;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  info(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO: ${message}`, data || '');
  }

  error(message: string, error?: any): void {
    const timestamp = new Date().toISOString();
    if (error instanceof Error) {
      console.error(`[${timestamp}] ERROR: ${message}`, {
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined
      });
    } else {
      console.error(`[${timestamp}] ERROR: ${message}`, error || '');
    }
  }

  warn(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] WARN: ${message}`, data || '');
  }

  debug(message: string, data?: any): void {
    if (this.isDevelopment) {
      const timestamp = new Date().toISOString();
      console.debug(`[${timestamp}] DEBUG: ${message}`, data || '');
    }
  }
}

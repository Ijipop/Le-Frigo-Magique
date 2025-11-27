/**
 * Système de logging structuré pour l'application
 * 
 * En développement : logs dans la console
 * En production : logs structurés (peut être étendu avec Sentry, LogRocket, etc.)
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (context && Object.keys(context).length > 0) {
      return `${prefix} ${message} ${JSON.stringify(context)}`;
    }
    return `${prefix} ${message}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    const formattedMessage = this.formatMessage(level, message, context);
    
    if (this.isDevelopment) {
      // En développement, utiliser console avec couleurs
      const emoji = {
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
        debug: '🔍',
      }[level];
      
      const consoleMethod = {
        info: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
      }[level];
      
      consoleMethod(`${emoji} ${formattedMessage}`);
      
      if (error) {
        console.error('Stack trace:', error.stack);
      }
    } else {
      // En production, log structuré (peut être envoyé à un service externe)
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        context: context || {},
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : undefined,
      };
      
      // Pour l'instant, on log en JSON (peut être envoyé à Sentry, LogRocket, etc.)
      const logMethod = {
        info: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.log,
      }[level];
      
      logMethod(JSON.stringify(logEntry));
      
      // TODO: Envoyer à un service de monitoring (Sentry, LogRocket, etc.)
      // if (level === 'error' && this.isProduction) {
      //   Sentry.captureException(error || new Error(message), { extra: context });
      // }
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    this.log('error', message, context, error);
  }

  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      this.log('debug', message, context);
    }
  }
}

// Export d'une instance singleton
export const logger = new Logger();

// Export du type pour utilisation dans d'autres fichiers
export type { LogContext };


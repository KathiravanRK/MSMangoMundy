type LogLevel = 'info' | 'warn' | 'error';

class Logger {
    private static instance: Logger;
    private isDevelopment = process.env.NODE_ENV === 'development';

    private constructor() { }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private formatMessage(level: LogLevel, message: string, data?: any): string {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    }

    public info(message: string, data?: any) {
        if (this.isDevelopment) {
            console.log(this.formatMessage('info', message), data || '');
        }
    }

    public warn(message: string, data?: any) {
        console.warn(this.formatMessage('warn', message), data || '');
        // In production, you could send to Sentry/Datadog here
    }

    public error(message: string, error?: any) {
        console.error(this.formatMessage('error', message), error || '');
        // In production, send to error monitoring service
    }
}

export const logger = Logger.getInstance();

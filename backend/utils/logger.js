const fs = require('fs');
const path = require('path');

// Simple logger utility with file and console output
class Logger {
    constructor() {
        this.logsDir = path.join(__dirname, '../logs');
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };

        // Create logs directory if it doesn't exist
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }
    }

    // Get current date-time string
    getTimestamp() {
        return new Date().toISOString();
    }

    // Format log message
    formatMessage(level, message, data = {}) {
        const timestamp = this.getTimestamp();
        const dataStr = Object.keys(data).length > 0 ? JSON.stringify(data) : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message} ${dataStr}`.trim();
    }

    // Write to log file
    writeToFile(level, message) {
        try {
            const date = new Date();
            const filename = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.log`;
            const filepath = path.join(this.logsDir, filename);

            fs.appendFileSync(filepath, message + '\n');
        } catch (error) {
            console.error('Error writing to log file:', error);
        }
    }

    // Log message at given level
    log(level, message, data = {}) {
        if (this.levels[level] > this.levels[this.logLevel]) {
            return;
        }

        const formatted = this.formatMessage(level, message, data);

        // Console output
        const colors = {
            error: '\x1b[31m', // Red
            warn: '\x1b[33m', // Yellow
            info: '\x1b[32m', // Green
            debug: '\x1b[36m' // Cyan
        };
        const reset = '\x1b[0m';

        if (process.env.NODE_ENV !== 'production') {
            console.log(`${colors[level]}${formatted}${reset}`);
        }

        // File output
        this.writeToFile(level, formatted);
    }

    // Error level
    error(message, data = {}) {
        this.log('error', message, data);
    }

    // Warn level
    warn(message, data = {}) {
        this.log('warn', message, data);
    }

    // Info level
    info(message, data = {}) {
        this.log('info', message, data);
    }

    // Debug level
    debug(message, data = {}) {
        this.log('debug', message, data);
    }

    // erformance logging
    logPerformance(label, duration) {
        const level = duration > 5000 ? 'warn' : 'debug';
        this.log(level, `[PERF] ${label}: ${duration}ms`);
    }

    // API request logging
    logRequest(method, path, statusCode, duration) {
        const level = statusCode >= 400 ? 'warn' : 'info';
        this.log(level, `${method} ${path} - ${statusCode}`, { duration: `${duration}ms` });
    }
}

module.exports = new Logger();
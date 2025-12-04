import { Injectable, LoggerService } from '@nestjs/common';

export interface HttpLogData {
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  userId?: number;
  userEmail?: string;
  ip?: string;
  userAgent?: string;
}

export interface SqlLogData {
  query: string;
  params?: any[];
  duration?: number;
  userId?: number;
  userEmail?: string;
  error?: string;
}

// ANSI color codes
enum Color {
  Reset = '\x1b[0m',
  Bright = '\x1b[1m',
  Dim = '\x1b[2m',

  // Foreground colors
  Red = '\x1b[31m',
  Green = '\x1b[32m',
  Yellow = '\x1b[33m',
  Blue = '\x1b[34m',
  Magenta = '\x1b[35m',
  Cyan = '\x1b[36m',
  White = '\x1b[37m',

  // Background colors
  BgRed = '\x1b[41m',
  BgGreen = '\x1b[42m',
  BgYellow = '\x1b[43m',
}

@Injectable()
export class CustomLoggerService implements LoggerService {
  private formatTimestamp(): string {
    const timestamp = new Date().toISOString();
    return `${Color.Dim}${timestamp}${Color.Reset}`;
  }

  private colorizeLevel(level: string): string {
    const upperLevel = level.toUpperCase();
    switch (level.toLowerCase()) {
      case 'info':
        return `${Color.Green}${upperLevel}${Color.Reset}`;
      case 'error':
        return `${Color.Red}${upperLevel}${Color.Reset}`;
      case 'warn':
        return `${Color.Yellow}${upperLevel}${Color.Reset}`;
      case 'debug':
        return `${Color.Magenta}${upperLevel}${Color.Reset}`;
      case 'verbose':
        return `${Color.Cyan}${upperLevel}${Color.Reset}`;
      default:
        return upperLevel;
    }
  }

  private colorizeContext(context: string): string {
    switch (context) {
      case 'HTTP':
        return `${Color.Blue}${context}${Color.Reset}`;
      case 'SQL':
        return `${Color.Cyan}${context}${Color.Reset}`;
      case 'Bootstrap':
        return `${Color.Magenta}${context}${Color.Reset}`;
      default:
        return `${Color.Yellow}${context}${Color.Reset}`;
    }
  }

  private formatLogMessage(
    level: string,
    context: string,
    message: string,
  ): string {
    return `[${this.formatTimestamp()}] [${this.colorizeLevel(level)}] [${this.colorizeContext(context)}] ${message}`;
  }

  log(message: any, context?: string) {
    console.log(
      this.formatLogMessage('info', context || 'Application', String(message)),
    );
  }

  error(message: any, trace?: string, context?: string) {
    console.error(
      this.formatLogMessage('error', context || 'Application', String(message)),
    );
    if (trace) {
      console.error(`Stack trace: ${trace}`);
    }
  }

  warn(message: any, context?: string) {
    console.warn(
      this.formatLogMessage('warn', context || 'Application', String(message)),
    );
  }

  debug(message: any, context?: string) {
    console.debug(
      this.formatLogMessage('debug', context || 'Application', String(message)),
    );
  }

  verbose(message: any, context?: string) {
    console.log(
      this.formatLogMessage(
        'verbose',
        context || 'Application',
        String(message),
      ),
    );
  }

  /**
   * Log HTTP request and response information
   */
  logHttpRequest(data: HttpLogData): void {
    const method = this.colorizeHttpMethod(data.method);
    const statusColor = this.getStatusColor(data.statusCode);
    const userInfo = data.userId
      ? `User: ${Color.Cyan}${data.userEmail}${Color.Reset} (ID: ${Color.Cyan}${data.userId}${Color.Reset})`
      : 'User: Anonymous';

    const message = [
      `${method} ${Color.Bright}${data.url}${Color.Reset}`,
      `Status: ${statusColor}${data.statusCode}${Color.Reset}`,
      `Response Time: ${Color.Yellow}${data.responseTime}ms${Color.Reset}`,
      userInfo,
      data.ip ? `IP: ${Color.Dim}${data.ip}${Color.Reset}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    this.log(message, 'HTTP');
  }

  private colorizeHttpMethod(method: string): string {
    switch (method.toUpperCase()) {
      case 'GET':
        return `${Color.Green}${method}${Color.Reset}`;
      case 'POST':
        return `${Color.Blue}${method}${Color.Reset}`;
      case 'PUT':
      case 'PATCH':
        return `${Color.Yellow}${method}${Color.Reset}`;
      case 'DELETE':
        return `${Color.Red}${method}${Color.Reset}`;
      default:
        return method;
    }
  }

  private getStatusColor(statusCode: number): string {
    if (statusCode >= 200 && statusCode < 300) {
      return Color.Green;
    } else if (statusCode >= 300 && statusCode < 400) {
      return Color.Cyan;
    } else if (statusCode >= 400 && statusCode < 500) {
      return Color.Yellow;
    } else if (statusCode >= 500) {
      return Color.Red;
    }
    return '';
  }

  /**
   * Log SQL query execution
   */
  logSqlQuery(data: SqlLogData): void {
    const userInfo = data.userId
      ? `User: ${Color.Cyan}${data.userEmail}${Color.Reset} (ID: ${Color.Cyan}${data.userId}${Color.Reset})`
      : `User: ${Color.Dim}System${Color.Reset}`;

    const durationColor = this.getDurationColor(data.duration || 0);
    const durationInfo = data.duration
      ? `Duration: ${durationColor}${data.duration}ms${Color.Reset}`
      : '';

    const paramsInfo =
      data.params && data.params.length > 0
        ? `Params: ${Color.Magenta}${JSON.stringify(data.params)}${Color.Reset}`
        : '';

    const sanitizedQuery = this.sanitizeQuery(data.query);
    const queryInfo = `SQL Query: ${Color.Blue}${sanitizedQuery}${Color.Reset}`;

    const message = [queryInfo, paramsInfo, durationInfo, userInfo]
      .filter(Boolean)
      .join(' | ');

    if (data.error) {
      this.error(
        `${message} | Error: ${Color.Red}${data.error}${Color.Reset}`,
        undefined,
        'SQL',
      );
    } else {
      this.log(message, 'SQL');
    }
  }

  private getDurationColor(duration: number): string {
    if (duration < 10) {
      return Color.Green;
    } else if (duration < 50) {
      return Color.Yellow;
    } else {
      return Color.Red;
    }
  }

  /**
   * Remove extra whitespace and newlines from SQL queries for cleaner logs
   */
  private sanitizeQuery(query: string): string {
    return query.replace(/\s+/g, ' ').trim().substring(0, 500); // Limit query length in logs
  }
}

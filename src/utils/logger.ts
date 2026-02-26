// -*- coding: utf-8 -*-

export enum LogLevel {
  Error = 1,
  Warn = 2,
  Info = 3,
  Debug = 4,
  Trace = 5,
  OriginalTrace = 6
}

let globalLogLevel: LogLevel = LogLevel.Info;
const loggerInstances: Logger[] = [];

const logStyles = {
  error: "\x1B[31m%s\x1B[0m",
  warn: "\x1B[33m%s\x1B[0m",
  info: "\x1B[32m%s\x1B[0m",
  debug: "\x1B[36m%s\x1B[0m",
  trace: "\x1B[34m%s\x1B[0m"
};

export class Logger {
  static rootLogger = new Logger("root");

  name: string;
  logLevel: LogLevel;

  constructor(name = "", logLevel: LogLevel = globalLogLevel) {
    this.name = name;
    this.logLevel = logLevel;
    loggerInstances.push(this);
  }

  static setGlobalLogLevel(logLevel: LogLevel): void {
    globalLogLevel = logLevel;
    loggerInstances.forEach((logger) => logger.setLogLevel(logLevel));
  }

  setLogLevel(logLevel: LogLevel): void {
    this.logLevel = logLevel;
  }

  getLogLevel(): LogLevel {
    return this.logLevel;
  }

  error(...messages: unknown[]): void {
    if (this.logLevel >= LogLevel.Error) {
      console.error(logStyles.error, `[${this.name}][ERROR]`, ...messages);
    }
  }

  warn(...messages: unknown[]): void {
    if (this.logLevel >= LogLevel.Warn) {
      console.warn(logStyles.warn, `[${this.name}][WARN]`, ...messages);
    }
  }

  info(...messages: unknown[]): void {
    if (this.logLevel >= LogLevel.Info) {
      console.log(logStyles.info, `[${this.name}][INFO]`, ...messages);
    }
  }

  debug(...messages: unknown[]): void {
    if (this.logLevel >= LogLevel.Debug) {
      console.debug(logStyles.debug, `[${this.name}][DEBUG]`, ...messages);
    }
  }

  trace(...messages: unknown[]): void {
    if (this.logLevel >= LogLevel.Trace) {
      console.debug(logStyles.trace, `[${this.name}][TRACE]`, ...messages);
    }
  }

  originalTrace(...messages: unknown[]): void {
    if (this.logLevel >= LogLevel.OriginalTrace) {
      console.trace(logStyles.trace, `[${this.name}][ORIGINAL_TRACE]`, ...messages);
    }
  }
}

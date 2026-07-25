export const LOGGER_METADATA_KEYS = [
  "action",
  "code",
  "status",
  "durationMs",
  "requestId",
] as const;

export type LoggerMetadataKey = (typeof LOGGER_METADATA_KEYS)[number];

export type LoggerMetadata = Partial<Record<LoggerMetadataKey, string | number>>;

export interface Logger {
  info(message: string, metadata?: LoggerMetadata): void;
  warn(message: string, metadata?: LoggerMetadata): void;
  error(message: string, metadata?: LoggerMetadata): void;
}

export interface LoggerSink {
  info(message: string, metadata?: LoggerMetadata): void;
  warn(message: string, metadata?: LoggerMetadata): void;
  error(message: string, metadata?: LoggerMetadata): void;
}

export function pickLoggerMetadata(input?: Record<string, unknown>): LoggerMetadata | undefined {
  if (!input) {
    return undefined;
  }

  const metadata: LoggerMetadata = {};

  for (const key of LOGGER_METADATA_KEYS) {
    const value = input[key];
    if (typeof value === "string" || typeof value === "number") {
      metadata[key] = value;
    }
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

export function createLogger(sink: LoggerSink): Logger {
  return {
    info(message, metadata) {
      sink.info(message, pickLoggerMetadata(metadata as Record<string, unknown> | undefined));
    },
    warn(message, metadata) {
      sink.warn(message, pickLoggerMetadata(metadata as Record<string, unknown> | undefined));
    },
    error(message, metadata) {
      sink.error(message, pickLoggerMetadata(metadata as Record<string, unknown> | undefined));
    },
  };
}

export function createConsoleLogger(): Logger {
  return createLogger({
    info(message, metadata) {
      if (metadata) {
        console.info(message, metadata);
        return;
      }

      console.info(message);
    },
    warn(message, metadata) {
      if (metadata) {
        console.warn(message, metadata);
        return;
      }

      console.warn(message);
    },
    error(message, metadata) {
      if (metadata) {
        console.error(message, metadata);
        return;
      }

      console.error(message);
    },
  });
}

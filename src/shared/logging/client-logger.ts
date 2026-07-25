import { createConsoleLogger, type Logger } from "./logger";

const silentLogger: Logger = {
  info() {},
  warn() {},
  error() {},
};

export function createClientLogger(): Logger {
  if (process.env.NODE_ENV === "production") {
    return silentLogger;
  }

  return createConsoleLogger();
}

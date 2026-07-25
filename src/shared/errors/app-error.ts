export type AppErrorCode =
  | "INVALID_REQUEST"
  | "CONFIGURATION_ERROR"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "PROVIDER_ERROR"
  | "INVALID_PROVIDER_RESPONSE";

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  INVALID_REQUEST: 400,
  RATE_LIMITED: 429,
  TIMEOUT: 504,
  CONFIGURATION_ERROR: 503,
  PROVIDER_ERROR: 503,
  INVALID_PROVIDER_RESPONSE: 503,
};

const DEFAULT_SAFE_MESSAGES: Record<AppErrorCode, string> = {
  INVALID_REQUEST: "The request was invalid.",
  CONFIGURATION_ERROR: "AI is temporarily unavailable.",
  RATE_LIMITED: "Too many requests. Please try again later.",
  TIMEOUT: "The request timed out. Please try again.",
  PROVIDER_ERROR: "AI is temporarily unavailable.",
  INVALID_PROVIDER_RESPONSE: "AI returned an unexpected response.",
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly safeMessage: string;
  readonly status: number;
  override readonly cause?: unknown;

  constructor(code: AppErrorCode, options?: { safeMessage?: string; cause?: unknown }) {
    const safeMessage = options?.safeMessage ?? DEFAULT_SAFE_MESSAGES[code];
    super(safeMessage);
    this.name = "AppError";
    this.code = code;
    this.safeMessage = safeMessage;
    this.status = STATUS_BY_CODE[code];
    this.cause = options?.cause;
  }
}

export function getHttpStatusForCode(code: AppErrorCode): number {
  return STATUS_BY_CODE[code];
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function mapProviderError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (isAbortError(error)) {
    return new AppError("TIMEOUT", { cause: error });
  }

  if (isRateLimitError(error)) {
    return new AppError("RATE_LIMITED", { cause: error });
  }

  if (isConfigurationError(error)) {
    return new AppError("CONFIGURATION_ERROR", { cause: error });
  }

  if (error instanceof SyntaxError) {
    return new AppError("INVALID_PROVIDER_RESPONSE", { cause: error });
  }

  return new AppError("PROVIDER_ERROR", { cause: error });
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return true;
    }

    if (/timeout|aborted|abort/i.test(error.message)) {
      return true;
    }
  }

  return false;
}

function isRateLimitError(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status === 429) {
    return true;
  }

  return /rate.?limit|too many requests|quota exceeded/i.test(getErrorMessage(error));
}

function isConfigurationError(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status === 401 || status === 403) {
    return true;
  }

  return /api.?key|authentication|unauthorized|not configured|missing.*key/i.test(
    getErrorMessage(error),
  );
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const record = error as Record<string, unknown>;
  const status = record.status ?? record.statusCode;

  return typeof status === "number" ? status : undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }

  return "";
}

import { AssersionError } from "@/lib/assert";
import { TransactionRollbackError } from "drizzle-orm";

export const ErrorTypes = [
  "MultipleErrors",
  "NetworkError",
  "SessionExpired",
  "InvalidCredentials",
  "UnknownError",
  "HTTPError",
  "DatabaseInconsistencyError",
  "LocalDatabaseInternalError",
  "TransactionRollbackError",
  "InvalidInputError",
  "AssersionError",
] as const;

export type ErrorType = (typeof ErrorTypes)[number];

export class ApplicationError extends Error {
  type: ErrorType;
  originalMessage?: string;
  context?: any;

  constructor(
    type: ErrorType,
    message: string,
    context?: any,
    original?: Error,
  ) {
    super(message);
    this.type = type;
    this.name = `ApplicationError/${type}`;
    this.cause = original;
    this.originalMessage = original?.message;
    this.context = context;
  }

  toString() {
    return this.message;
  }
}

export function wrapMultiErrors(
  e: ApplicationError | ApplicationError[],
  message: string,
  context: any = undefined,
): ApplicationError {
  if (Array.isArray(e)) {
    return new ApplicationError(
      "MultipleErrors",
      "Multiple errors occurred",
      { context, errors: e },
      undefined,
    );
  } else {
    return transformError(e, message, context);
  }
}

export function transformError(
  e: any,
  message?: string,
  context: any = undefined,
): ApplicationError {
  if (e instanceof AssersionError) {
    return new ApplicationError(
      "AssersionError",
      message ?? e.message,
      context,
      e,
    );
  }

  if (e instanceof ApplicationError) {
    return new ApplicationError(e.type, message ?? e.message, context, e);
  }

  const errorMessage = e instanceof Error ? e.message : String(e);
  if (e instanceof TransactionRollbackError) {
    return new ApplicationError(
      "TransactionRollbackError",
      message ?? errorMessage,
      context,
      e,
    );
  }

  if (isNetworkError(e)) {
    return new ApplicationError(
      "NetworkError",
      message ?? errorMessage,
      context,
      e,
    );
  }

  if (isSessionExpired(errorMessage)) {
    return new ApplicationError(
      "SessionExpired",
      message ?? errorMessage,
      context,
      e,
    );
  }

  if (isInvalidCredentials(errorMessage)) {
    return new ApplicationError(
      "InvalidCredentials",
      message ?? errorMessage,
      context,
      e,
    );
  }

  if (
    isLocalDBError(errorMessage) ||
    ("name" in e && e.name === "DrizzleError")
  ) {
    if ("name" in e && e.name === "DrizzleError") {
      return new ApplicationError(
        "LocalDatabaseInternalError",
        message ?? errorMessage,
        context,
        e,
      );
    }

    return new ApplicationError(
      "LocalDatabaseInternalError",
      message ?? errorMessage,
      context,
      e,
    );
  }

  return new ApplicationError(
    "UnknownError",
    message ?? errorMessage,
    context,
    e,
  );
}

export function isNetworkError(error: Error | any) {
  const errormsg = error instanceof Error ? error.message : String(error);
  return (
    (error instanceof Error && error.name === "NetworkError") ||
    errormsg === "Network request failed"
  );
}

export function isSessionExpired(errormsg: string) {
  return (
    errormsg === "Authentication failed. Please check your credentials." ||
    errormsg === "Session Expired" ||
    errormsg === "session_id not found. Please connect first"
  );
}

function isInvalidCredentials(errormsg: string) {
  return (
    errormsg ===
    "Cookie not found in response headers, please check your credentials"
  );
}

function isLocalDBError(errormsg: string) {
  return (
    errormsg.startsWith(
      "Call to function 'NativeDatabase.prepareSync' has been rejected.",
    ) || errormsg.includes("NativeStatement.runSync")
  );
}

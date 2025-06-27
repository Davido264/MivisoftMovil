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

export type ApplicationError = {
  type: ErrorType;
  message: string;
  originalMessage?: string;
  original?: Error;
  context?: any;
};

export function wrapMultiErrors(
  e: ApplicationError | ApplicationError[],
  message: string,
  context: any = undefined,
): ApplicationError {
  if (Array.isArray(e)) {
    return {
      type: "MultipleErrors",
      message,
      context: { context, errors: e },
    };
  } else {
    return transformError(e, message, context);
  }
}

export function transformError(
  e: any,
  message: string,
  context: any = undefined,
): ApplicationError {
  if (e instanceof AssersionError) {
    return { type: "AssersionError", message: e.message, context };
  }

  if (
    typeof e.type === "string" &&
    ErrorTypes.includes(e.type) &&
    typeof e.message === "string"
  ) {
    return {
      ...e,
      message,
      originalMessage: e.message,
      original: e
    } as ApplicationError;
  }

  const errorMessage = e instanceof Error ? e.message : String(e);
  if (e instanceof TransactionRollbackError) {
    return {
      message,
      type: "TransactionRollbackError",
      originalMessage: errorMessage,
      original: e,
      context,
    };
  }

  if (isNetworkError(errorMessage)) {
    return {
      message,
      type: "NetworkError",
      originalMessage: errorMessage,
      original: e,
      context,
    };
  }

  if (isSessionExpired(errorMessage)) {
    return {
      message,
      type: "SessionExpired",
      originalMessage: errorMessage,
      original: e,
      context,
    };
  }

  if (isInvalidCredentials(errorMessage)) {
    return {
      message,
      type: "InvalidCredentials",
      originalMessage: errorMessage,
      original: e,
      context,
    };
  }

  if (
    isLocalDBError(errorMessage) ||
    ("name" in e && e.name === "DrizzleError")
  ) {
    if ("name" in e && e.name === "DrizzleError") {
      return {
        message,
        type: "LocalDatabaseInternalError",
        originalMessage: e?.cause?.stack.split("\n    at")[0] ?? errorMessage,
        original: e,
        context,
      };
    }
    return {
      message,
      type: "LocalDatabaseInternalError",
      originalMessage: errorMessage,
      original: e,
      context,
    };
  }

  return {
    message,
    type: "UnknownError",
    originalMessage: errorMessage,
    original: e,
    context,
  };
}

function isNetworkError(errormsg: string) {
  return errormsg === "Network request failed";
}

function isSessionExpired(errormsg: string) {
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

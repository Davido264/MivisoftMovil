import { AssersionError } from "@/lib/assert";
import { TransactionRollbackError } from "drizzle-orm";

export const ErrorTypes = [
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
  original?: Error;
};

export type Ok<T> = { data: T; error: null };
export type Err = { data: null; error: ApplicationError };
export type Result<T> = Ok<T> | Err;

export function attempt<T>(fn: () => T): Result<T> {
  try {
    return { data: fn(), error: null };
  } catch (e) {
    if (e instanceof AssersionError) {
      throw e; // Assersions must crash
    }
    const error = transformError(e);
    return { data: null, error: error };
  }
}

export async function attemptAsync<T>(
  fn: () => Promise<T>,
): Promise<Result<T>> {
  try {
    return { data: await fn(), error: null };
  } catch (e) {
    if (e instanceof AssersionError) {
      throw e; // Assersions must crash
    }
    const error = transformError(e);
    return { data: null, error };
  }
}

export function transformError(e: any): ApplicationError {
  if (e instanceof AssersionError) {
    return { type: "AssersionError", message: e.message }
  }

  if (
    typeof e.type === "string" &&
    ErrorTypes.includes(e.type) &&
    typeof e.message === "string"
  ) {
    return e as ApplicationError;
  }

  const errorMessage = e instanceof Error ? e.message : String(e);
  if (e instanceof TransactionRollbackError) {
    return {
      type: "TransactionRollbackError",
      message: errorMessage,
      original: e,
    };
  }

  if (isNetworkError(errorMessage)) {
    return {
      type: "NetworkError",
      message: errorMessage,
      original: e,
    };
  }

  if (isSessionExpired(errorMessage)) {
    return {
      type: "SessionExpired",
      message: errorMessage,
      original: e,
    };
  }

  if (isInvalidCredentials(errorMessage)) {
    return {
      type: "InvalidCredentials",
      message: errorMessage,
      original: e,
    };
  }

  if (
    isLocalDBError(errorMessage) ||
    ("name" in e && e.name === "DrizzleError")
  ) {
    if ("name" in e && e.name === "DrizzleError") {
      return {
        type: "LocalDatabaseInternalError",
        message: e?.cause?.stack.split("\n    at")[0] ?? errorMessage,
        original: e,
      };
    }
    return {
      type: "LocalDatabaseInternalError",
      message: errorMessage,
      original: e,
    };
  }

  return {
    type: "UnknownError",
    message: errorMessage,
    original: e,
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

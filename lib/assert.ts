export class AssersionError extends Error {}

function assert(condition: boolean, msg: string | undefined = undefined) {
  if (__DEV__ && !condition) {
    throw new AssersionError(msg ?? "assersion failed");
  }
}

assert.notNull = <T>(value: T, variableName: string | undefined = undefined): asserts value is NonNullable<T> => {
  if (__DEV__ && (value == null || value === undefined)) {
    throw new AssersionError(`passed value ${variableName ? `for ${variableName}` : ""}is null`);
  }
};

export default assert;

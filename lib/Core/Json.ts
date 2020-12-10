type JsonValue = boolean | number | string | null | JsonArray | JsonObject;
export interface JsonObject {
  [key: string]: JsonValue;
}
export interface JsonArray extends Array<JsonValue> {}
export default JsonValue;

export function isJsonObject(
  value: JsonValue | undefined
): value is JsonObject {
  return (
    value !== undefined &&
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

export function isJsonBoolean(value: JsonValue | undefined): value is boolean {
  return typeof value === "boolean";
}

export function isJsonNumber(value: JsonValue | undefined): value is number {
  return typeof value === "number";
}

export function isJsonString(value: JsonValue | undefined): value is string {
  return typeof value === "string";
}

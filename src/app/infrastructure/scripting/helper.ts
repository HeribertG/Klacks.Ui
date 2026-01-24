import { Identifier } from './identifier';
import { ScriptValue } from './script-value';

export function extractDouble(value: Identifier | ScriptValue | null): number {
  if (value == null) return 0;
  if (value instanceof ScriptValue) {
    return value.asDouble();
  }
  if (value instanceof Identifier) {
    return value.value.asDouble();
  }
  return 0;
}

export function extractInt(value: Identifier | ScriptValue | null): number {
  if (value == null) return 0;
  if (value instanceof ScriptValue) {
    return value.asInt();
  }
  if (value instanceof Identifier) {
    return value.value.asInt();
  }
  return 0;
}

export function extractString(value: Identifier | ScriptValue | null): string {
  if (value == null) return '';
  if (value instanceof ScriptValue) {
    return value.asString();
  }
  if (value instanceof Identifier) {
    return value.value.asString();
  }
  return '';
}

export function extractBoolean(
  value: Identifier | ScriptValue | null
): boolean {
  if (value == null) return false;
  if (value instanceof ScriptValue) {
    return value.asBoolean();
  }
  if (value instanceof Identifier) {
    return value.value.asBoolean();
  }
  return false;
}

export function isNumericInt(c: string | null | undefined): boolean {
  if (c == null) return false;
  return /^-?\d+$/.test(c);
}

export function areEqual(
  left: Identifier | ScriptValue | null,
  right: Identifier | ScriptValue | null
): boolean {
  const leftValue = left instanceof Identifier ? left.value : (left ?? ScriptValue.Null);
  const rightValue = right instanceof Identifier ? right.value : (right ?? ScriptValue.Null);

  const leftIsNumeric = leftValue.isNumber || leftValue.isBoolean;
  const rightIsNumeric = rightValue.isNumber || rightValue.isBoolean;

  if (leftIsNumeric && rightIsNumeric) {
    return leftValue.asDouble() === rightValue.asDouble();
  }

  return leftValue.asString() === rightValue.asString();
}

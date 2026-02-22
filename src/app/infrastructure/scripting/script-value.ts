// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export enum ScriptValueType {
  Null = 0,
  Number = 1,
  Boolean = 2,
  String = 3,
  Object = 4,
}

export class ScriptValue {
  private readonly _type: ScriptValueType;
  private readonly _numberValue: number;
  private readonly _objectValue: unknown;

  private constructor(
    type: ScriptValueType,
    numberValue: number,
    objectValue: unknown
  ) {
    this._type = type;
    this._numberValue = numberValue;
    this._objectValue = objectValue;
  }

  static readonly Null = new ScriptValue(ScriptValueType.Null, 0, null);

  static fromNumber(value: number): ScriptValue {
    return new ScriptValue(ScriptValueType.Number, value, null);
  }

  static fromInt(value: number): ScriptValue {
    return new ScriptValue(ScriptValueType.Number, Math.floor(value), null);
  }

  static fromBoolean(value: boolean): ScriptValue {
    return new ScriptValue(ScriptValueType.Boolean, value ? 1 : 0, null);
  }

  static fromString(value: string | null | undefined): ScriptValue {
    if (value == null) return ScriptValue.Null;
    return new ScriptValue(ScriptValueType.String, 0, value);
  }

  static fromObject(value: unknown): ScriptValue {
    if (value == null) return ScriptValue.Null;
    if (value instanceof ScriptValue) return value;
    if (typeof value === 'number') return ScriptValue.fromNumber(value);
    if (typeof value === 'boolean') return ScriptValue.fromBoolean(value);
    if (typeof value === 'string') return ScriptValue.fromString(value);
    return new ScriptValue(ScriptValueType.Object, 0, value);
  }

  get type(): ScriptValueType {
    return this._type;
  }

  get isNull(): boolean {
    return this._type === ScriptValueType.Null;
  }

  get isNumber(): boolean {
    return this._type === ScriptValueType.Number;
  }

  get isBoolean(): boolean {
    return this._type === ScriptValueType.Boolean;
  }

  get isString(): boolean {
    return this._type === ScriptValueType.String;
  }

  get isObject(): boolean {
    return this._type === ScriptValueType.Object;
  }

  asDouble(): number {
    switch (this._type) {
      case ScriptValueType.Number:
      case ScriptValueType.Boolean:
        return this._numberValue;
      case ScriptValueType.String: {
        const parsed = parseFloat(this._objectValue as string);
        return isNaN(parsed) ? 0 : parsed;
      }
      case ScriptValueType.Object:
        if (this._objectValue != null) {
          const num = Number(this._objectValue);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      default:
        return 0;
    }
  }

  asInt(): number {
    return Math.floor(this.asDouble());
  }

  asBoolean(): boolean {
    switch (this._type) {
      case ScriptValueType.Boolean:
      case ScriptValueType.Number:
        return this._numberValue !== 0;
      case ScriptValueType.String:
        return (
          this._objectValue != null && (this._objectValue as string).length > 0
        );
      case ScriptValueType.Object:
        return this._objectValue != null;
      default:
        return false;
    }
  }

  asString(): string {
    switch (this._type) {
      case ScriptValueType.String:
        return (this._objectValue as string) ?? '';
      case ScriptValueType.Number:
        if (this._numberValue === Infinity) return 'Infinity';
        if (this._numberValue === -Infinity) return '-Infinity';
        return this._numberValue.toString();
      case ScriptValueType.Boolean:
        return this._numberValue !== 0 ? 'True' : 'False';
      case ScriptValueType.Object:
        return this._objectValue?.toString() ?? '';
      default:
        return '';
    }
  }

  asObject(): unknown {
    switch (this._type) {
      case ScriptValueType.Null:
        return null;
      case ScriptValueType.Number:
        return this._numberValue;
      case ScriptValueType.Boolean:
        return this._numberValue !== 0;
      case ScriptValueType.String:
      case ScriptValueType.Object:
        return this._objectValue;
      default:
        return null;
    }
  }

  toString(): string {
    return this.asString();
  }

  equals(other: ScriptValue): boolean {
    if (this._type === other._type) {
      switch (this._type) {
        case ScriptValueType.Null:
          return true;
        case ScriptValueType.Number:
        case ScriptValueType.Boolean:
          return this._numberValue === other._numberValue;
        case ScriptValueType.String:
          return this._objectValue === other._objectValue;
        case ScriptValueType.Object:
          return this._objectValue === other._objectValue;
        default:
          return false;
      }
    }

    if (
      (this._type === ScriptValueType.Boolean && other._type === ScriptValueType.Number) ||
      (this._type === ScriptValueType.Number && other._type === ScriptValueType.Boolean)
    ) {
      return this._numberValue === other._numberValue;
    }

    return false;
  }

  add(other: ScriptValue): ScriptValue {
    return ScriptValue.fromNumber(this.asDouble() + other.asDouble());
  }

  subtract(other: ScriptValue): ScriptValue {
    return ScriptValue.fromNumber(this.asDouble() - other.asDouble());
  }

  multiply(other: ScriptValue): ScriptValue {
    return ScriptValue.fromNumber(this.asDouble() * other.asDouble());
  }

  divide(other: ScriptValue): ScriptValue {
    return ScriptValue.fromNumber(this.asDouble() / other.asDouble());
  }

  mod(other: ScriptValue): ScriptValue {
    return ScriptValue.fromNumber(this.asDouble() % other.asDouble());
  }

  negate(): ScriptValue {
    return ScriptValue.fromNumber(-this.asDouble());
  }

  not(): ScriptValue {
    return ScriptValue.fromBoolean(!this.asBoolean());
  }
}

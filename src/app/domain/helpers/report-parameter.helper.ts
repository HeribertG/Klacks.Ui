// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Pure helpers around report parameters: how their values reach a script, how a filter
 * result is interpreted, and which parameter keys are unusable.
 * @param parameters - Parameter definitions of a template
 * @param values - Values entered when the report is executed
 */

import {
  ReportParameter,
  ReportParameterBinding,
  ReportParameterType,
  ReportParameterValues,
} from 'src/app/domain/models/report/report-parameter.model';

/**
 * Parameters are namespaced in the script scope. Without the prefix a parameter named
 * "hours" would shadow the row value of the same name and every comparison against it
 * would be trivially true.
 */
export const PARAMETER_VARIABLE_PREFIX = 'param_';

const TRUTHY_RESULTS = ['1', 'true', 'wahr', 'yes'];
const FALSY_RESULTS = ['0', 'false', 'falsch', 'no', ''];
const KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export function toParameterVariableName(key: string): string {
  return `${PARAMETER_VARIABLE_PREFIX}${key}`;
}

/**
 * Turns the entered values into script variables, converting them to the declared type
 * so a numeric comparison does not silently compare strings.
 */
export function buildParameterVariables(
  parameters: readonly ReportParameter[] | undefined,
  values: ReportParameterValues | undefined
): Record<string, unknown> {
  const variables: Record<string, unknown> = {};

  for (const parameter of parameters ?? []) {
    const raw = values?.[parameter.key] ?? parameter.defaultValue ?? '';
    variables[toParameterVariableName(parameter.key)] = convertValue(parameter.type, raw);
  }

  return variables;
}

function convertValue(type: ReportParameterType, raw: string): unknown {
  switch (type) {
    case ReportParameterType.Number: {
      const parsed = parseFloat(raw);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    case ReportParameterType.Boolean:
      return TRUTHY_RESULTS.includes(raw.trim().toLowerCase());
    default:
      return raw;
  }
}

/**
 * Interprets the string a filter expression produced.
 * Anything that is neither clearly true nor clearly false counts as undecided and is
 * reported back, so the caller can keep the row instead of dropping it silently.
 */
export function interpretFilterResult(result: string): boolean | undefined {
  const normalised = (result ?? '').trim().toLowerCase();
  if (TRUTHY_RESULTS.includes(normalised)) {
    return true;
  }
  if (FALSY_RESULTS.includes(normalised)) {
    return false;
  }
  return undefined;
}

/**
 * Validates a parameter key: it has to be a usable script identifier and must not
 * collide with another parameter.
 */
export function findParameterKeyProblem(
  key: string,
  otherKeys: readonly string[]
): 'empty' | 'invalid' | 'duplicate' | undefined {
  const trimmed = (key ?? '').trim();
  if (trimmed.length === 0) {
    return 'empty';
  }
  if (!KEY_PATTERN.test(trimmed)) {
    return 'invalid';
  }
  if (otherKeys.some(other => other.trim().toLowerCase() === trimmed.toLowerCase())) {
    return 'duplicate';
  }
  return undefined;
}

/**
 * Values that have to be supplied but were left empty.
 */
export function findMissingRequiredParameters(
  parameters: readonly ReportParameter[] | undefined,
  values: ReportParameterValues | undefined
): ReportParameter[] {
  return (parameters ?? []).filter(parameter => {
    if (!parameter.required) {
      return false;
    }
    const value = values?.[parameter.key] ?? parameter.defaultValue ?? '';
    return value.trim().length === 0;
  });
}

/**
 * Maps the parameters that are bound to a query argument onto the fetch arguments.
 */
export function applyParameterBindings(
  parameters: readonly ReportParameter[] | undefined,
  values: ReportParameterValues | undefined,
  target: { groupId?: string; clientId?: string; startDate?: string; endDate?: string }
): { groupId?: string; clientId?: string; startDate?: string; endDate?: string } {
  const result = { ...target };

  for (const parameter of parameters ?? []) {
    const value = (values?.[parameter.key] ?? parameter.defaultValue ?? '').trim();
    if (value.length === 0) {
      continue;
    }

    switch (parameter.bindsTo) {
      case ReportParameterBinding.GroupId:
        result.groupId = value;
        break;
      case ReportParameterBinding.ClientId:
        result.clientId = value;
        break;
      case ReportParameterBinding.StartDate:
        result.startDate = value;
        break;
      case ReportParameterBinding.EndDate:
        result.endDate = value;
        break;
      default:
        break;
    }
  }

  return result;
}

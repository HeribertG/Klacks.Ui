// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  PARAMETER_VARIABLE_PREFIX,
  applyParameterBindings,
  buildParameterVariables,
  findMissingRequiredParameters,
  findParameterKeyProblem,
  interpretFilterResult,
  toParameterVariableName,
} from './report-parameter.helper';
import {
  ReportParameter,
  ReportParameterBinding,
  ReportParameterType,
} from 'src/app/domain/models/report/report-parameter.model';

function parameter(partial: Partial<ReportParameter>): ReportParameter {
  return { key: 'p', label: 'P', type: ReportParameterType.Text, ...partial };
}

describe('report-parameter.helper', () => {
  describe('buildParameterVariables', () => {
    it('namespaces the parameters so they cannot shadow row values', () => {
      const variables = buildParameterVariables([parameter({ key: 'hours' })], { hours: '5' });

      expect(variables[`${PARAMETER_VARIABLE_PREFIX}hours`]).toBe('5');
      expect(variables['hours']).toBeUndefined();
    });

    it('converts numbers so a comparison is numeric', () => {
      const variables = buildParameterVariables(
        [parameter({ key: 'minHours', type: ReportParameterType.Number })],
        { minHours: '8.5' }
      );

      expect(variables['param_minHours']).toBe(8.5);
    });

    it('falls back to zero for an unreadable number', () => {
      const variables = buildParameterVariables(
        [parameter({ key: 'minHours', type: ReportParameterType.Number })],
        { minHours: 'abc' }
      );

      expect(variables['param_minHours']).toBe(0);
    });

    it('converts booleans', () => {
      const parameters = [parameter({ key: 'onlyNight', type: ReportParameterType.Boolean })];

      expect(buildParameterVariables(parameters, { onlyNight: 'true' })['param_onlyNight']).toBe(true);
      expect(buildParameterVariables(parameters, { onlyNight: 'false' })['param_onlyNight']).toBe(false);
    });

    it('uses the default value when nothing was entered', () => {
      const variables = buildParameterVariables([parameter({ key: 'city', defaultValue: 'Zürich' })], {});

      expect(variables['param_city']).toBe('Zürich');
    });

    it('returns nothing when there are no parameters', () => {
      expect(buildParameterVariables(undefined, undefined)).toEqual({});
    });
  });

  describe('interpretFilterResult', () => {
    it('recognises the accepted truthy values', () => {
      expect(interpretFilterResult('1')).toBe(true);
      expect(interpretFilterResult('TRUE')).toBe(true);
      expect(interpretFilterResult(' wahr ')).toBe(true);
    });

    it('recognises the accepted falsy values', () => {
      expect(interpretFilterResult('0')).toBe(false);
      expect(interpretFilterResult('false')).toBe(false);
      expect(interpretFilterResult('')).toBe(false);
    });

    it('reports anything else as undecided, so the caller can keep the row', () => {
      expect(interpretFilterResult('#ERR')).toBeUndefined();
      expect(interpretFilterResult('kaputt')).toBeUndefined();
    });
  });

  describe('findParameterKeyProblem', () => {
    it('accepts a usable identifier', () => {
      expect(findParameterKeyProblem('minHours', [])).toBeUndefined();
      expect(findParameterKeyProblem('min_hours2', [])).toBeUndefined();
    });

    it('rejects an empty key', () => {
      expect(findParameterKeyProblem('  ', [])).toBe('empty');
    });

    it('rejects keys that are not script identifiers', () => {
      expect(findParameterKeyProblem('2hours', [])).toBe('invalid');
      expect(findParameterKeyProblem('min-hours', [])).toBe('invalid');
      expect(findParameterKeyProblem('min hours', [])).toBe('invalid');
    });

    it('rejects a duplicate regardless of casing', () => {
      expect(findParameterKeyProblem('minHours', ['minhours'])).toBe('duplicate');
    });
  });

  describe('findMissingRequiredParameters', () => {
    it('lists required parameters without a value', () => {
      const parameters = [
        parameter({ key: 'a', required: true }),
        parameter({ key: 'c' }),
      ];

      expect(findMissingRequiredParameters(parameters, { a: '', c: '' }).map(p => p.key)).toEqual(['a']);
    });

    it('falls back to the default value when nothing was entered at all', () => {
      const parameters = [parameter({ key: 'b', required: true, defaultValue: 'x' })];

      expect(findMissingRequiredParameters(parameters, {})).toEqual([]);
    });

    it('reports a required field the user cleared, even when a default exists', () => {
      const parameters = [parameter({ key: 'b', required: true, defaultValue: 'x' })];

      expect(findMissingRequiredParameters(parameters, { b: '' }).map(p => p.key)).toEqual(['b']);
    });

    it('treats whitespace as missing', () => {
      expect(findMissingRequiredParameters([parameter({ key: 'a', required: true })], { a: '   ' }).length).toBe(1);
    });
  });

  describe('applyParameterBindings', () => {
    it('overrides the query arguments a parameter is bound to', () => {
      const parameters = [
        parameter({ key: 'g', bindsTo: ReportParameterBinding.GroupId }),
        parameter({ key: 'from', bindsTo: ReportParameterBinding.StartDate }),
      ];

      const result = applyParameterBindings(parameters, { g: 'group-1', from: '2026-05-01' }, {
        groupId: 'old',
        startDate: '2026-01-01',
      });

      expect(result.groupId).toBe('group-1');
      expect(result.startDate).toBe('2026-05-01');
    });

    it('leaves the arguments untouched for unbound or empty parameters', () => {
      const parameters = [
        parameter({ key: 'x' }),
        parameter({ key: 'g', bindsTo: ReportParameterBinding.GroupId }),
      ];

      const result = applyParameterBindings(parameters, { x: 'ignored', g: '  ' }, { groupId: 'keep' });

      expect(result.groupId).toBe('keep');
    });
  });

  describe('toParameterVariableName', () => {
    it('prefixes the key', () => {
      expect(toParameterVariableName('minHours')).toBe('param_minHours');
    });
  });
});

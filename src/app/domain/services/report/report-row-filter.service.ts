// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Applies the row filter of a report section, shared by the PDF and the CSV export so
 * both always show the same rows.
 * @param section - Section whose rowFilter is applied
 * @param rows - Rows fetched for the report
 * @param provider - Data provider that supplies the row variables
 * @param context - Parameter definitions and the values entered when executing
 */

import { Injectable, inject } from '@angular/core';

import { ReportSection } from 'src/app/domain/models/report/report-section.model';
import { ReportParameter, ReportParameterValues } from 'src/app/domain/models/report/report-parameter.model';
import { buildParameterVariables, interpretFilterResult } from 'src/app/domain/helpers/report-parameter.helper';
import { ReportDataProvider } from './report-data-provider.service';
import { FormulaEvaluationService } from './formula-evaluation.service';

export interface ReportParameterContext {
  parameters?: ReportParameter[];
  values?: ReportParameterValues;
}

type ReportRow = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class ReportRowFilterService {
  private formulaService = inject(FormulaEvaluationService);

  private lastFilterFailed = false;

  /**
   * Keeps the rows the filter accepts. A row whose expression cannot be evaluated is
   * kept on purpose: dropping it would silently empty the report with no explanation.
   */
  filterRows(
    section: ReportSection,
    rows: ReportRow[],
    provider: ReportDataProvider,
    context: ReportParameterContext | undefined
  ): ReportRow[] {
    const expression = section.rowFilter?.trim();
    if (!expression) {
      return rows;
    }

    const parameterVariables = buildParameterVariables(context?.parameters, context?.values);
    this.lastFilterFailed = false;

    return rows.filter(row => this.matches(expression, row, provider, parameterVariables));
  }

  /**
   * True when the last filterRows call hit an expression it could not evaluate.
   */
  get hadEvaluationError(): boolean {
    return this.lastFilterFailed;
  }

  /**
   * Variables available to formulas: the row values plus the report parameters.
   */
  buildVariables(
    row: ReportRow,
    provider: ReportDataProvider,
    context: ReportParameterContext | undefined
  ): Record<string, unknown> {
    const rowVariables = provider.buildFormulaVariables ? provider.buildFormulaVariables(row) : {};
    return { ...rowVariables, ...buildParameterVariables(context?.parameters, context?.values) };
  }

  private matches(
    expression: string,
    row: ReportRow,
    provider: ReportDataProvider,
    parameterVariables: Record<string, unknown>
  ): boolean {
    const rowVariables = provider.buildFormulaVariables ? provider.buildFormulaVariables(row) : {};

    try {
      const result = this.formulaService.evaluateFormula(expression, { ...rowVariables, ...parameterVariables });
      const decision = interpretFilterResult(result);
      if (decision === undefined) {
        this.lastFilterFailed = true;
        return true;
      }
      return decision;
    } catch {
      this.lastFilterFailed = true;
      return true;
    }
  }
}

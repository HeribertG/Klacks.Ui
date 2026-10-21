// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Row rules of a body table: grouping column with subtotals and the row filter expression with its
 * design-time validation (syntax and unknown parameter references).
 * @param section - Body table the rule applies to
 * @param expression - Row filter expression as typed by the user
 */

import { Injectable, inject } from '@angular/core';

import { ReportSection } from 'src/app/domain/models/report/report-section.model';
import { ReportField } from 'src/app/domain/models/report/report-field.model';
import { ReportFieldType } from 'src/app/domain/models/report/report-field-type.enum';
import { FormulaEvaluationService } from 'src/app/domain/services/report/formula-evaluation.service';
import { toParameterVariableName } from 'src/app/domain/helpers/report-parameter.helper';
import { PARAMETER_REFERENCE_PATTERN } from '../report-designer.constants';
import { ReportDesignerStateService } from './report-designer-state.service';

@Injectable()
export class ReportDesignerTableRulesService {
  private state = inject(ReportDesignerStateService);
  private formulaEvaluation = inject(FormulaEvaluationService);

  /**
   * Columns a table can be grouped by. Numeric columns are excluded because
   * grouping by a measured value produces one group per row.
   */
  getGroupableFields(section: ReportSection): ReportField[] {
    return section.fields.filter(
      f => f.type !== ReportFieldType.Number
        && f.type !== ReportFieldType.Currency
        && f.type !== ReportFieldType.Image
        && f.type !== ReportFieldType.Formula
    );
  }

  setGroupBy(section: ReportSection, dataBinding: string): void {
    section.groupBy = dataBinding || undefined;
    if (!section.groupBy) {
      section.groupSubtotals = undefined;
    }
    this.state.emitChange();
  }

  toggleGroupSubtotals(section: ReportSection, value: boolean): void {
    section.groupSubtotals = value;
    this.state.emitChange();
  }

  setRowFilter(section: ReportSection, expression: string): void {
    section.rowFilter = expression.trim().length > 0 ? expression : undefined;
    this.state.emitChange();
  }

  /**
   * Status of a row filter expression, shown next to the input so a typo is visible
   * at design time instead of producing a report without rows.
   */
  getRowFilterStatus(section: ReportSection): 'empty' | 'valid' | 'error' | 'unknownParameter' {
    const expression = section.rowFilter?.trim();
    if (!expression) {
      return 'empty';
    }
    if (!this.formulaEvaluation.validateFormula(expression).valid) {
      return 'error';
    }
    return this.findUnknownParameterReference(expression) ? 'unknownParameter' : 'valid';
  }

  /**
   * Finds a param_* reference the template does not declare. The syntax check cannot see
   * this, so a renamed parameter would leave a green marker next to a dead filter.
   */
  findUnknownParameterReference(expression: string): string | undefined {
    const known = new Set(this.state.parameterKeys().map(key => toParameterVariableName(key)));
    const referenced = expression.match(PARAMETER_REFERENCE_PATTERN) ?? [];
    return referenced.find(name => !known.has(name));
  }
}

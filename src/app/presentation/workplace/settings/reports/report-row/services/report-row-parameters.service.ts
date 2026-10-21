// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Parameter definitions and entered values of one report row, and the checks that guard saving
 * and running the report.
 * @param parameters - Parameter list edited in the parameters tab
 * @param key - Parameter whose value is entered in the preview tab
 */

import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ReportParameter } from 'src/app/domain/models/report/report-parameter.model';
import { ReportParameterContext } from 'src/app/domain/services/report/report-parameter-context.interface';
import {
  buildDefaultParameterValues,
  findMissingRequiredParameters,
  findParameterKeyProblem,
} from 'src/app/domain/helpers/report-parameter.helper';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { REPORT_TOAST_NAME } from '../report-row.constants';
import { ReportRowEditorStateService } from './report-row-editor-state.service';

@Injectable()
export class ReportRowParametersService {
  private state = inject(ReportRowEditorStateService);
  private toast = inject(ToastShowService);
  private translate = inject(TranslateService);

  get parameterKeys(): string[] {
    return this.state.editParameters.map(p => p.key).filter(key => key.length > 0);
  }

  get parameterContext(): ReportParameterContext {
    return { parameters: this.state.editParameters, values: this.state.parameterValues };
  }

  onParametersChange(parameters: ReportParameter[]): void {
    this.state.editParameters = parameters;
    this.state.parameterValues = {
      ...buildDefaultParameterValues(parameters),
      ...this.state.parameterValues,
    };
  }

  setParameterValue(key: string, value: string): void {
    this.state.parameterValues = { ...this.state.parameterValues, [key]: value };
  }

  /**
   * Refuses to store parameters whose key is unusable. A malformed key would end up as the
   * script variable param_ and every filter referring to it would quietly never match.
   */
  hasValidParameterKeys(): boolean {
    const parameters = this.state.editParameters;
    const broken = parameters.filter((parameter, index) =>
      findParameterKeyProblem(
        parameter.key,
        parameters.filter((_, i) => i !== index).map(p => p.key)
      ) !== undefined
    );

    if (broken.length === 0) {
      return true;
    }

    this.toast.showError(this.translate.instant('setting.report.parameter.invalidKeys'), REPORT_TOAST_NAME);
    return false;
  }

  /**
   * Reports the parameters that have to be filled before the report can run.
   */
  hasAllRequiredParameters(): boolean {
    const missing = findMissingRequiredParameters(this.state.editParameters, this.state.parameterValues);
    if (missing.length === 0) {
      return true;
    }

    const names = missing.map(p => p.label || p.key).join(', ');
    this.toast.showError(
      `${this.translate.instant('setting.report.parameter.missing')}: ${names}`,
      REPORT_TOAST_NAME
    );
    return false;
  }
}

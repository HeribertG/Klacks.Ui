// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Editor for the parameters a report asks for when it is executed.
 * Shows the script variable name of each parameter, because filters and formulas
 * address them under that name.
 * @param parameters - Parameter definitions of the edited template
 * @param parametersChange - Emitted whenever a definition was added, changed or removed
 */

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import {
  ReportParameter,
  ReportParameterBinding,
  ReportParameterType,
} from 'src/app/domain/models/report/report-parameter.model';
import {
  findParameterKeyProblem,
  toParameterVariableName,
} from 'src/app/domain/helpers/report-parameter.helper';

const CHOICE_SEPARATOR = ',';

@Component({
  selector: 'app-report-parameters',
  standalone: true,
  imports: [FormsModule, TranslateModule],
  templateUrl: './report-parameters.component.html',
  styleUrls: ['./report-parameters.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportParametersComponent {
  readonly parameters = input.required<ReportParameter[]>();
  readonly parametersChange = output<ReportParameter[]>();

  readonly ReportParameterType = ReportParameterType;
  readonly ReportParameterBinding = ReportParameterBinding;

  readonly typeOptions = [
    { value: ReportParameterType.Text, labelKey: 'setting.report.parameter.typeText' },
    { value: ReportParameterType.Number, labelKey: 'setting.report.parameter.typeNumber' },
    { value: ReportParameterType.Date, labelKey: 'setting.report.parameter.typeDate' },
    { value: ReportParameterType.Boolean, labelKey: 'setting.report.parameter.typeBoolean' },
    { value: ReportParameterType.Choice, labelKey: 'setting.report.parameter.typeChoice' },
  ];

  readonly bindingOptions = [
    { value: ReportParameterBinding.None, labelKey: 'setting.report.parameter.bindNone' },
    { value: ReportParameterBinding.GroupId, labelKey: 'setting.report.parameter.bindGroup' },
    { value: ReportParameterBinding.ClientId, labelKey: 'setting.report.parameter.bindClient' },
    { value: ReportParameterBinding.StartDate, labelKey: 'setting.report.parameter.bindStartDate' },
    { value: ReportParameterBinding.EndDate, labelKey: 'setting.report.parameter.bindEndDate' },
  ];

  variableName(parameter: ReportParameter): string {
    return toParameterVariableName(parameter.key);
  }

  keyProblem(parameter: ReportParameter, index: number): string | undefined {
    const others = this.parameters().filter((_, i) => i !== index).map(p => p.key);
    const problem = findParameterKeyProblem(parameter.key, others);
    return problem ? `setting.report.parameter.key${problem}` : undefined;
  }

  choicesText(parameter: ReportParameter): string {
    return (parameter.choices ?? []).join(`${CHOICE_SEPARATOR} `);
  }

  addParameter(): void {
    this.emit([
      ...this.parameters(),
      { key: '', label: '', type: ReportParameterType.Text, bindsTo: ReportParameterBinding.None },
    ]);
  }

  removeParameter(index: number): void {
    this.emit(this.parameters().filter((_, i) => i !== index));
  }

  setKey(parameter: ReportParameter, value: string): void {
    parameter.key = value.trim();
    this.emit(this.parameters());
  }

  setLabel(parameter: ReportParameter, value: string): void {
    parameter.label = value;
    this.emit(this.parameters());
  }

  setType(parameter: ReportParameter, value: ReportParameterType): void {
    parameter.type = Number(value);
    if (parameter.type !== ReportParameterType.Choice) {
      parameter.choices = undefined;
    }
    this.emit(this.parameters());
  }

  setBinding(parameter: ReportParameter, value: ReportParameterBinding): void {
    parameter.bindsTo = Number(value);
    this.emit(this.parameters());
  }

  setRequired(parameter: ReportParameter, value: boolean): void {
    parameter.required = value;
    this.emit(this.parameters());
  }

  setDefaultValue(parameter: ReportParameter, value: string): void {
    parameter.defaultValue = value;
    this.emit(this.parameters());
  }

  setChoices(parameter: ReportParameter, value: string): void {
    const choices = value
      .split(CHOICE_SEPARATOR)
      .map(choice => choice.trim())
      .filter(choice => choice.length > 0);
    parameter.choices = choices.length > 0 ? choices : undefined;
    this.emit(this.parameters());
  }

  private emit(parameters: ReportParameter[]): void {
    this.parametersChange.emit([...parameters]);
  }
}

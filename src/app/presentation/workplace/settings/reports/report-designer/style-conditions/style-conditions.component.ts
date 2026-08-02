// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Editor for the conditional formatting rules of a table column.
 * Each rule holds a Klacks script expression and the style applied when it matches.
 * @param field - Report field whose conditions are edited
 * @param fieldChange - Emitted whenever a condition was added, changed or removed
 */

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ReportField, StyleCondition } from 'src/app/domain/models/report/report-field.model';

const DEFAULT_CONDITION_TEXT_COLOR = '#c00000';

@Component({
  selector: 'app-style-conditions',
  standalone: true,
  imports: [FormsModule, TranslateModule],
  templateUrl: './style-conditions.component.html',
  styleUrls: ['./style-conditions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StyleConditionsComponent {
  readonly field = input.required<ReportField>();
  readonly fieldChange = output<void>();

  get conditions(): StyleCondition[] {
    return this.field().styleConditions ?? [];
  }

  addCondition(): void {
    const target = this.field();
    target.styleConditions = [
      ...(target.styleConditions ?? []),
      { expression: '', textColor: DEFAULT_CONDITION_TEXT_COLOR },
    ];
    this.fieldChange.emit();
  }

  removeCondition(index: number): void {
    const target = this.field();
    const remaining = (target.styleConditions ?? []).filter((_, i) => i !== index);
    target.styleConditions = remaining.length > 0 ? remaining : undefined;
    this.fieldChange.emit();
  }

  setExpression(condition: StyleCondition, value: string): void {
    condition.expression = value;
    this.fieldChange.emit();
  }

  setTextColor(condition: StyleCondition, value: string): void {
    condition.textColor = value;
    this.fieldChange.emit();
  }

  setBackgroundColor(condition: StyleCondition, value: string): void {
    condition.backgroundColor = value;
    this.fieldChange.emit();
  }

  toggleBold(condition: StyleCondition): void {
    condition.bold = !condition.bold;
    this.fieldChange.emit();
  }

  toggleItalic(condition: StyleCondition): void {
    condition.italic = !condition.italic;
    this.fieldChange.emit();
  }

  clearBackground(condition: StyleCondition): void {
    condition.backgroundColor = undefined;
    this.fieldChange.emit();
  }
}

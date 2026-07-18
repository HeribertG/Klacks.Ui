// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Dumb row component that renders a single CounterRule in a readable form and
 * emits edit/delete intents. Enum values are mapped to translation keys.
 * @param data - The CounterRule to display.
 */
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { ICounterRule, CounterRule } from 'src/app/domain/models/scheduling/counter-rule.model';
import {
  CounterEventType,
  CounterPeriod,
  RuleEnforcementMode,
} from 'src/app/domain/enums/counter-rule.enums';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

@Component({
  selector: 'app-counter-rule-row',
  templateUrl: './counter-rule-row.component.html',
  styleUrls: ['./counter-rule-row.component.scss'],
  standalone: true,
  imports: [TranslateModule, TrashIconRedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CounterRuleRowComponent {
  readonly data = input<ICounterRule>(new CounterRule());
  readonly isDeleteEvent = output<void>();
  readonly editEvent = output<ICounterRule>();

  eventTypeKey(): string {
    switch (this.data().eventType) {
      case CounterEventType.NightShift:
        return 'setting.counterRule.eventType.nightShift';
      case CounterEventType.WorkedDayInWeek:
        return 'setting.counterRule.eventType.workedDayInWeek';
      case CounterEventType.ShiftExceedingHours:
        return 'setting.counterRule.eventType.shiftExceedingHours';
      default:
        return '';
    }
  }

  periodKey(): string {
    switch (this.data().period) {
      case CounterPeriod.Week:
        return 'setting.counterRule.period.week';
      case CounterPeriod.Month:
        return 'setting.counterRule.period.month';
      case CounterPeriod.Year:
        return 'setting.counterRule.period.year';
      default:
        return '';
    }
  }

  enforcementKey(): string {
    const enforcement = this.data().enforcement;
    if (enforcement === null || enforcement === undefined) {
      return 'setting.counterRule.enforcement.default';
    }
    return enforcement === RuleEnforcementMode.Block
      ? 'setting.counterRule.enforcement.block'
      : 'setting.counterRule.enforcement.warn';
  }

  showHoursThreshold(): boolean {
    return this.data().eventType === CounterEventType.ShiftExceedingHours;
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit();
  }

  onClickEdit(): void {
    this.editEvent.emit(this.data());
  }
}

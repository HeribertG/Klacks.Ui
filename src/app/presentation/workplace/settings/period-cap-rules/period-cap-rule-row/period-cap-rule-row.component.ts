// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Presentational row for a single period cap rule.
 * @remarks Displays period/scope/cap or the rolling window summary as read-only
 * fields; emits editEvent on click and isDeleteEvent on trash click.
 */
import {
  Component,
  ChangeDetectionStrategy,
  computed,
  input,
  output,
} from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import {
  IPeriodCapRule,
  PeriodCapRule,
} from 'src/app/domain/models/scheduling/period-cap-rule.model';
import {
  PeriodCapPeriod,
  PeriodCapScope,
} from 'src/app/domain/enums/period-cap-rule.enums';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

@Component({
  selector: 'app-period-cap-rule-row',
  templateUrl: './period-cap-rule-row.component.html',
  styleUrls: ['./period-cap-rule-row.component.scss'],
  standalone: true,
  imports: [TranslateModule, TrashIconRedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodCapRuleRowComponent {
  readonly data = input<IPeriodCapRule>(new PeriodCapRule());
  readonly isDeleteEvent = output<void>();
  readonly editEvent = output<IPeriodCapRule>();

  readonly periodKey = computed(() => {
    switch (this.data().period) {
      case PeriodCapPeriod.Quarter:
        return 'setting.periodCapRule.period.quarter';
      case PeriodCapPeriod.Year:
        return 'setting.periodCapRule.period.year';
      case PeriodCapPeriod.CustomWeeks:
        return 'setting.periodCapRule.period.customWeeks';
      case PeriodCapPeriod.Month:
      default:
        return 'setting.periodCapRule.period.month';
    }
  });

  readonly scopeKey = computed(() =>
    this.data().scope === PeriodCapScope.OvertimeHours
      ? 'setting.periodCapRule.scope.overtimeHours'
      : 'setting.periodCapRule.scope.totalHours'
  );

  readonly isRolling = computed(() => {
    const rule = this.data();
    return (
      (rule.rollingWindowWeeks ?? 0) > 0 &&
      (rule.maxAverageWeeklyHours ?? 0) > 0
    );
  });

  readonly rollingSummary = computed(() => {
    const rule = this.data();
    if (!this.isRolling()) {
      return '';
    }
    return `${rule.rollingWindowWeeks} / ${rule.maxAverageWeeklyHours}`;
  });

  readonly capHoursDisplay = computed(() =>
    this.isRolling() ? '' : `${this.data().capHours}`
  );

  onClickDelete(): void {
    this.isDeleteEvent.emit();
  }

  onClickEdit(): void {
    this.editEvent.emit(this.data());
  }
}

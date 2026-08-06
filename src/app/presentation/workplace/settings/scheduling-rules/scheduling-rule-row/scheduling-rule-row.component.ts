// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { ISchedulingRule, SchedulingRule } from 'src/app/domain/models/scheduling/scheduling-rule.model';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

@Component({
  selector: 'app-scheduling-rule-row',
  templateUrl: './scheduling-rule-row.component.html',
  styleUrls: ['./scheduling-rule-row.component.scss'],
  standalone: true,
  imports: [TrashIconRedComponent, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulingRuleRowComponent {
  readonly data = input<ISchedulingRule>(new SchedulingRule());
  readonly isDeleteEvent = output<void>();
  readonly editEvent = output<ISchedulingRule>();

  /**
   * Translation key naming where a rule comes from. The list mixes region-import presets with
   * customer-owned rules and showed no difference at all, so a preset was indistinguishable from a
   * rule someone wrote by hand.
   */
  readonly originKey = computed(() => {
    const industry = this.data().industry;
    return industry
      ? `setting.schedulingRule.industry.${industry}`
      : 'setting.schedulingRule.ownRule';
  });

  onClickDelete(): void {
    this.isDeleteEvent.emit();
  }

  onClickEdit(): void {
    this.editEvent.emit(this.data());
  }
}

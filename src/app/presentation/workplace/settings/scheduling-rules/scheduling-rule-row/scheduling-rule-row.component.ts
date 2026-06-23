// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

import { ISchedulingRule, SchedulingRule } from 'src/app/domain/models/scheduling/scheduling-rule.model';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

@Component({
  selector: 'app-scheduling-rule-row',
  templateUrl: './scheduling-rule-row.component.html',
  styleUrls: ['./scheduling-rule-row.component.scss'],
  standalone: true,
  imports: [TrashIconRedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulingRuleRowComponent {
  readonly data = input<ISchedulingRule>(new SchedulingRule());
  readonly isDeleteEvent = output<void>();
  readonly editEvent = output<ISchedulingRule>();

  onClickDelete(): void {
    this.isDeleteEvent.emit();
  }

  onClickEdit(): void {
    this.editEvent.emit(this.data());
  }
}

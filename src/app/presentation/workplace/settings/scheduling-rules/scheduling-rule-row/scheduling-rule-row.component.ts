// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, Input, Output, EventEmitter } from '@angular/core';

import { ISchedulingRule, SchedulingRule } from 'src/app/domain/models/scheduling/scheduling-rule.model';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

@Component({
  selector: 'app-scheduling-rule-row',
  templateUrl: './scheduling-rule-row.component.html',
  styleUrls: ['./scheduling-rule-row.component.scss'],
  standalone: true,
  imports: [TrashIconRedComponent],
})
export class SchedulingRuleRowComponent {
  @Input() data: ISchedulingRule = new SchedulingRule();
  @Output() isDeleteEvent = new EventEmitter<void>();
  @Output() editEvent = new EventEmitter<ISchedulingRule>();

  onClickDelete(): void {
    this.isDeleteEvent.emit();
  }

  onClickEdit(): void {
    this.editEvent.emit(this.data);
  }
}

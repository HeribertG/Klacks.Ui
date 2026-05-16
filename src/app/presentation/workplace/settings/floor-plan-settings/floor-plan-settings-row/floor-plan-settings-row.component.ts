// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { IFloorPlan } from 'src/app/domain/models/floor-plan/floor-plan-class';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { IconCopyGreyComponent } from 'src/app/presentation/icons/icon-copy-grey.component';

@Component({
  selector: 'app-floor-plan-settings-row',
  standalone: true,
  imports: [TranslateModule, TrashIconRedComponent, IconCopyGreyComponent],
  templateUrl: './floor-plan-settings-row.component.html',
  styleUrls: ['./floor-plan-settings-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlanSettingsRowComponent {

  @Input() data!: IFloorPlan;
  @Output() editEvent = new EventEmitter<IFloorPlan>();
  @Output() cloneEvent = new EventEmitter<IFloorPlan>();
  @Output() deleteEvent = new EventEmitter<IFloorPlan>();

  onClickEdit(): void {
    this.editEvent.emit(this.data);
  }

  onClickClone(): void {
    this.cloneEvent.emit(this.data);
  }

  onClickDelete(): void {
    this.deleteEvent.emit(this.data);
  }
}

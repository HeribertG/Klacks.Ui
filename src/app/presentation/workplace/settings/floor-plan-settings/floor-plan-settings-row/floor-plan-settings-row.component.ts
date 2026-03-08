// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, Input, Output, EventEmitter, inject } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IFloorPlan } from 'src/app/domain/models/floor-plan/floor-plan-class';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

@Component({
  selector: 'app-floor-plan-settings-row',
  standalone: true,
  imports: [TranslateModule, TrashIconRedComponent],
  templateUrl: './floor-plan-settings-row.component.html',
  styleUrls: ['./floor-plan-settings-row.component.scss'],
})
export class FloorPlanSettingsRowComponent {
  translate = inject(TranslateService);

  @Input() data!: IFloorPlan;
  @Output() editEvent = new EventEmitter<IFloorPlan>();
  @Output() deleteEvent = new EventEmitter<IFloorPlan>();

  onClickEdit(): void {
    this.editEvent.emit(this.data);
  }

  onClickDelete(): void {
    this.deleteEvent.emit(this.data);
  }
}

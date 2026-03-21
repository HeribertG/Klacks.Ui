// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IAbsenceDetail } from 'src/app/domain/models/absence-detail/absence-detail-class';
import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

@Component({
  selector: 'app-absence-detail-row',
  standalone: true,
  imports: [FallbackPipe, TrashIconRedComponent],
  templateUrl: './absence-detail-row.component.html',
  styleUrls: ['./absence-detail-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbsenceDetailRowComponent {
  translate = inject(TranslateService);

  @Input() data!: IAbsenceDetail;
  @Output() editEvent = new EventEmitter<IAbsenceDetail>();
  @Output() isDeleteEvent = new EventEmitter<IAbsenceDetail>();

  onClickEdit(): void {
    this.editEvent.emit(this.data);
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit(this.data);
  }
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Row component for a single qualification entry in the settings list.
 * @param data - The qualification to display
 */
import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { IQualification } from 'src/app/domain/models/settings/qualification';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

@Component({
  selector: 'app-qualifications-row',
  standalone: true,
  imports: [FormsModule, TranslateModule, TrashIconRedComponent],
  templateUrl: './qualifications-row.component.html',
  styleUrls: ['./qualifications-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QualificationsRowComponent {

  @Input() data!: IQualification;
  @Output() editEvent = new EventEmitter<IQualification>();
  @Output() isDeleteEvent = new EventEmitter<IQualification>();

  onClickEdit(): void {
    this.editEvent.emit(this.data);
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit(this.data);
  }
}

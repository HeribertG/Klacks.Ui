// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { IBranch } from 'src/app/domain/models/settings/branch';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

@Component({
  selector: 'app-branches-row',
  standalone: true,
  imports: [FormsModule, TranslateModule, TrashIconRedComponent],
  templateUrl: './branches-row.component.html',
  styleUrls: ['./branches-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BranchesRowComponent {

  readonly data = input.required<IBranch>();
  readonly editEvent = output<IBranch>();
  readonly isDeleteEvent = output<IBranch>();

  onClickEdit(): void {
    this.editEvent.emit(this.data());
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit(this.data());
  }
}

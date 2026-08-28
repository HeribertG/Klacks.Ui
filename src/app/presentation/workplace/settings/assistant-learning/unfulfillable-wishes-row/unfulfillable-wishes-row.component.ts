// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * One row of the "unfulfillable wishes" list of the Klacksy learning settings card.
 * @param data - The cluster of utterances Klacksy could not turn into a capability
 * @param editEvent - Emits the entry when the row is clicked, so the parent can open the detail modal
 * @param isDeleteEvent - Emits the entry when the trash icon is clicked
 */
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

import { DatePipe } from '@angular/common';
import { IUnfulfillableWish } from 'src/app/domain/interfaces/klacksy-learning.interface';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

@Component({
  selector: 'app-unfulfillable-wishes-row',
  standalone: true,
  imports: [DatePipe, TrashIconRedComponent],
  templateUrl: './unfulfillable-wishes-row.component.html',
  styleUrls: ['./unfulfillable-wishes-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnfulfillableWishesRowComponent {
  readonly data = input.required<IUnfulfillableWish>();
  readonly editEvent = output<IUnfulfillableWish>();
  readonly isDeleteEvent = output<IUnfulfillableWish>();

  onClickEdit(): void {
    this.editEvent.emit(this.data());
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit(this.data());
  }
}

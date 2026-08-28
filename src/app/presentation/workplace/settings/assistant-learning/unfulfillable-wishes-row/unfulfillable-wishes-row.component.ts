// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * One row of the "unfulfillable wishes" list of the Klacksy learning settings card.
 * @param data - The cluster of utterances Klacksy could not turn into a capability
 * @param editEvent - Emits the entry when the row is clicked, so the parent can open the detail modal
 * @param isDeleteEvent - Emits the entry when the trash icon is clicked
 * @param retryEvent - Emits a wish the loop gave up on when the retry icon is clicked, so the parent
 * can hand it back to the learning loop. Only a row the loop actually abandoned offers it: a wish that
 * is still waiting to be picked up has nothing to hand back.
 */
import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';

import { DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { IUnfulfillableWish } from 'src/app/domain/interfaces/klacksy-learning.interface';
import { KLACKSY_LEARNING_WISH_STATUS } from 'src/app/domain/constants/klacksy-learning.constants';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

@Component({
  selector: 'app-unfulfillable-wishes-row',
  standalone: true,
  imports: [DatePipe, TranslateModule, TrashIconRedComponent],
  templateUrl: './unfulfillable-wishes-row.component.html',
  styleUrls: ['./unfulfillable-wishes-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnfulfillableWishesRowComponent {
  readonly data = input.required<IUnfulfillableWish>();
  readonly editEvent = output<IUnfulfillableWish>();
  readonly isDeleteEvent = output<IUnfulfillableWish>();
  readonly retryEvent = output<IUnfulfillableWish>();

  readonly isUnfulfillable = computed(
    () => this.data().status === KLACKSY_LEARNING_WISH_STATUS.Unfulfillable,
  );

  onClickEdit(): void {
    this.editEvent.emit(this.data());
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit(this.data());
  }

  onClickRetry(): void {
    this.retryEvent.emit(this.data());
  }
}

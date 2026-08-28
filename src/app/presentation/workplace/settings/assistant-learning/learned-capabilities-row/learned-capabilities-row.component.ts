// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * One row of the "learned capabilities" list of the Klacksy learning settings card.
 * @param data - The learned capability (a recipe Klacksy composed itself) this row renders
 * @param editEvent - Emits the entry when the row is clicked, so the parent can open the edit modal
 * @param isDeleteEvent - Emits the entry when the trash icon is clicked
 */
import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { ILearnedCapability } from 'src/app/domain/interfaces/klacksy-learning.interface';
import { KLACKSY_LEARNING_EMPTY_VALUE } from 'src/app/domain/constants/klacksy-learning.constants';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

const STEP_SEPARATOR = ' → ';

@Component({
  selector: 'app-learned-capabilities-row',
  standalone: true,
  imports: [TranslateModule, TrashIconRedComponent],
  templateUrl: './learned-capabilities-row.component.html',
  styleUrls: ['./learned-capabilities-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnedCapabilitiesRowComponent {
  readonly data = input.required<ILearnedCapability>();
  readonly editEvent = output<ILearnedCapability>();
  readonly isDeleteEvent = output<ILearnedCapability>();

  readonly stepsText = computed(() =>
    (this.data().steps ?? [])
      .map((step) => step.skill || step.kind)
      .filter((label) => !!label)
      .join(STEP_SEPARATOR),
  );

  readonly quoteText = computed(() => {
    const entry = this.data();
    if (entry.quote === null || entry.quote === undefined || !entry.uses) {
      return KLACKSY_LEARNING_EMPTY_VALUE;
    }
    return `${Math.round(entry.quote * 100)}%`;
  });

  onClickEdit(): void {
    this.editEvent.emit(this.data());
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit(this.data());
  }
}

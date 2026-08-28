// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * One row of the "learned phrases" list of the Klacksy learning settings card.
 * @param data - The learned phrase or description sharpening this row renders
 * @param editEvent - Emits the entry when the row is clicked, so the parent can open the edit modal
 * @param isDeleteEvent - Emits the entry when the trash icon is clicked
 * @param approveEvent - Emits a description sharpening the regression gate withheld when the check icon
 * is clicked, so the parent can override the gate and apply it to the skill itself. Only a blocked row
 * offers it: the loop applies everything the gate lets through by itself, and an open or already applied
 * row has nothing left for an administrator to approve.
 */
import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { ILearnedPhrase } from 'src/app/domain/interfaces/klacksy-learning.interface';
import {
  KLACKSY_LEARNING_EMPTY_VALUE,
  KLACKSY_LEARNING_PHRASE_SOURCE,
  KLACKSY_LEARNING_PHRASE_STATUS,
} from 'src/app/domain/constants/klacksy-learning.constants';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

const SOURCE_LABEL_KEYS: Record<string, string> = {
  [KLACKSY_LEARNING_PHRASE_SOURCE.Learned]: 'setting.klacksyLearning.phrases.source.learned',
  [KLACKSY_LEARNING_PHRASE_SOURCE.Description]: 'setting.klacksyLearning.phrases.source.description',
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  [KLACKSY_LEARNING_PHRASE_STATUS.Active]: 'setting.klacksyLearning.phrases.status.active',
  [KLACKSY_LEARNING_PHRASE_STATUS.Pending]: 'setting.klacksyLearning.phrases.status.pending',
  [KLACKSY_LEARNING_PHRASE_STATUS.AppliedAuto]: 'setting.klacksyLearning.phrases.status.appliedAuto',
  [KLACKSY_LEARNING_PHRASE_STATUS.BlockedRegression]:
    'setting.klacksyLearning.phrases.status.blockedRegression',
};

const BLOCKED_HINT_KEY = 'setting.klacksyLearning.phrases.blockedHint';

@Component({
  selector: 'app-learned-phrases-row',
  standalone: true,
  imports: [TranslateModule, TrashIconRedComponent],
  templateUrl: './learned-phrases-row.component.html',
  styleUrls: ['./learned-phrases-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnedPhrasesRowComponent {
  readonly data = input.required<ILearnedPhrase>();
  readonly editEvent = output<ILearnedPhrase>();
  readonly isDeleteEvent = output<ILearnedPhrase>();
  readonly approveEvent = output<ILearnedPhrase>();

  readonly isActive = computed(
    () => this.data().status === KLACKSY_LEARNING_PHRASE_STATUS.Active,
  );

  readonly isPending = computed(
    () => this.data().status === KLACKSY_LEARNING_PHRASE_STATUS.Pending,
  );

  readonly isAppliedAuto = computed(
    () => this.data().status === KLACKSY_LEARNING_PHRASE_STATUS.AppliedAuto,
  );

  readonly isBlockedRegression = computed(
    () => this.data().status === KLACKSY_LEARNING_PHRASE_STATUS.BlockedRegression,
  );

  readonly sourceLabelKey = computed(
    () => SOURCE_LABEL_KEYS[this.data().source] ?? SOURCE_LABEL_KEYS[KLACKSY_LEARNING_PHRASE_SOURCE.Learned],
  );

  readonly statusLabelKey = computed(
    () => STATUS_LABEL_KEYS[this.data().status] ?? STATUS_LABEL_KEYS[KLACKSY_LEARNING_PHRASE_STATUS.Active],
  );

  readonly statusTitleKey = computed(() =>
    this.isBlockedRegression() ? BLOCKED_HINT_KEY : this.statusLabelKey(),
  );

  readonly quoteText = computed(() => {
    const entry = this.data();
    if (entry.quote === null || entry.quote === undefined || !entry.uses) {
      return KLACKSY_LEARNING_EMPTY_VALUE;
    }
    return `${Math.round(entry.quote * 100)}%`;
  });

  readonly usesText = computed(() => {
    const uses = this.data().uses;
    return uses ? uses.toString() : KLACKSY_LEARNING_EMPTY_VALUE;
  });

  onClickEdit(): void {
    this.editEvent.emit(this.data());
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit(this.data());
  }

  onClickApprove(): void {
    this.approveEvent.emit(this.data());
  }
}

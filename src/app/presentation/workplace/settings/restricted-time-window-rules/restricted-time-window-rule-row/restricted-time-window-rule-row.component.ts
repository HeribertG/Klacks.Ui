// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Presentational row for a single restricted time window rule.
 * Emits edit/delete intents and exposes human-readable season and
 * daily-window strings for display.
 * @param data - The restricted time window rule to render.
 */
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import {
  IRestrictedTimeWindowRule,
  RestrictedTimeWindowRule,
} from 'src/app/domain/models/scheduling/restricted-time-window-rule.model';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { formatTime } from 'src/app/shared/helpers/time-format.helper';

@Component({
  selector: 'app-restricted-time-window-rule-row',
  templateUrl: './restricted-time-window-rule-row.component.html',
  styleUrls: ['./restricted-time-window-rule-row.component.scss'],
  standalone: true,
  imports: [TranslateModule, TrashIconRedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestrictedTimeWindowRuleRowComponent {
  readonly data = input<IRestrictedTimeWindowRule>(new RestrictedTimeWindowRule());
  readonly isDeleteEvent = output<void>();
  readonly editEvent = output<IRestrictedTimeWindowRule>();

  get seasonDisplay(): string {
    const rule = this.data();
    return `${rule.seasonFromMonth}/${rule.seasonFromDay} – ${rule.seasonToMonth}/${rule.seasonToDay}`;
  }

  get dailyWindowDisplay(): string {
    const rule = this.data();
    return `${formatTime(rule.dailyStart)} – ${formatTime(rule.dailyEnd)}`;
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit();
  }

  onClickEdit(): void {
    this.editEvent.emit(this.data());
  }
}

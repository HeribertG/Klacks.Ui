// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Compact read-only report of missed schedule-command wishes: the counts per tier (broken FREE, broken EARLY / LATE /
 * NIGHT, broken -EARLY / -LATE / -NIGHT, unfulfilled wishes) and the single wishes with employee, day, the planner's
 * own keyword and how it was missed. Renders nothing when there is nothing to report.
 * @param wishes - Counts per tier; null when the counts are unknown (then only the rows are shown)
 * @param rows - The single missed wishes to list, already carrying the employee's display name
 */

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { KeywordWishes } from 'src/app/domain/models/schedule/keyword-wishes.interface';
import { KeywordWishRow } from 'src/app/domain/models/schedule/keyword-wish-row.interface';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { CalendarDateToStringShort } from 'src/app/domain/helpers/date.helper';
import { KeywordWishTierCount } from './keyword-wish-tier-count.interface';
import { KeywordWishDisplayRow } from './keyword-wish-display-row.interface';
import { KEYWORD_WISH_TIER_COUNT_KEYS } from 'src/app/domain/constants/keyword-wish.constants';
import { keywordWishOutcomeKey, scheduleCommandKeywordLabel } from 'src/app/domain/helpers/keyword-wish.helper';

@Component({
  selector: 'app-keyword-wish-report',
  templateUrl: './keyword-wish-report.component.html',
  styleUrls: ['./keyword-wish-report.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KeywordWishReportComponent {
  private readonly translate = inject(TranslateService);
  private readonly appSettings = inject(AppSettingsManagementService);

  readonly wishes = input<KeywordWishes | null | undefined>(null);
  readonly rows = input<readonly KeywordWishRow[]>([]);

  readonly tierCounts = computed<KeywordWishTierCount[]>(() => {
    const wishes = this.wishes();
    if (!wishes) {
      return [];
    }
    return [
      { key: KEYWORD_WISH_TIER_COUNT_KEYS.brokenFree, count: wishes.brokenFree },
      { key: KEYWORD_WISH_TIER_COUNT_KEYS.brokenOnly, count: wishes.brokenOnly },
      { key: KEYWORD_WISH_TIER_COUNT_KEYS.brokenNo, count: wishes.brokenNo },
      { key: KEYWORD_WISH_TIER_COUNT_KEYS.unfulfilled, count: wishes.unfulfilled },
    ].filter((tier) => tier.count > 0);
  });

  readonly displayRows = computed<KeywordWishDisplayRow[]>(() => {
    const labels = this.appSettings.schedulingDefaultSettings();
    const language = this.translate.currentLang;
    return this.rows().map((row) => ({
      clientName: row.clientName,
      dateText: CalendarDateToStringShort(row.date, language),
      keywordLabel: scheduleCommandKeywordLabel(row.keyword, labels),
      outcomeKey: keywordWishOutcomeKey(row.outcome),
    }));
  });

  readonly hasContent = computed(() => this.tierCounts().length > 0 || this.displayRows().length > 0);
}

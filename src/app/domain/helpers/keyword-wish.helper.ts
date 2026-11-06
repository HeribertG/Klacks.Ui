// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Display rules for missed schedule-command wishes: the planner's own keyword label for a backend keyword name, the
 * i18n key of how a wish was missed, whether a wish evaluation has anything to show, and the employee name of a wish
 * (the server's name, else the loaded employees, else the unknown-employee text).
 * @param keyword - Backend keyword name (Free, NotFree, OnlyEarly, NoEarly, OnlyLate, NoLate, OnlyNight, NoNight)
 * @param labels - The configured schedule-command keywords of the installation
 * @param outcome - Backend outcome name (BrokenFree, BrokenOnly, BrokenNo, Unfulfilled)
 * @param clients - Employees whose display names are used when an item carries no usable server name
 * @param unknownName - Name shown for an employee not among the clients
 */

import {
  KEYWORD_WISH_OUTCOME_KEYS,
  KEYWORD_WISH_OUTCOME_UNKNOWN_KEY,
  SCHEDULE_COMMAND_KEYWORD,
} from 'src/app/domain/constants/keyword-wish.constants';
import { KeywordWishes } from 'src/app/domain/models/schedule/keyword-wishes.interface';
import { KeywordWishItem } from 'src/app/domain/models/schedule/keyword-wish-item.interface';
import { KeywordWishRow } from 'src/app/domain/models/schedule/keyword-wish-row.interface';
import { formatClientDisplayName } from 'src/app/domain/helpers/client-name.helper';
import { ISchedulingDefaultSettings } from 'src/app/domain/models/settings/scheduling-default-settings.interface';

export type ScheduleCommandKeywordLabels = Pick<
  ISchedulingDefaultSettings,
  | 'commandKeywordFree'
  | 'commandKeywordNegFree'
  | 'commandKeywordEarly'
  | 'commandKeywordNegEarly'
  | 'commandKeywordLate'
  | 'commandKeywordNegLate'
  | 'commandKeywordNight'
  | 'commandKeywordNegNight'
>;

export function scheduleCommandKeywordLabel(keyword: string, labels: ScheduleCommandKeywordLabels): string {
  switch (keyword) {
    case SCHEDULE_COMMAND_KEYWORD.Free:
      return labels.commandKeywordFree;
    case SCHEDULE_COMMAND_KEYWORD.NotFree:
      return labels.commandKeywordNegFree;
    case SCHEDULE_COMMAND_KEYWORD.OnlyEarly:
      return labels.commandKeywordEarly;
    case SCHEDULE_COMMAND_KEYWORD.NoEarly:
      return labels.commandKeywordNegEarly;
    case SCHEDULE_COMMAND_KEYWORD.OnlyLate:
      return labels.commandKeywordLate;
    case SCHEDULE_COMMAND_KEYWORD.NoLate:
      return labels.commandKeywordNegLate;
    case SCHEDULE_COMMAND_KEYWORD.OnlyNight:
      return labels.commandKeywordNight;
    case SCHEDULE_COMMAND_KEYWORD.NoNight:
      return labels.commandKeywordNegNight;
    default:
      return keyword;
  }
}

export function keywordWishOutcomeKey(outcome: string): string {
  return KEYWORD_WISH_OUTCOME_KEYS[outcome] ?? KEYWORD_WISH_OUTCOME_UNKNOWN_KEY;
}

export function brokenKeywordWishCount(wishes: KeywordWishes | null | undefined): number {
  return wishes ? wishes.brokenFree + wishes.brokenOnly + wishes.brokenNo : 0;
}

export function hasKeywordWishes(wishes: KeywordWishes | null | undefined): boolean {
  return !!wishes && (brokenKeywordWishCount(wishes) > 0 || wishes.unfulfilled > 0 || wishes.items.length > 0);
}

export function toKeywordWishRows(
  items: readonly KeywordWishItem[],
  clients: readonly (Parameters<typeof formatClientDisplayName>[0] & { id: string })[],
  unknownName: string,
): KeywordWishRow[] {
  const names = new Map(clients.map((client) => [client.id, formatClientDisplayName(client)]));
  return items.map((item) => ({
    clientName: serverClientName(item) ?? (names.get(item.clientId) || unknownName),
    date: item.date,
    keyword: item.keyword,
    outcome: item.outcome,
  }));
}

function serverClientName(item: KeywordWishItem): string | null {
  const name = item.clientName?.trim();
  if (!name || name.toLowerCase() === item.clientId.toLowerCase()) {
    return null;
  }
  return name;
}

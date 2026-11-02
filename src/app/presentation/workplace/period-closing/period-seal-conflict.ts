// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Reads the 409 answers of a period seal. errorCountToReconfirm decides whether a failed seal should be re-offered
 * for confirmation, and with which error count: it returns undefined when it must not - anything but a 409, the
 * conflict about unconfirmed services (which no confirmation lifts), or a repeated refusal reporting the very count
 * that was just confirmed, which would loop forever. A 409 without a machine-readable count comes from a backend that
 * does not re-check and is confirmed the legacy way (count null). parseUnsealedWorksConflict reads the conflict about
 * unconfirmed services, unsealedWorksMessage turns it into the sentence shown to the user.
 * @param err - The failed HTTP response
 * @param acknowledgeViolations - Whether this attempt already carried a confirmation
 * @param acknowledgedErrorCount - The count that confirmation was issued for
 */

import { TranslateService } from '@ngx-translate/core';
import { CalendarDateToStringShort } from 'src/app/domain/helpers/date.helper';
import { UnsealedWorksConflict } from 'src/app/domain/models/period-closing/unsealed-works-conflict.interface';
import { UnsealedWork } from 'src/app/domain/models/period-closing/unsealed-work.interface';

const HTTP_STATUS_CONFLICT = 409;
const MAX_LISTED_WORKS = 5;
const HOUR_MINUTE_LENGTH = 5;
export const UNSEALED_WORKS_ERROR_CODE = 'PERIOD_UNSEALED_WORKS';

interface SealConflictBody {
  detail?: string;
  message?: string;
  errorCode?: string;
  currentErrorCount?: number;
  unsealedWorkCount?: number;
  works?: UnsealedWork[];
}

type SealFailure = { status?: number; error?: SealConflictBody } | null | undefined;

export function errorCountToReconfirm(
  err: SealFailure,
  acknowledgeViolations: boolean,
  acknowledgedErrorCount: number | null,
): number | null | undefined {
  if (err?.status !== HTTP_STATUS_CONFLICT || err?.error?.errorCode === UNSEALED_WORKS_ERROR_CODE) {
    return undefined;
  }
  const reported = err?.error?.currentErrorCount;
  const currentErrorCount = typeof reported === 'number' ? reported : null;
  if (!acknowledgeViolations) {
    return currentErrorCount;
  }
  return currentErrorCount !== null && currentErrorCount !== acknowledgedErrorCount ? currentErrorCount : undefined;
}

export function parseUnsealedWorksConflict(err: SealFailure): UnsealedWorksConflict | null {
  if (err?.status !== HTTP_STATUS_CONFLICT || err.error?.errorCode !== UNSEALED_WORKS_ERROR_CODE) {
    return null;
  }
  return {
    count: err.error.unsealedWorkCount ?? 0,
    works: err.error.works ?? [],
  };
}

export function unsealedWorksMessage(conflict: UnsealedWorksConflict, translate: TranslateService): string {
  const shown = conflict.works.slice(0, MAX_LISTED_WORKS);
  const lines = shown.map(
    (work) =>
      `${CalendarDateToStringShort(work.date)} ${work.startTime.slice(0, HOUR_MINUTE_LENGTH)}-${work.endTime.slice(0, HOUR_MINUTE_LENGTH)} ${work.shiftName} (${work.clientName})`,
  );
  const hidden = conflict.count - shown.length;
  if (hidden > 0) {
    lines.push(translate.instant('periodClosing.error.unsealedWorksMore', { count: hidden }));
  }
  return translate.instant('periodClosing.error.unsealedWorks', { count: conflict.count, list: lines.join('; ') });
}

export function sealErrorMessage(err: (SealFailure & { message?: string }) | null, translate: TranslateService): string {
  const unsealed = parseUnsealedWorksConflict(err);
  if (unsealed) {
    return unsealedWorksMessage(unsealed, translate);
  }
  return err?.error?.detail ?? err?.error?.message ?? err?.message ?? 'Error';
}

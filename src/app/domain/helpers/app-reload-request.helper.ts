// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Combines reload requests that arrive while an earlier one is still pending, so the user sees one
 * toast for one reason. A chunk failure outranks a new version, which outranks the end of an outage;
 * a target URL of the same reason is kept when the newer request has none. If either request forbids
 * the automatic reload, the combined one does too - except when both are version requests, where the
 * incoming (newer build) permission wins, so a later build can lift the loop guard's block on an earlier one.
 * @param current - Request that is pending
 * @param incoming - Request that just arrived
 */
import { AppReloadReason } from 'src/app/domain/enums/app-reload-reason.enum';
import { IAppReloadRequest } from 'src/app/domain/interfaces/app-reload-request.interface';

const REASON_PRIORITY: Readonly<Record<AppReloadReason, number>> = {
  [AppReloadReason.Outage]: 1,
  [AppReloadReason.Version]: 2,
  [AppReloadReason.Chunk]: 3,
};

function mergeAutoReloadAllowed(current: IAppReloadRequest, incoming: IAppReloadRequest): boolean {
  if (current.reason === AppReloadReason.Version && incoming.reason === AppReloadReason.Version) {
    return incoming.autoReloadAllowed;
  }
  return current.autoReloadAllowed && incoming.autoReloadAllowed;
}

export function mergeReloadRequests(current: IAppReloadRequest, incoming: IAppReloadRequest): IAppReloadRequest {
  const incomingWins = REASON_PRIORITY[incoming.reason] >= REASON_PRIORITY[current.reason];
  const primary = incomingWins ? incoming : current;
  const secondary = incomingWins ? current : incoming;
  const targetUrl = primary.targetUrl ?? (secondary.reason === primary.reason ? secondary.targetUrl : undefined);

  return {
    reason: primary.reason,
    targetUrl,
    autoReloadAllowed: mergeAutoReloadAllowed(current, incoming),
  };
}

export function isSameReloadRequest(first: IAppReloadRequest, second: IAppReloadRequest): boolean {
  return (
    first.reason === second.reason &&
    first.targetUrl === second.targetUrl &&
    first.autoReloadAllowed === second.autoReloadAllowed
  );
}

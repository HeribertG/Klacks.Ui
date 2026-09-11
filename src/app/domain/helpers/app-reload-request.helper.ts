// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Combines reload requests that arrive while an earlier one is still pending, so the user sees one
 * toast for one reason. A chunk failure outranks a new version, which outranks the end of an outage;
 * a target URL of the same reason is kept when the newer request has none; if either request forbids
 * the automatic reload, the combined one does too.
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

export function mergeReloadRequests(current: IAppReloadRequest, incoming: IAppReloadRequest): IAppReloadRequest {
  const incomingWins = REASON_PRIORITY[incoming.reason] >= REASON_PRIORITY[current.reason];
  const primary = incomingWins ? incoming : current;
  const secondary = incomingWins ? current : incoming;
  const targetUrl = primary.targetUrl ?? (secondary.reason === primary.reason ? secondary.targetUrl : undefined);

  return {
    reason: primary.reason,
    targetUrl,
    autoReloadAllowed: current.autoReloadAllowed && incoming.autoReloadAllowed,
  };
}

export function isSameReloadRequest(first: IAppReloadRequest, second: IAppReloadRequest): boolean {
  return (
    first.reason === second.reason &&
    first.targetUrl === second.targetUrl &&
    first.autoReloadAllowed === second.autoReloadAllowed
  );
}

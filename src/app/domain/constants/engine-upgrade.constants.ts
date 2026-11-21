// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Constants of the PostgreSQL engine upgrade on the Software Updates card: the Api path (also kept quiet in the HTTP
 * interceptor, because the card reports every refusal itself), the translation keys and the text per blocked reason.
 */
import { EngineUpgradeBlockedReason } from 'src/app/domain/models/settings/engine-upgrade-blocked-reason.enum';

export const ENGINE_UPGRADE_API_PATH = 'update/EngineUpgrade';

export const ENGINE_UPGRADE_MAJOR_PARAM = 'major';

export const ENGINE_UPGRADE_KEYS = {
  TITLE: 'settings.updates.engine.title',
  CURRENT: 'settings.updates.engine.current',
  AVAILABLE: 'settings.updates.engine.available',
  UP_TO_DATE: 'settings.updates.status.upToDate',
  BUTTON: 'settings.updates.engine.button',
  CONFIRM_TITLE: 'settings.updates.engine.confirm.title',
  CONFIRM_MESSAGE: 'settings.updates.engine.confirm.message',
  CONFIRM_ACTION: 'settings.updates.engine.confirm.action',
  CANCEL: 'cancel',
  ENQUEUED: 'settings.updates.engine.enqueued',
  FAILED: 'settings.updates.engine.failed',
  RUNNING: 'settings.updates.engine.running',
} as const;

export const ENGINE_UPGRADE_REASON_KEYS: Readonly<Record<EngineUpgradeBlockedReason, string>> = {
  [EngineUpgradeBlockedReason.NoEngineInManifest]: 'settings.updates.engine.reason.NoEngineInManifest',
  [EngineUpgradeBlockedReason.NoArtifactForInstallation]: 'settings.updates.engine.reason.NoArtifactForInstallation',
  [EngineUpgradeBlockedReason.NotNewerThanCurrent]: 'settings.updates.engine.reason.NotNewerThanCurrent',
  [EngineUpgradeBlockedReason.OperationInProgress]: 'settings.updates.engine.reason.OperationInProgress',
  [EngineUpgradeBlockedReason.UpdaterCapabilityMissing]: 'settings.updates.engine.reason.UpdaterCapabilityMissing',
  [EngineUpgradeBlockedReason.UpdaterCapabilityStale]: 'settings.updates.engine.reason.UpdaterCapabilityStale',
};

export const ENGINE_UP_TO_DATE_REASONS: readonly EngineUpgradeBlockedReason[] = [
  EngineUpgradeBlockedReason.NoEngineInManifest,
  EngineUpgradeBlockedReason.NotNewerThanCurrent,
];

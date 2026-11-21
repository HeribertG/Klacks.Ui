// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export enum EngineUpgradeBlockedReason {
  NoEngineInManifest = 'NoEngineInManifest',
  NoArtifactForInstallation = 'NoArtifactForInstallation',
  NotNewerThanCurrent = 'NotNewerThanCurrent',
  OperationInProgress = 'OperationInProgress',
  UpdaterCapabilityMissing = 'UpdaterCapabilityMissing',
  UpdaterCapabilityStale = 'UpdaterCapabilityStale',
}

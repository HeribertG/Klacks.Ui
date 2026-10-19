// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Klacksy in-page target ids of the ERP drop-points card that sit inside one of its page tabs.
 * The ids are the plain DOM ids the knowledge doc 23-page-settings-erp-drop-points.md hands the model;
 * a KLACKSY_TARGET_REQUESTED for one of them switches the card to the tab that renders it.
 */

export type ErpDropPointsPageTab = 'list' | 'manual';

const ERP_DROP_POINTS_TARGET_PREFIX = 'erp-drop-points-';

export const ERP_DROP_POINTS_TAB_TARGETS: Readonly<Record<string, ErpDropPointsPageTab>> = {
  [`${ERP_DROP_POINTS_TARGET_PREFIX}schedule-cron`]: 'list',
  [`${ERP_DROP_POINTS_TARGET_PREFIX}schedule-cron-error`]: 'list',
  [`${ERP_DROP_POINTS_TARGET_PREFIX}schedule-timezone`]: 'list',
  [`${ERP_DROP_POINTS_TARGET_PREFIX}import-enabled`]: 'list',
  [`${ERP_DROP_POINTS_TARGET_PREFIX}run-import-btn`]: 'list',
  [`${ERP_DROP_POINTS_TARGET_PREFIX}upload-zone`]: 'list',
  [`${ERP_DROP_POINTS_TARGET_PREFIX}download-sample-btn`]: 'manual',
};

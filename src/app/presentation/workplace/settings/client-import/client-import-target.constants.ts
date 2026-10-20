// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Klacksy in-page target ids of the employee import. The card targets live in one of the two card tabs (import or
 * manual), a KLACKSY_TARGET_REQUESTED for one of them switches the card to that tab. The modal targets only exist while
 * the import modal is open (mapping, preview, result); a request for one of them reopens the modal when a parsed file
 * is still held. The literal ids in the templates (data-klacksy-target) stay the source of truth for the manifest scan.
 */

import { ClientImportPageTab } from './client-import-page-tab.enum';

export const CLIENT_IMPORT_CARD_TAB_TARGETS: Readonly<Record<string, ClientImportPageTab>> = {
  'client-import-drop-zone': ClientImportPageTab.Import,
  'client-import-template-button': ClientImportPageTab.Import,
  'client-import-tab-import': ClientImportPageTab.Import,
  'client-import-manual': ClientImportPageTab.Manual,
  'client-import-tab-manual': ClientImportPageTab.Manual,
};

export const CLIENT_IMPORT_MODAL_TARGETS: ReadonlySet<string> = new Set([
  'client-import-steps',
  'client-import-mapping-table',
  'client-import-policy',
  'client-import-to-preview',
  'client-import-preview-table',
  'client-import-commit',
  'client-import-to-list',
]);

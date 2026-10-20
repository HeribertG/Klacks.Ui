// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Klacksy in-page target ids of the employee import that only exist in its file step.
 * The literal ids in the templates (data-klacksy-target) stay the source of truth for the manifest scan; this set only
 * names the ones a KLACKSY_TARGET_REQUESTED handler has to bring back on screen after a finished import.
 */

export const CLIENT_IMPORT_FILE_STEP_TARGETS: ReadonlySet<string> = new Set([
  'client-import-drop-zone',
  'client-import-template-button',
]);

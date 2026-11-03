// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * A refusal the server tagged with a code, explained in the user's language.
 * @param key - Translation key of the explanation
 * @param name - Toast name, so the same refusal never stacks
 */
export interface CodedRefusalToast {
  key: string;
  name: string;
}

// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * One qualification as the placeholder pull-down shows it.
 * @param id - Id of the qualification
 * @param name - Name in the user's language
 * @param emoji - Symbol of the qualification, empty when it has none
 */
export interface QualificationOption {
  id: string;
  name: string;
  emoji: string;
}

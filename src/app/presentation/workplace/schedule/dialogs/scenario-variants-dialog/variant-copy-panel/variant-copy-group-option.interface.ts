// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * A group the sealed orders of can be copied into a key: the key's group or one of its subgroups.
 * @param id - Group id sent as the source group of the copy
 * @param name - Name shown in the group choice
 */
export interface IVariantCopyGroupOption {
  id: string;
  name: string;
}

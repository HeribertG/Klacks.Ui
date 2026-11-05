// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/** Kind of a node in the inbox group tree; the backend sends the enum EmailGroupNodeType as its integer value. */
export enum EmailGroupNodeType {
  Group = 0,
  Client = 1,
}

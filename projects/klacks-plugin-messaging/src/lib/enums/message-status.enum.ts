// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Delivery status of a messaging message.
 */
export enum MessageStatus {
  Pending = 0,
  Sent = 1,
  Delivered = 2,
  Read = 3,
  Failed = 4,
}

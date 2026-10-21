// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface QueueEntry { method: (...args: any[]) => any; args: any[] }

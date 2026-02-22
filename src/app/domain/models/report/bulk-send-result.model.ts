// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface BulkSendResult {
  success: number;
  failed: number;
  noEmail: number;
  errors: { clientName: string; error: string }[];
}

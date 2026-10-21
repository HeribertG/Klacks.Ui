// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface TtsSynthesizeRequest {
  text: string;
  locale: string;
  providerId?: string;
  voiceId?: string;
}

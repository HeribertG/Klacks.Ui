// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ISuggestedReply } from 'src/app/domain/models/assistant/suggested-reply.interface';

export interface IWelcomeFocusToast {
  prompt: string;
  options: ISuggestedReply[];
}

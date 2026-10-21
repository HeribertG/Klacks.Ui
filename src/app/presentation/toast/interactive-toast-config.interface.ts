// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ISuggestedRepliesConfig } from 'src/app/domain/models/assistant/suggested-replies-config.interface';

export interface IInteractiveToastConfig {
  repliesConfig: ISuggestedRepliesConfig;
  onSelected: (values: string[]) => void;
  onDismissed?: () => void;
}

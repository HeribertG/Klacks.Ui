// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IScriptMessage } from './script-message.interface';

export interface IScriptResult {
  success: boolean;
  error?: { description: string } | null;
  messages: IScriptMessage[];
}

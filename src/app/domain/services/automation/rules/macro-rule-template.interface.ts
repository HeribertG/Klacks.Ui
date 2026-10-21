// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IMacroRuleTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category: 'workquant' | 'pause' | 'hours' | 'sequence';
}

// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IAssistantPageContext {
  currentRoute?: string;
  selectedGroupId?: string;
  selectedPeriodFrom?: string;
  selectedPeriodUntil?: string;
  selectedClientId?: string;
  selectedClientIds?: string[];
  selectedEntityType?: string;
}

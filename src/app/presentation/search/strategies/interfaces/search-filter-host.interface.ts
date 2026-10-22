// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface SearchFilterHost {
  currentFilter: { searchString: string };
  onExternalFilterChange?: () => void;
}

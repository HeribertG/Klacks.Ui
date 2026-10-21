// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export type UiActionType =
  | 'navigate'
  | 'waitForElement'
  | 'setValue'
  | 'setSelect'
  | 'click'
  | 'scrollTo'
  | 'delay'
  | 'poll'
  | 'readValue'
  | 'conditional'
  | 'apiCall'
  | 'search'
  | 'selectGroup';

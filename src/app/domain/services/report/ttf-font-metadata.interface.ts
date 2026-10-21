// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface TtfFontMetadata {
  cmap: { unicode: { codeMap: Record<number, number> } };
  toUnicode: Record<number, number>;
}

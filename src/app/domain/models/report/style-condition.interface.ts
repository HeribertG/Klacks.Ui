// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Conditional formatting rule. The expression is evaluated per row with the
 * Klacks script engine and has to emit a truthy value via `output 1, <expression>`.
 */
export interface StyleCondition {
  expression: string;
  textColor?: string;
  backgroundColor?: string;
  bold?: boolean;
  italic?: boolean;
}

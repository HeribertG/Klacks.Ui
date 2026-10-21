// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface RuleFormModel {
  name: string;
  rule: string;
  subRule: string;
  description: string;
  isMandatory: boolean;
  isPaid: boolean;
}

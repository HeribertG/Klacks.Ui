// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * One formatted label-value row in a scheduling rule's expanded detail list.
 * @param labelKey - i18n key for the row label
 * @param value - Already-formatted display value (percent, HH:mm, or plain number as string)
 */
export interface IIndustryTemplateRuleDetailRow {
  labelKey: string;
  value: string;
}

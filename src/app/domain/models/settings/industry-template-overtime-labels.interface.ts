// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Pre-translated display labels for a scheduling rule's overtime enum fields, resolved by
 * the component (which has TranslateService) before being passed into the pure
 * buildSchedulingRuleDetailGroups() helper.
 * @param overtimeBasisLabel - Translated label for overtimeBasis ("Day" | "Week"), or null
 * @param overtimeRateModeLabel - Translated label for overtimeRateMode, or null
 */
export interface IIndustryTemplateOvertimeLabels {
  overtimeBasisLabel: string | null;
  overtimeRateModeLabel: string | null;
}

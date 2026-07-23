// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Summary of how many customer-owned scheduling rules currently exist, used to gate the
 * "custom planning rule" option in the Active Industries settings card: selecting it must not
 * be persisted while no custom rule exists yet, since that would hide every industry preset
 * without anything to replace it.
 * @param customSchedulingRuleCount - Number of customer-owned scheduling rules currently stored
 */
export interface IIndustryCustomRulesSummary {
  customSchedulingRuleCount: number;
}

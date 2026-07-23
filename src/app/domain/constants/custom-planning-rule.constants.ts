// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Sentinel value for the "custom planning rule" option in the Active Industries settings
 * card. Stored in the same ACTIVE_INDUSTRIES setting as the five industry slugs from
 * IndustrySlugs, but intentionally not part of that constant: it has no counterpart in
 * Klacks.Api Domain/Constants/IndustrySlugs.cs and no industry template preview, since it
 * means the company runs a bespoke scheduling rule instead of a shipped industry preset.
 */

export const CUSTOM_PLANNING_RULE_SLUG = 'custom';

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * The six canonical industry slugs all shipped region-setup content is written against,
 * mirroring Klacks.Api Domain/Constants/IndustrySlugs.cs (ACTIVE_INDUSTRIES setting values).
 * @param All - Canonical ordering of the six slugs, used as the "all industries active" default
 * @param Separator - Separator used when the slug list is stored as a single setting value
 */

const HOMECARE = 'homecare';
const HEALTHCARE = 'healthcare';
const SECURITY = 'security';
const FACILITY = 'facility';
const LOGISTICS = 'logistics';
const HOSPITALITY = 'hospitality';

export const IndustrySlugs = {
  Homecare: HOMECARE,
  Healthcare: HEALTHCARE,
  Security: SECURITY,
  Facility: FACILITY,
  Logistics: LOGISTICS,
  Hospitality: HOSPITALITY,
  All: [HOMECARE, HEALTHCARE, SECURITY, FACILITY, LOGISTICS, HOSPITALITY] as readonly string[],
  Separator: ',',
} as const;

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * The five canonical industry slugs all shipped region-setup content is written against,
 * mirroring Klacks.Api Domain/Constants/IndustrySlugs.cs (ACTIVE_INDUSTRIES setting values).
 * @param All - Canonical ordering of the five slugs, used as the "all industries active" default
 * @param Separator - Separator used when the slug list is stored as a single setting value
 */

const HOMECARE = 'homecare';
const HEALTHCARE = 'healthcare';
const SECURITY = 'security';
const FACILITY = 'facility';
const LOGISTICS = 'logistics';

export const IndustrySlugs = {
  Homecare: HOMECARE,
  Healthcare: HEALTHCARE,
  Security: SECURITY,
  Facility: FACILITY,
  Logistics: LOGISTICS,
  All: [HOMECARE, HEALTHCARE, SECURITY, FACILITY, LOGISTICS] as readonly string[],
  Separator: ',',
} as const;

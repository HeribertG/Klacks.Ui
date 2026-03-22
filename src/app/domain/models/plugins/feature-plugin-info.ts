// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Feature plugin information model matching backend FeaturePluginInfo DTO.
 */
export interface FeaturePluginInfo {
  name: string;
  displayName: string;
  category: string;
  version: string;
  author: string;
  description: string;
  minKlacksVersion: string;
  isInstalled: boolean;
  isEnabled: boolean;
  providedSkills: string[];
}

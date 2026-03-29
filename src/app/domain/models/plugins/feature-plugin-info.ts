// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Feature plugin information model matching backend FeaturePluginInfo DTO.
 */
import { PluginNavigationManifest } from './plugin-nav-item';

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
  isOperational: boolean;
  providedSkills: string[];
  navigation?: PluginNavigationManifest;
}

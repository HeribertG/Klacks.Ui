// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Feature plugin information model matching backend FeaturePluginInfo DTO.
 */
import { PluginNavigationManifest } from './plugin-nav-item';
import { FeaturePluginAssistantSetup } from './feature-plugin-assistant-setup';

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
  assistantSetup?: FeaturePluginAssistantSetup | null;
}

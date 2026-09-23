// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Manifest-declared offer to have Klacksy guide the admin through commissioning a feature plugin
 * that was just installed or enabled, matching the backend's FeaturePluginAssistantSetup. All four
 * translation keys are delivered by the manifest explicitly - none is derived from another.
 */
export interface FeaturePluginAssistantSetup {
  offerKey: string;
  acceptKey: string;
  declineKey: string;
  triggerPhraseKey: string;
}

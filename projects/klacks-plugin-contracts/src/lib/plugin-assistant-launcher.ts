// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Abstraction letting a plugin (or the host itself) ask Klacksy to offer its commissioning help,
 * without the plugin depending on the host's toast, aside or conversation services directly.
 * @param setup - The offer's explicit translation keys (offer text, accept/decline labels, trigger phrase)
 * @param oncePerSessionKey - Key gating the offer to once per browser session, distinct per caller
 */
import { IPluginAssistantSetupOffer } from './plugin-assistant-setup-offer';

export interface IPluginAssistantLauncher {
  offerSetupHelp(setup: IPluginAssistantSetupOffer, oncePerSessionKey: string): void;
}

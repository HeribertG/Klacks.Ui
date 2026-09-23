// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Explicit set of translation keys for a single Klacksy commissioning offer. Deliberately carries
 * no naming convention to derive accept/decline keys from - the caller (backend manifest or plugin
 * component) states each key outright, so nothing here has to guess where one prefix ends and the
 * next segment begins.
 * @param offerKey - Translation key for the offer prompt shown in the interactive toast
 * @param acceptKey - Translation key for the accept chip's label
 * @param declineKey - Translation key for the decline chip's label
 * @param triggerPhraseKey - Translation key for the phrase submitted to Klacksy once accepted
 */
export interface IPluginAssistantSetupOffer {
  offerKey: string;
  acceptKey: string;
  declineKey: string;
  triggerPhraseKey: string;
}

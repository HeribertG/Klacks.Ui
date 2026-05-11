// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Public API for klacks-plugin-contracts.
 * Defines shared interfaces and InjectionTokens for plugin-host communication.
 */

export { IPluginWorkplaceHost } from './lib/plugin-workplace-host';
export { IPluginClient } from './lib/plugin-client';
export { IPluginToastService } from './lib/plugin-toast';
export { IPluginManualLoader } from './lib/plugin-manual-loader';
export { IPluginVoiceService, IPluginSpeechService, IPluginVoiceCallbacks } from './lib/plugin-voice';
export { PluginEventStream } from './lib/plugin-event-stream';
export { IPluginGroupSelection } from './lib/plugin-group-selection';
export {
  PLUGIN_WORKPLACE_HOST,
  PLUGIN_TOAST_SERVICE,
  PLUGIN_MANUAL_LOADER,
  PLUGIN_EVENT_STREAM,
  PLUGIN_API_BASE_URL,
  PLUGIN_VOICE_SERVICE,
  PLUGIN_SPEECH_SERVICE,
  PLUGIN_GROUP_SELECTION,
} from './lib/tokens';

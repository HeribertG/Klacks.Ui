// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Public API for klacks-plugin-contracts.
 * Defines shared interfaces and InjectionTokens for plugin-host communication.
 */

export { IPluginWorkplaceHost } from './lib/plugin-workplace-host';
export { IPluginClient } from './lib/plugin-client';
export { IPluginToastService } from './lib/plugin-toast';
export { IPluginManualLoader } from './lib/plugin-manual-loader';
export { IPluginVoiceService } from './lib/plugin-voice';
export { IPluginSpeechService } from './lib/plugin-speech-service.interface';
export { IPluginVoiceCallbacks } from './lib/plugin-voice-callbacks.interface';
export { PluginEventStream } from './lib/plugin-event-stream';
export { IPluginGroupSelection } from './lib/plugin-group-selection';
export { IPluginAssistantLauncher } from './lib/plugin-assistant-launcher';
export { IPluginAssistantSetupOffer } from './lib/plugin-assistant-setup-offer';
export { IPluginShift } from './lib/plugin-shift.interface';
export { PluginShiftKind } from './lib/plugin-shift-kind.type';
export { IPluginShiftQuery } from './lib/plugin-shift-query.interface';
export { IPluginShiftCatalog } from './lib/plugin-shift-catalog.interface';
export { IPluginWorkScheduleQuery } from './lib/plugin-work-schedule-query.interface';
export { IPluginScheduledWork } from './lib/plugin-scheduled-work.interface';
export { IPluginScheduledClient } from './lib/plugin-scheduled-client.interface';
export { IPluginScheduledWorks } from './lib/plugin-scheduled-works.interface';
export { IPluginWorkScheduleReader } from './lib/plugin-work-schedule-reader.interface';
export { IPluginClientCommunication } from './lib/plugin-client-communication.interface';
export { IPluginClientImage } from './lib/plugin-client-image.interface';
export { IPluginClientDetails } from './lib/plugin-client-details.interface';
export { IPluginClientDetailsReader } from './lib/plugin-client-details-reader.interface';
export { IPluginDeleteConfirmation } from './lib/plugin-delete-confirmation.interface';
export {
  PLUGIN_WORKPLACE_HOST,
  PLUGIN_TOAST_SERVICE,
  PLUGIN_MANUAL_LOADER,
  PLUGIN_EVENT_STREAM,
  PLUGIN_API_BASE_URL,
  PLUGIN_BACKEND_API_URL,
  PLUGIN_VOICE_SERVICE,
  PLUGIN_SPEECH_SERVICE,
  PLUGIN_GROUP_SELECTION,
  PLUGIN_ASSISTANT_LAUNCHER,
  PLUGIN_SHIFT_CATALOG,
  PLUGIN_WORK_SCHEDULE_READER,
  PLUGIN_CLIENT_DETAILS_READER,
  PLUGIN_DELETE_CONFIRMATION,
} from './lib/tokens';

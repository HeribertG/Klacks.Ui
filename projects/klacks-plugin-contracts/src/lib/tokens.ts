// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * InjectionTokens for plugin-host communication.
 * Host app provides concrete implementations via route-level providers.
 */

import { InjectionToken } from '@angular/core';
import { IPluginWorkplaceHost } from './plugin-workplace-host';
import { IPluginToastService } from './plugin-toast';
import { IPluginManualLoader } from './plugin-manual-loader';
import { IPluginVoiceService, IPluginSpeechService } from './plugin-voice';
import { PluginEventStream } from './plugin-event-stream';
import { IPluginGroupSelection } from './plugin-group-selection';

export const PLUGIN_WORKPLACE_HOST = new InjectionToken<IPluginWorkplaceHost>('PLUGIN_WORKPLACE_HOST');
export const PLUGIN_TOAST_SERVICE = new InjectionToken<IPluginToastService>('PLUGIN_TOAST_SERVICE');
export const PLUGIN_MANUAL_LOADER = new InjectionToken<IPluginManualLoader>('PLUGIN_MANUAL_LOADER');
export const PLUGIN_EVENT_STREAM = new InjectionToken<PluginEventStream>('PLUGIN_EVENT_STREAM');
export const PLUGIN_API_BASE_URL = new InjectionToken<string>('PLUGIN_API_BASE_URL');
export const PLUGIN_VOICE_SERVICE = new InjectionToken<IPluginVoiceService>('PLUGIN_VOICE_SERVICE');
export const PLUGIN_SPEECH_SERVICE = new InjectionToken<IPluginSpeechService>('PLUGIN_SPEECH_SERVICE');
export const PLUGIN_GROUP_SELECTION = new InjectionToken<IPluginGroupSelection>('PLUGIN_GROUP_SELECTION');

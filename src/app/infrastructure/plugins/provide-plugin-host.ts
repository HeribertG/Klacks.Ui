// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Provider factories for plugin host services.
 * Used in route configurations to supply concrete implementations for plugin tokens.
 * @param providePluginHost - Provides generic host services all plugins need
 * @param provideMessagingVoice - Provides messaging-specific services (voice, speech)
 */

import { Provider } from '@angular/core';
import {
  PLUGIN_WORKPLACE_HOST,
  PLUGIN_TOAST_SERVICE,
  PLUGIN_MANUAL_LOADER,
  PLUGIN_EVENT_STREAM,
  PLUGIN_API_BASE_URL,
  PLUGIN_VOICE_SERVICE,
  PLUGIN_SPEECH_SERVICE,
  IPluginWorkplaceHost,
} from 'klacks-plugin-contracts';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { SpeechRecognitionService } from 'src/app/presentation/aside/assistant-chat/services/speech-recognition.service';
import { VoiceModeService } from 'src/app/presentation/aside/assistant-chat/services/voice-mode.service';
import { environment } from 'src/environments/environment';

export function providePluginHost(): Provider[] {
  return [
    {
      provide: PLUGIN_WORKPLACE_HOST,
      useFactory: (
        workplaceState: WorkplaceStateService,
        layout: LayoutService,
        search: SearchService,
        savebar: SavebarService,
      ): IPluginWorkplaceHost => ({
        setActiveManagerByRoute: (route) => workplaceState.setActiveManagerByRoute(route),
        setContainerToNormalSize: () => layout.setContainerToNormalSize(),
        setSearchVisibility: (v) => search.setSearchVisibility(v),
        setSavebarVisibility: (v) => savebar.setSavebarVisibility(v),
        setClientSearchMode: (e) => search.setClientSearchMode(e),
        clientSelected$: search.clientSelected$,
      }),
      deps: [WorkplaceStateService, LayoutService, SearchService, SavebarService],
    },
    {
      provide: PLUGIN_TOAST_SERVICE,
      useExisting: ToastShowService,
    },
    {
      provide: PLUGIN_MANUAL_LOADER,
      useExisting: ManualLoaderService,
    },
    {
      provide: PLUGIN_EVENT_STREAM,
      useFactory: (signalR: AssistantSignalRService) => signalR.incomingMessage$,
      deps: [AssistantSignalRService],
    },
    {
      provide: PLUGIN_API_BASE_URL,
      useValue: environment.baseUrl.replace('backend/', ''),
    },
  ];
}

export function provideMessagingVoice(): Provider[] {
  return [
    {
      provide: PLUGIN_VOICE_SERVICE,
      useClass: VoiceModeService,
    },
    {
      provide: PLUGIN_SPEECH_SERVICE,
      useExisting: SpeechRecognitionService,
    },
  ];
}

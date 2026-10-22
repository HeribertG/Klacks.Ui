// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Provider factories for plugin host services (composition root: binds plugin tokens to services of every layer).
 * Used in route configurations to supply concrete implementations for plugin tokens.
 * @param providePluginHost - Provides generic host services all plugins need (workplace, toast, API URLs, read
 *   access to shifts, the work schedule and client details, and the host delete confirmation)
 * @param provideMessagingVoice - Provides messaging-specific services (voice, speech)
 */

import { Provider, computed } from '@angular/core';
import { map } from 'rxjs';
import {
  PLUGIN_WORKPLACE_HOST,
  PLUGIN_TOAST_SERVICE,
  PLUGIN_MANUAL_LOADER,
  PLUGIN_EVENT_STREAM,
  PLUGIN_API_BASE_URL,
  PLUGIN_VOICE_SERVICE,
  PLUGIN_SPEECH_SERVICE,
  PLUGIN_GROUP_SELECTION,
  PLUGIN_ASSISTANT_LAUNCHER,
  PLUGIN_BACKEND_API_URL,
  PLUGIN_SHIFT_CATALOG,
  PLUGIN_WORK_SCHEDULE_READER,
  PLUGIN_CLIENT_DETAILS_READER,
  PLUGIN_DELETE_CONFIRMATION,
  IPluginWorkplaceHost,
  IPluginGroupSelection,
  IPluginShiftCatalog,
  IPluginShiftQuery,
  IPluginWorkScheduleReader,
  IPluginClientDetailsReader,
} from 'klacks-plugin-contracts';
import { environment } from 'src/environments/environment';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { SpeechRecognitionService } from 'src/app/presentation/aside/assistant-chat/services/speech-recognition.service';
import { VoiceModeAdapterService } from 'src/app/presentation/aside/assistant-chat/services/voice-mode-adapter.service';
import { getApiRootUrl } from 'src/app/infrastructure/helpers/api-root-url.helper';
import { PluginSetupAssistantOfferService } from 'src/app/presentation/services/plugin-setup-assistant-offer.service';
import { PluginDeleteConfirmationService } from 'src/app/presentation/services/plugin-delete-confirmation.service';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
import { DataWorkScheduleService } from 'src/app/infrastructure/api/schedule/data-work-schedule.service';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { ShiftFilter } from 'src/app/domain/models/shift/shift-filter-class';
import { ShiftFilterType } from 'src/app/domain/enums/shift-filter-type.enum';
import { WorkScheduleEntryType } from 'src/app/domain/models/schedule/work-schedule-entry-type.enum';

export function toShiftFilter(query: IPluginShiftQuery): ShiftFilter {
  const shiftFilter = new ShiftFilter();
  shiftFilter.numberOfItemsPerPage = query.maxCount;
  shiftFilter.filterType = query.kind === 'container' ? ShiftFilterType.Container : ShiftFilterType.Shift;
  shiftFilter.activeDateRange = query.activeDateRange;
  shiftFilter.futureDateRange = query.futureDateRange;
  return shiftFilter;
}

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
        clientIdNumbersSelected$: search.clientIdNumbersSelected$,
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
      useValue: getApiRootUrl(),
    },
    {
      provide: PLUGIN_GROUP_SELECTION,
      useFactory: (groupSelection: GroupSelectionService): IPluginGroupSelection => {
        const selectedGroupId = computed<string | null>(() => {
          groupSelection.selectedGroupChanged();
          return groupSelection.selectedGroupId ?? null;
        });
        return {
          selectedGroupId,
          clearSelection: () => groupSelection.clearSelection(),
        };
      },
      deps: [GroupSelectionService],
    },
    {
      provide: PLUGIN_ASSISTANT_LAUNCHER,
      useExisting: PluginSetupAssistantOfferService,
    },
    {
      provide: PLUGIN_BACKEND_API_URL,
      useValue: environment.baseUrl,
    },
    {
      provide: PLUGIN_SHIFT_CATALOG,
      useFactory: (dataShift: DataShiftService): IPluginShiftCatalog => ({
        readShifts: (query) => dataShift.readShiftList(toShiftFilter(query)).pipe(map((list) => list.shifts ?? [])),
      }),
      deps: [DataShiftService],
    },
    {
      provide: PLUGIN_WORK_SCHEDULE_READER,
      useFactory: (dataWorkSchedule: DataWorkScheduleService): IPluginWorkScheduleReader => ({
        readScheduledWorks: (query) =>
          dataWorkSchedule.getWorkSchedule(query).pipe(
            map((response) => ({
              works: response.entries.filter((entry) => entry.entryType === WorkScheduleEntryType.Work),
              clients: response.clients,
            })),
          ),
      }),
      deps: [DataWorkScheduleService],
    },
    {
      provide: PLUGIN_CLIENT_DETAILS_READER,
      useFactory: (dataClient: DataClientService): IPluginClientDetailsReader => ({
        readClientDetails: (clientId) => dataClient.getClient(clientId),
      }),
      deps: [DataClientService],
    },
    {
      provide: PLUGIN_DELETE_CONFIRMATION,
      useExisting: PluginDeleteConfirmationService,
    },
  ];
}

export function provideMessagingVoice(): Provider[] {
  return [
    {
      provide: PLUGIN_VOICE_SERVICE,
      useClass: VoiceModeAdapterService,
    },
    {
      provide: PLUGIN_SPEECH_SERVICE,
      useExisting: SpeechRecognitionService,
    },
  ];
}

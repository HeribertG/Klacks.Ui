// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Route page of the employee import (Settings). Provides the page-scoped import state, registers Settings
 * as the active manager for savebar and search, and shows the step indicator plus the component of the current step
 * on the import tab and the import handbook on the manual tab. The import tab stays rendered while hidden, so switching
 * to the manual never loses an unfinished import; a Klacksy request for a control of the import brings that tab back.
 * When Klacksy points at a file-step control after a finished import, the page starts over at the file step; an
 * unfinished mapping or preview is never thrown away for it.
 * @param state - Page-scoped state machine of the import (File, Mapping, Preview, Result)
 * @param activeTab - Currently visible page tab (import or manual)
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { ClientImportStateService } from 'src/app/domain/services/client/client-import-state.service';
import { ClientImportStep } from 'src/app/domain/enums/client-import.enums';
import { RouteName } from 'src/app/domain/enums/entity-names.enum';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType, KlacksyTargetRequestedEvent } from 'src/app/domain/events/domain-events';
import { CLIENT_IMPORT_FILE_STEP_TARGETS } from '../client-import-target.constants';
import { ClientImportFileStepComponent } from '../client-import-file-step/client-import-file-step.component';
import { ClientImportMappingStepComponent } from '../client-import-mapping-step/client-import-mapping-step.component';
import { ClientImportPreviewStepComponent } from '../client-import-preview-step/client-import-preview-step.component';
import { ClientImportResultStepComponent } from '../client-import-result-step/client-import-result-step.component';
import { ClientImportManualComponent } from '../client-import-manual/client-import-manual.component';
import { ClientImportPageTab } from '../client-import-page-tab.enum';

const STEP_KEY_PREFIX = 'clientImport.step.';
const TAB_KEY_PREFIX = 'clientImport.tab.';
const TAB_ID_PREFIX = 'client-import-tab-';
const IMPORT_TARGET_PREFIX = 'client-import-';
const MANUAL_TARGET_PREFIX = 'client-import-manual';

@Component({
  selector: 'app-client-import-home',
  templateUrl: './client-import-home.component.html',
  styleUrls: ['./client-import-home.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    ClientImportFileStepComponent,
    ClientImportMappingStepComponent,
    ClientImportPreviewStepComponent,
    ClientImportResultStepComponent,
    ClientImportManualComponent,
  ],
  providers: [ClientImportStateService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientImportHomeComponent implements OnInit {
  readonly state = inject(ClientImportStateService);
  readonly Step = ClientImportStep;
  readonly steps: readonly ClientImportStep[] = Object.values(ClientImportStep);
  readonly stepKeyPrefix = STEP_KEY_PREFIX;
  readonly Tab = ClientImportPageTab;
  readonly tabs: readonly ClientImportPageTab[] = Object.values(ClientImportPageTab);
  readonly tabKeyPrefix = TAB_KEY_PREFIX;
  readonly tabIdPrefix = TAB_ID_PREFIX;
  readonly activeTab = signal<ClientImportPageTab>(ClientImportPageTab.Import);

  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private workplaceStateService = inject(WorkplaceStateService);
  private eventBus = inject(EVENT_BUS_TOKEN);
  private destroyRef = inject(DestroyRef);

  constructor() {
    this.eventBus
      .on<KlacksyTargetRequestedEvent>(DomainEventType.KLACKSY_TARGET_REQUESTED)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ target }) => {
        if (this.isImportTabTarget(target)) {
          this.activeTab.set(ClientImportPageTab.Import);
        }
        if (CLIENT_IMPORT_FILE_STEP_TARGETS.has(target) && this.state.step() === ClientImportStep.Result) {
          this.state.restart();
        }
      });
  }

  ngOnInit(): void {
    this.workplaceStateService.setActiveManagerByRoute(RouteName.SETTINGS);
    this.layoutService.setContainerToNormalSize();
    this.savebarService.setSavebarVisibility(false);
    this.searchService.setSearchVisibility(false);

    void this.state.initialize();
  }

  setTab(tab: ClientImportPageTab): void {
    this.activeTab.set(tab);
  }

  isStepDone(step: ClientImportStep): boolean {
    return this.steps.indexOf(step) < this.steps.indexOf(this.state.step());
  }

  private isImportTabTarget(target: string): boolean {
    return target.startsWith(IMPORT_TARGET_PREFIX)
      && !target.startsWith(TAB_ID_PREFIX)
      && !target.startsWith(MANUAL_TARGET_PREFIX);
  }
}

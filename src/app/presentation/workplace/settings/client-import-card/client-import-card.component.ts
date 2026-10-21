// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Settings card of the employee import (Excel/CSV) and host of its import state. The card has two tabs: Import (drop
 * zone, template download, privacy note) and Manual. A successfully read file opens a wide modal with the remaining
 * three steps (mapping & rules, preview, result) and a stacked modal with the manual. Closing the modal discards the
 * import immediately and starts over at the card, except while the commit is running. Contracts, groups and countries
 * are loaded once, on the first chosen file, so a plain settings visit costs nothing.
 * @param state - Card-scoped state machine of the import (File, Mapping, Preview, Result)
 * @param activeTab - Currently visible card tab (import or manual)
 */

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  TemplateRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ClientImportStateService } from 'src/app/domain/services/client/client-import-state.service';
import { ClientImportStep } from 'src/app/domain/enums/client-import.enums';
import {
  CLIENT_IMPORT_COUNT_KEYS,
  CLIENT_IMPORT_FILE_INPUT_ACCEPT,
} from 'src/app/domain/constants/client-import.constants';
import { clientImportFileErrorKey } from 'src/app/domain/services/client/client-import-error.helper';
import { clientImportCountKey } from 'src/app/domain/services/client/client-import-count-key.helper';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType } from 'src/app/domain/events/domain-events';
import { KlacksyTargetRequestedEvent } from 'src/app/domain/events/klacksy-target-requested-event.interface';
import { DragDropFileUploadDirective } from 'src/app/presentation/directives/drag-drop-file-upload.directive';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { triggerBlobDownload } from 'src/app/shared/helpers/file-download.helper';
import { ClientImportPageTab } from '../client-import/client-import-page-tab.enum';
import {
  CLIENT_IMPORT_CARD_TAB_TARGETS,
  CLIENT_IMPORT_MODAL_TARGETS,
} from '../client-import/client-import-target.constants';
import { ClientImportMappingStepComponent } from '../client-import/client-import-mapping-step/client-import-mapping-step.component';
import { ClientImportPreviewStepComponent } from '../client-import/client-import-preview-step/client-import-preview-step.component';
import { ClientImportResultStepComponent } from '../client-import/client-import-result-step/client-import-result-step.component';
import { ClientImportManualComponent } from '../client-import/client-import-manual/client-import-manual.component';
import {
  CLIENT_IMPORT_MANUAL_MODAL_TITLE_ID,
  CLIENT_IMPORT_MODAL_TITLE_ID,
  CLIENT_IMPORT_MODAL_WINDOW_CLASS,
} from './client-import-modal.constants';

const STEP_KEY_PREFIX = 'clientImport.step.';
const TAB_KEY_PREFIX = 'clientImport.tab.';
const TAB_ID_PREFIX = 'client-import-tab-';
const TEMPLATE_ERROR_KEY = 'clientImport.file.templateError';
const MODAL_STEPS: readonly ClientImportStep[] = [
  ClientImportStep.Mapping,
  ClientImportStep.Preview,
  ClientImportStep.Result,
];

@Component({
  selector: 'app-client-import-card',
  templateUrl: './client-import-card.component.html',
  styleUrls: ['./client-import-card.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    DragDropFileUploadDirective,
    ClientImportMappingStepComponent,
    ClientImportPreviewStepComponent,
    ClientImportResultStepComponent,
    ClientImportManualComponent,
  ],
  providers: [ClientImportStateService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientImportCardComponent implements OnDestroy {
  readonly state = inject(ClientImportStateService);
  readonly Step = ClientImportStep;
  readonly steps = MODAL_STEPS;
  readonly stepKeyPrefix = STEP_KEY_PREFIX;
  readonly Tab = ClientImportPageTab;
  readonly tabs: readonly ClientImportPageTab[] = Object.values(ClientImportPageTab);
  readonly tabKeyPrefix = TAB_KEY_PREFIX;
  readonly tabIdPrefix = TAB_ID_PREFIX;
  readonly accept = CLIENT_IMPORT_FILE_INPUT_ACCEPT;
  readonly countKeys = CLIENT_IMPORT_COUNT_KEYS;
  readonly countKey = clientImportCountKey;
  readonly modalTitleId = CLIENT_IMPORT_MODAL_TITLE_ID;
  readonly manualModalTitleId = CLIENT_IMPORT_MANUAL_MODAL_TITLE_ID;
  readonly activeTab = signal<ClientImportPageTab>(ClientImportPageTab.Import);

  readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');
  readonly importModal = viewChild.required<TemplateRef<unknown>>('importModal');
  readonly manualModal = viewChild.required<TemplateRef<unknown>>('manualModal');

  private ngbModal = inject(NgbModal);
  private translate = inject(TranslateService);
  private toastShowService = inject(ToastShowService);
  private navigationService = inject(NavigationService);
  private eventBus = inject(EVENT_BUS_TOKEN);
  private destroyRef = inject(DestroyRef);
  private modalRef: NgbModalRef | null = null;
  private manualModalRef: NgbModalRef | null = null;
  private lookups: Promise<void> | null = null;

  constructor() {
    this.eventBus
      .on<KlacksyTargetRequestedEvent>(DomainEventType.KLACKSY_TARGET_REQUESTED)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ target }) => this.onTargetRequested(target));
  }

  ngOnDestroy(): void {
    this.manualModalRef?.close();
    this.modalRef?.close();
  }

  setTab(tab: ClientImportPageTab): void {
    this.activeTab.set(tab);
  }

  fileErrorKey(): string | null {
    return clientImportFileErrorKey(this.state.fileErrorCode());
  }

  isStepDone(step: ClientImportStep): boolean {
    return this.steps.indexOf(step) < this.steps.indexOf(this.state.step());
  }

  onChooseFile(): void {
    if (this.state.isParsing()) {
      return;
    }
    const input = this.fileInput().nativeElement;
    input.value = '';
    input.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) {
      await this.importFile(file);
    }
  }

  async onFilesDropped(files: FileList): Promise<void> {
    const file = files.item(0);
    if (file && !this.state.isParsing()) {
      await this.importFile(file);
    }
  }

  async onDownloadTemplate(): Promise<void> {
    const language = this.translate.currentLang || this.translate.defaultLang;
    try {
      const template = await this.state.downloadTemplate(language);
      triggerBlobDownload(template.blob, template.fileName);
    } catch {
      this.toastShowService.showError(this.translate.instant(TEMPLATE_ERROR_KEY));
    }
  }

  onToPreview(): void {
    this.state.goToPreview();
  }

  onBackToMapping(): void {
    this.state.backToMapping();
  }

  async onCommit(): Promise<void> {
    if (!this.state.canCommit()) {
      return;
    }
    const committed = await this.state.commit();
    if (!committed) {
      this.toastShowService.showError(this.translate.instant(this.state.commitErrorKey()));
    }
  }

  onOtherFile(): void {
    this.closeModal();
  }

  onImportAnother(): void {
    this.closeModal();
  }

  onToClientList(): void {
    this.closeModal();
    this.navigationService.navigateToClient();
  }

  requestClose(): void {
    if (this.canDismiss()) {
      this.closeModal();
    }
  }

  canDismiss(): boolean {
    return !this.state.isCommitting();
  }

  openManual(): void {
    if (this.manualModalRef) {
      return;
    }
    this.manualModalRef = this.ngbModal.open(this.manualModal(), {
      size: 'lg',
      scrollable: true,
      ariaLabelledBy: CLIENT_IMPORT_MANUAL_MODAL_TITLE_ID,
    });
    this.manualModalRef.hidden.subscribe(() => (this.manualModalRef = null));
  }

  closeManual(): void {
    this.manualModalRef?.close();
  }

  private async importFile(file: File): Promise<void> {
    this.lookups ??= this.state.initialize();
    const parsed = await this.state.selectFile(file);
    if (parsed) {
      await this.lookups;
      this.openModal();
    }
  }

  private openModal(): void {
    if (this.modalRef) {
      return;
    }
    this.modalRef = this.ngbModal.open(this.importModal(), {
      centered: true,
      backdrop: 'static',
      keyboard: true,
      windowClass: CLIENT_IMPORT_MODAL_WINDOW_CLASS,
      ariaLabelledBy: CLIENT_IMPORT_MODAL_TITLE_ID,
      beforeDismiss: () => this.canDismiss(),
    });
    this.modalRef.hidden.subscribe(() => this.onModalHidden());
  }

  private closeModal(): void {
    this.modalRef?.close();
  }

  private onModalHidden(): void {
    this.modalRef = null;
    this.state.restart();
  }

  private onTargetRequested(target: string): void {
    const tab = CLIENT_IMPORT_CARD_TAB_TARGETS[target];
    if (tab) {
      this.setTab(tab);
      return;
    }
    if (CLIENT_IMPORT_MODAL_TARGETS.has(target) && !this.modalRef) {
      this.setTab(ClientImportPageTab.Import);
    }
  }
}

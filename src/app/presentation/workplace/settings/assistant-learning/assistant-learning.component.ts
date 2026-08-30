// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card "Klacksy learns" - the admin review of everything Klacksy taught itself.
 * Shows three plain-text lists: learned phrasings (including the description sharpenings of the
 * existing optimizer pipeline), learned capabilities and wishes Klacksy could not fulfil, each
 * entry editable in a modal and deletable behind the shared delete confirmation. Description
 * A description sharpening the routing regression gate withheld additionally carries an approve action
 * that overrides the gate and writes the proposed text onto the skill; everything the gate let through
 * the loop applied by itself. A wish the loop gave up on carries a retry action that hands it back with
 * a fresh attempt budget. Withdrawing an automatically applied description can answer that the live text
 * was changed by something else meanwhile - the proposal is then discarded without anything being put
 * back, which is reported as information rather than as a failure. The card head starts a learning run
 * on demand instead of waiting for the scheduled one.
 * @param phrases - Learned phrases and description sharpenings loaded from the learning endpoint
 * @param capabilities - Recipes Klacksy composed itself
 * @param wishes - Clusters of utterances that stayed unfulfillable, with occurrence counters
 * @param isLoading - True while any of the three lists is being reloaded
 * @param isRunningLearning - True while the manual run trigger is in flight, disables the run button
 */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  TemplateRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';

import { DataManagementKlacksyLearningService } from 'src/app/domain/services/assistant/data-management-klacksy-learning.service';
import {
  ILearnedCapability,
  ILearnedPhrase,
  IUnfulfillableWish,
} from 'src/app/domain/interfaces/klacksy-learning.interface';
import {
  KLACKSY_LEARNING_CONFLICT_STATUS,
  KLACKSY_LEARNING_DELETE_CONTEXT,
  KLACKSY_LEARNING_MIN_PHRASE_LENGTH,
  KLACKSY_LEARNING_PHRASE_SOURCE,
  KLACKSY_LEARNING_PHRASE_STATUS,
  KLACKSY_LEARNING_RUN_REASON,
  KLACKSY_LEARNING_RUN_RELOAD_DELAY_MS,
  KLACKSY_LEARNING_WISH_STATUS,
} from 'src/app/domain/constants/klacksy-learning.constants';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { deleteConfirmations } from 'src/app/presentation/shared/modal/delete-confirmation.helper';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { LearnedCapabilitiesHeaderComponent } from './learned-capabilities-header/learned-capabilities-header.component';
import { LearnedCapabilitiesRowComponent } from './learned-capabilities-row/learned-capabilities-row.component';
import { LearnedPhrasesHeaderComponent } from './learned-phrases-header/learned-phrases-header.component';
import { LearnedPhrasesRowComponent } from './learned-phrases-row/learned-phrases-row.component';
import { UnfulfillableWishesHeaderComponent } from './unfulfillable-wishes-header/unfulfillable-wishes-header.component';
import { UnfulfillableWishesRowComponent } from './unfulfillable-wishes-row/unfulfillable-wishes-row.component';

const I18N = {
  ErrorLoad: 'setting.klacksyLearning.error.load',
  ErrorUpdate: 'setting.klacksyLearning.error.update',
  ErrorDelete: 'setting.klacksyLearning.error.delete',
  InfoUpdated: 'setting.klacksyLearning.info.updated',
  InfoDeleted: 'setting.klacksyLearning.info.deleted',
  InfoApproved: 'setting.klacksyLearning.phrases.approveSuccess',
  ErrorApprove: 'setting.klacksyLearning.phrases.approveError',
  InfoDeleteStale: 'setting.klacksyLearning.phrases.deleteStale',
  InfoWishRetried: 'setting.klacksyLearning.wishes.retrySuccess',
  ErrorWishRetry: 'setting.klacksyLearning.wishes.retryError',
  RunStarted: 'setting.klacksyLearning.runStarted',
  RunNotStartedGeneric: 'setting.klacksyLearning.runNotStarted.generic',
  ErrorRun: 'setting.klacksyLearning.error.run',
  ToastSuccess: 'TOAST_SUCCESS',
} as const;

const RUN_NOT_STARTED_KEYS: Record<string, string> = {
  [KLACKSY_LEARNING_RUN_REASON.AlreadyRunning]:
    'setting.klacksyLearning.runNotStarted.alreadyRunning',
};

/**
 * Recognises the conflict a withdrawal answers with when the description it would have restored was
 * changed by something else meanwhile. Duck-typed on the status rather than on HttpErrorResponse so a
 * plain rejection carrying a status is read the same way.
 */
function isConflict(error: unknown): boolean {
  return (error as { status?: number } | null)?.status === KLACKSY_LEARNING_CONFLICT_STATUS;
}

interface PhraseFormModel {
  text: string;
}

interface CapabilityFormModel {
  goal: string;
}

@Component({
  selector: 'app-assistant-learning',
  templateUrl: './assistant-learning.component.html',
  styleUrls: ['./assistant-learning.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    FormField,
    NgbModule,
    TranslateModule,
    SettingsListCardComponent,
    LearnedPhrasesHeaderComponent,
    LearnedPhrasesRowComponent,
    LearnedCapabilitiesHeaderComponent,
    LearnedCapabilitiesRowComponent,
    UnfulfillableWishesHeaderComponent,
    UnfulfillableWishesRowComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantLearningComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly phraseModal = viewChild.required<TemplateRef<unknown>>('phraseModal');
  readonly capabilityModal = viewChild.required<TemplateRef<unknown>>('capabilityModal');
  readonly wishModal = viewChild.required<TemplateRef<unknown>>('wishModal');

  private learningService = inject(DataManagementKlacksyLearningService);
  private toastShowService = inject(ToastShowService);
  private modalService = inject(ModalService);
  private ngbModal = inject(NgbModal);
  private cdr = inject(ChangeDetectorRef);
  public translate = inject(TranslateService);

  private destroy$ = new Subject<void>();
  private isSaving = false;
  private isApproving = false;
  private isRetryingWish = false;

  readonly phrases = signal<ILearnedPhrase[]>([]);
  readonly capabilities = signal<ILearnedCapability[]>([]);
  readonly wishes = signal<IUnfulfillableWish[]>([]);
  readonly isLoading = signal(false);
  readonly isRunningLearning = signal(false);

  readonly editingPhrase = signal<ILearnedPhrase | null>(null);
  readonly editingCapability = signal<ILearnedCapability | null>(null);
  readonly viewingWish = signal<IUnfulfillableWish | null>(null);

  readonly isDescriptionPhrase = computed(
    () => this.editingPhrase()?.source === KLACKSY_LEARNING_PHRASE_SOURCE.Description,
  );

  private phraseFormModel = signal<PhraseFormModel>({ text: '' });
  private capabilityFormModel = signal<CapabilityFormModel>({ goal: '' });

  phraseForm = form(this.phraseFormModel);

  capabilityForm = form(this.capabilityFormModel);

  readonly isPhraseFormValid = computed(
    () => this.phraseFormModel().text.trim().length >= KLACKSY_LEARNING_MIN_PHRASE_LENGTH,
  );

  readonly isCapabilityFormValid = computed(
    () => this.capabilityFormModel().goal.trim().length >= KLACKSY_LEARNING_MIN_PHRASE_LENGTH,
  );

  ngOnInit(): void {
    this.loadAll();
  }

  ngAfterViewInit(): void {
    deleteConfirmations(this.modalService, KLACKSY_LEARNING_DELETE_CONTEXT.Phrases)
      .pipe(takeUntil(this.destroy$))
      .subscribe((id) => this.confirmDelete(id, (entryId) => this.deletePhrase(entryId)));

    deleteConfirmations(this.modalService, KLACKSY_LEARNING_DELETE_CONTEXT.Capabilities)
      .pipe(takeUntil(this.destroy$))
      .subscribe((id) => this.confirmDelete(id, (entryId) => this.deleteCapability(entryId)));

    deleteConfirmations(this.modalService, KLACKSY_LEARNING_DELETE_CONTEXT.Wishes)
      .pipe(takeUntil(this.destroy$))
      .subscribe((id) => this.confirmDelete(id, (entryId) => this.dismissWish(entryId)));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAll(): void {
    this.isLoading.set(true);
    this.loadPhrases();
    this.loadCapabilities();
    this.loadWishes();
  }

  private loadPhrases(): void {
    this.learningService
      .getPhrases()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (entries) => {
          this.phrases.set(entries ?? []);
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
        error: () => this.onLoadError(() => this.phrases.set([])),
      });
  }

  private loadCapabilities(): void {
    this.learningService
      .getCapabilities()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (entries) => {
          this.capabilities.set(entries ?? []);
          this.cdr.markForCheck();
        },
        error: () => this.onLoadError(() => this.capabilities.set([])),
      });
  }

  private loadWishes(): void {
    this.learningService
      .getUnfulfillableWishes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (entries) => {
          this.wishes.set(entries ?? []);
          this.cdr.markForCheck();
        },
        error: () => this.onLoadError(() => this.wishes.set([])),
      });
  }

  private onLoadError(reset: () => void): void {
    reset();
    this.isLoading.set(false);
    this.showError(I18N.ErrorLoad);
    this.cdr.markForCheck();
  }

  onClickEditPhrase(entry: ILearnedPhrase): void {
    this.editingPhrase.set(entry);
    this.phraseFormModel.set({ text: entry.phrase ?? '' });
    this.openModal(this.phraseModal());
  }

  onClickEditCapability(entry: ILearnedCapability): void {
    this.editingCapability.set(entry);
    this.capabilityFormModel.set({ goal: entry.goal ?? '' });
    this.openModal(this.capabilityModal());
  }

  onClickShowWish(entry: IUnfulfillableWish): void {
    this.viewingWish.set(entry);
    this.openModal(this.wishModal());
  }

  private openModal(template: TemplateRef<unknown>): void {
    setTimeout(() => {
      this.ngbModal.open(template, {
        ariaLabelledBy: 'modal-title',
        size: 'lg',
      });
    }, 0);
  }

  async onSavePhraseModal(modal: unknown): Promise<void> {
    const saved = await this.savePhrase();
    if (saved) {
      (modal as { close: () => void }).close();
    }
  }

  async onSaveCapabilityModal(modal: unknown): Promise<void> {
    const saved = await this.saveCapability();
    if (saved) {
      (modal as { close: () => void }).close();
    }
  }

  private async savePhrase(): Promise<boolean> {
    const entry = this.editingPhrase();
    if (!entry || !this.isPhraseFormValid() || this.isSaving) {
      return false;
    }

    const text = this.phraseFormModel().text.trim();
    this.isSaving = true;

    try {
      await firstValueFrom(
        this.learningService.updatePhrase(
          entry.id,
          this.isDescriptionPhrase() ? { description: text } : { phrase: text },
        ),
      );
      this.phrases.update((list) =>
        list.map((item) => (item.id === entry.id ? { ...item, phrase: text } : item)),
      );
      this.showSuccess(I18N.InfoUpdated);
      return true;
    } catch {
      this.showError(I18N.ErrorUpdate);
      return false;
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  private async saveCapability(): Promise<boolean> {
    const entry = this.editingCapability();
    if (!entry || !this.isCapabilityFormValid() || this.isSaving) {
      return false;
    }

    const goal = this.capabilityFormModel().goal.trim();
    this.isSaving = true;

    try {
      await firstValueFrom(this.learningService.updateCapability(entry.id, { goal }));
      this.capabilities.update((list) =>
        list.map((item) => (item.id === entry.id ? { ...item, goal } : item)),
      );
      this.showSuccess(I18N.InfoUpdated);
      return true;
    } catch {
      this.showError(I18N.ErrorUpdate);
      return false;
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  async onClickRunLearning(): Promise<void> {
    if (this.isRunningLearning()) {
      return;
    }

    this.isRunningLearning.set(true);

    try {
      const result = await firstValueFrom(this.learningService.runLearning());
      if (result?.started) {
        this.showSuccess(I18N.RunStarted);
        setTimeout(() => this.loadAll(), KLACKSY_LEARNING_RUN_RELOAD_DELAY_MS);
        return;
      }
      this.showInfo(this.runNotStartedKey(result?.reason ?? null));
    } catch {
      this.showError(I18N.ErrorRun);
    } finally {
      this.isRunningLearning.set(false);
      this.cdr.markForCheck();
    }
  }

  private runNotStartedKey(reason: string | null): string {
    if (!reason) {
      return I18N.RunNotStartedGeneric;
    }
    return RUN_NOT_STARTED_KEYS[reason] ?? I18N.RunNotStartedGeneric;
  }

  async onClickApprovePhrase(entry: ILearnedPhrase): Promise<void> {
    if (
      !entry.id ||
      entry.status !== KLACKSY_LEARNING_PHRASE_STATUS.BlockedRegression ||
      this.isApproving
    ) {
      return;
    }

    this.isApproving = true;

    try {
      await firstValueFrom(this.learningService.approveDescriptionProposal(entry.id));
      this.showSuccess(I18N.InfoApproved);
      this.loadPhrases();
    } catch {
      this.showError(I18N.ErrorApprove);
    } finally {
      this.isApproving = false;
      this.cdr.markForCheck();
    }
  }

  async onClickRetryWish(entry: IUnfulfillableWish): Promise<void> {
    if (
      !entry.id ||
      entry.status !== KLACKSY_LEARNING_WISH_STATUS.Unfulfillable ||
      this.isRetryingWish
    ) {
      return;
    }

    this.isRetryingWish = true;

    try {
      await firstValueFrom(this.learningService.retryUnfulfillableWish(entry.id));
      this.showSuccess(I18N.InfoWishRetried);
      this.loadWishes();
    } catch {
      this.showError(I18N.ErrorWishRetry);
    } finally {
      this.isRetryingWish = false;
      this.cdr.markForCheck();
    }
  }

  onClickDeletePhrase(entry: ILearnedPhrase): void {
    this.openDeleteConfirmation(entry.id, KLACKSY_LEARNING_DELETE_CONTEXT.Phrases);
  }

  onClickDeleteCapability(entry: ILearnedCapability): void {
    this.openDeleteConfirmation(entry.id, KLACKSY_LEARNING_DELETE_CONTEXT.Capabilities);
  }

  onClickDeleteWish(entry: IUnfulfillableWish): void {
    this.openDeleteConfirmation(entry.id, KLACKSY_LEARNING_DELETE_CONTEXT.Wishes);
  }

  private openDeleteConfirmation(id: string, context: string): void {
    if (!id) {
      return;
    }
    this.modalService.Filing = id;
    this.modalService.componentContext = context;
    this.modalService.deleteMessage = DomainMessages.DELETE_ENTRY;
    this.modalService.setDefault(ModalType.Delete);
    this.modalService.openModel(ModalType.Delete);
  }

  private confirmDelete(id: string, remove: (entryId: string) => Promise<void>): void {
    remove(id);
    this.modalService.componentContext = '';
    this.modalService.Filing = '';
    this.cdr.markForCheck();
  }

  private async deletePhrase(id: string): Promise<void> {
    try {
      await firstValueFrom(this.learningService.deletePhrase(id));
      this.phrases.update((list) => list.filter((item) => item.id !== id));
      this.showSuccess(I18N.InfoDeleted);
    } catch (error) {
      if (isConflict(error)) {
        this.showInfo(I18N.InfoDeleteStale);
        this.loadPhrases();
        return;
      }
      this.showError(I18N.ErrorDelete);
    } finally {
      this.cdr.markForCheck();
    }
  }

  private async deleteCapability(id: string): Promise<void> {
    try {
      await firstValueFrom(this.learningService.deleteCapability(id));
      this.capabilities.update((list) => list.filter((item) => item.id !== id));
      this.showSuccess(I18N.InfoDeleted);
    } catch {
      this.showError(I18N.ErrorDelete);
    } finally {
      this.cdr.markForCheck();
    }
  }

  private async dismissWish(id: string): Promise<void> {
    try {
      await firstValueFrom(this.learningService.dismissUnfulfillableWish(id));
      this.wishes.update((list) => list.filter((item) => item.id !== id));
      this.showSuccess(I18N.InfoDeleted);
    } catch {
      this.showError(I18N.ErrorDelete);
    } finally {
      this.cdr.markForCheck();
    }
  }

  private showSuccess(key: string): void {
    this.toastShowService.showSuccess(
      this.translate.instant(key),
      this.translate.instant(I18N.ToastSuccess),
    );
  }

  private showInfo(key: string): void {
    this.toastShowService.showInfo(this.translate.instant(key));
  }

  private showError(key: string): void {
    this.toastShowService.showError(this.translate.instant(key));
  }
}

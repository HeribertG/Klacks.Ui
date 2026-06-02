// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card for managing qualification master entries (name, emoji, time-limited flag).
 * Uses NgbModal for create/edit and ModalService for delete confirmation.
 */
import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
  AfterViewInit,
  inject,
  TemplateRef,
  ViewChild,
  signal,
  computed,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { form, FormField, debounce } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { DataQualificationService } from 'src/app/infrastructure/api/settings/data-qualification.service';
import { IQualification } from 'src/app/domain/models/settings/qualification';
import { IMultiLanguage } from 'src/app/domain/models/translation/multi-language-class';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { EMOJI_CATEGORIES, EMOJI_NAMES, EmojiCategory } from 'src/app/domain/constants/emoji-data';
import { QualificationsHeaderComponent } from './qualifications-header/qualifications-header.component';
import { QualificationsRowComponent } from './qualifications-row/qualifications-row.component';

interface QualFormModel {
  nameDe: string;
  nameEn: string;
  nameFr: string;
  nameIt: string;
  descDe: string;
  descEn: string;
  descFr: string;
  descIt: string;
}

@Component({
  selector: 'app-qualifications',
  standalone: true,
  imports: [
    FormsModule,
    FormField,
    TranslateModule,
    NgbModule,
    SpinnerModule,
    SettingsListCardComponent,
    QualificationsHeaderComponent,
    QualificationsRowComponent,
  ],
  templateUrl: './qualifications.component.html',
  styleUrls: ['./qualifications.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QualificationsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('qualModal', { read: TemplateRef }) qualModal!: TemplateRef<unknown>;

  private dataQualService = inject(DataQualificationService);
  private toastService = inject(ToastShowService);
  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  public translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  qualifications = signal<IQualification[]>([]);
  searchTerm = signal('');

  filteredQualifications = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.qualifications();
    return this.qualifications().filter(q =>
      Object.values(q.name ?? {}).some(v => typeof v === 'string' && v.toLowerCase().includes(term))
    );
  });

  isLoading = false;
  editingQualification: IQualification | null = null;
  private originalQualification: IQualification | null = null;
  isNewQualification = false;
  private isSaving = false;
  message = DomainMessages.DELETE_ENTRY;

  selectedEmoji = signal<string>('');
  isTimeLimitedValue = signal<boolean>(false);
  emojiPickerOpen = signal<boolean>(false);
  selectedCategoryIndex = signal<number>(0);

  readonly categories: EmojiCategory[] = EMOJI_CATEGORIES;
  readonly emojiNames: Record<string, string> = EMOJI_NAMES;
  readonly categoryIcons: string[] = ['😀', '👋', '🐶', '🍎', '✈️', '⚽', '💡', '❤️', '🌍', '👷', '🎓'];

  currentCategoryEmojis = computed(() =>
    this.categories[this.selectedCategoryIndex()]?.emojis ?? []
  );

  private formModel = signal<QualFormModel>({ nameDe: '', nameEn: '', nameFr: '', nameIt: '', descDe: '', descEn: '', descFr: '', descIt: '' });
  qualForm = form(this.formModel, f => {
    debounce(f.nameDe, 300);
    debounce(f.nameEn, 300);
    debounce(f.nameFr, 300);
    debounce(f.nameIt, 300);
    debounce(f.descDe, 300);
    debounce(f.descEn, 300);
    debounce(f.descFr, 300);
    debounce(f.descIt, 300);
  });

  ngOnInit(): void {
    this.loadQualifications();
  }

  ngAfterViewInit(): void {
    this.modalService.resultEvent
      .pipe(takeUntil(this.destroy$))
      .subscribe((x: ModalType) => {
        if (x === ModalType.Delete && this.modalService.componentContext === 'qualifications') {
          this.executeDelete(this.modalService.Filing);
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
          this.cdr.markForCheck();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadQualifications(): void {
    this.isLoading = true;
    this.dataQualService
      .getQualificationList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: list => {
          this.qualifications.set(list);
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.toastService.showError('setting.qualifications.error.load');
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  onClickAdd(): void {
    this.isNewQualification = true;
    this.editingQualification = { name: {}, isTimeLimited: false };
    this.originalQualification = null;
    this.formModel.set({ nameDe: '', nameEn: '', nameFr: '', nameIt: '', descDe: '', descEn: '', descFr: '', descIt: '' });
    this.selectedEmoji.set('');
    this.isTimeLimitedValue.set(false);
    this.emojiPickerOpen.set(false);
    this.selectedCategoryIndex.set(0);

    setTimeout(() => {
      this.ngbModal.open(this.qualModal, { ariaLabelledBy: 'modal-title' });
    }, 0);
  }

  onClickEdit(q: IQualification): void {
    this.isNewQualification = false;
    this.editingQualification = { ...q };
    this.originalQualification = q;
    this.formModel.set({
      nameDe: q.name?.de ?? '',
      nameEn: q.name?.en ?? '',
      nameFr: q.name?.fr ?? '',
      nameIt: q.name?.it ?? '',
      descDe: q.description?.de ?? '',
      descEn: q.description?.en ?? '',
      descFr: q.description?.fr ?? '',
      descIt: q.description?.it ?? '',
    });
    this.selectedEmoji.set(q.emoji ?? '');
    this.isTimeLimitedValue.set(q.isTimeLimited);
    this.emojiPickerOpen.set(false);
    this.selectedCategoryIndex.set(0);

    setTimeout(() => {
      this.ngbModal.open(this.qualModal, { ariaLabelledBy: 'modal-title' });
    }, 0);
  }

  toggleEmojiPicker(): void {
    this.emojiPickerOpen.update(v => !v);
  }

  onSelectEmoji(emoji: string): void {
    this.selectedEmoji.set(emoji);
    this.emojiPickerOpen.set(false);
  }

  onCategorySelect(index: number): void {
    this.selectedCategoryIndex.set(index);
  }

  onTimeLimitedChange(event: Event): void {
    this.isTimeLimitedValue.set((event.target as HTMLInputElement).checked);
  }

  async onSaveModal(modal: { close: () => void }): Promise<void> {
    const success = await this.saveQualification();
    if (success) {
      modal.close();
    }
  }

  openDeleteQualification(q: IQualification): void {
    if (q.id) {
      this.modalService.Filing = '';
      this.modalService.componentContext = 'qualifications';
      this.modalService.Filing = q.id;
      this.modalService.deleteMessage = this.message;
      this.modalService.setDefault(ModalType.Delete);
      this.modalService.openModel(ModalType.Delete);
    }
  }

  isFormValid(): boolean {
    const m = this.formModel();
    return !!(m.nameDe?.trim() || m.nameEn?.trim() || m.nameFr?.trim() || m.nameIt?.trim());
  }

  private async saveQualification(): Promise<boolean> {
    if (!this.editingQualification || !this.isFormValid() || this.isSaving) {
      return false;
    }

    this.isSaving = true;
    const m = this.formModel();
    const name: IMultiLanguage = {
      de: m.nameDe || undefined,
      en: m.nameEn || undefined,
      fr: m.nameFr || undefined,
      it: m.nameIt || undefined,
    };
    const hasDesc = m.descDe || m.descEn || m.descFr || m.descIt;
    const description: IMultiLanguage | undefined = hasDesc
      ? { de: m.descDe || undefined, en: m.descEn || undefined, fr: m.descFr || undefined, it: m.descIt || undefined }
      : undefined;
    const toSave: IQualification = {
      ...this.editingQualification,
      name,
      description,
      emoji: this.selectedEmoji() || undefined,
      isTimeLimited: this.isTimeLimitedValue(),
    };

    try {
      if (this.originalQualification?.id) {
        const updated = await firstValueFrom(
          this.dataQualService.updateQualification({ ...toSave, id: this.originalQualification.id })
        );
        const idx = this.qualifications().findIndex(q => q.id === this.originalQualification!.id);
        if (idx !== -1) {
          const list = this.qualifications();
          this.qualifications.set([
            ...list.slice(0, idx),
            updated,
            ...list.slice(idx + 1),
          ]);
        }
      } else {
        const created = await firstValueFrom(this.dataQualService.addQualification(toSave));
        this.qualifications.update(list => [...list, created]);
      }
      this.cdr.markForCheck();
      return true;
    } catch {
      this.toastService.showError('setting.qualifications.error.save');
      return false;
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  private async executeDelete(id: string): Promise<void> {
    try {
      await firstValueFrom(this.dataQualService.deleteQualification(id));
      this.qualifications.update(list => list.filter(q => q.id !== id));
      this.cdr.markForCheck();
    } catch {
      this.toastService.showError('setting.qualifications.error.delete');
      this.cdr.markForCheck();
    }
  }
}

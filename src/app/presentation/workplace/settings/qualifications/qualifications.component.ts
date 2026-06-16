// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Settings card for managing qualification master entries (name, emoji, time-limited flag, type, country).
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
import { IMultiLanguage, MultiLanguage } from 'src/app/domain/models/translation/multi-language-class';
import { Language } from 'src/app/domain/models/settings/language-config';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { EMOJI_CATEGORIES, EMOJI_NAMES, EmojiCategory } from 'src/app/domain/constants/emoji-data';
import { QualificationType } from 'src/app/domain/enums/qualification-type.enum';
import { QualificationCategory } from 'src/app/domain/enums/qualification-category.enum';
import { QualificationsHeaderComponent } from './qualifications-header/qualifications-header.component';
import { QualificationsRowComponent } from './qualifications-row/qualifications-row.component';
import { IRefreshable } from 'src/app/domain/interfaces/manageable.interface';
import { DataRefreshRegistry } from 'src/app/application/services/data-refresh-registry.service';
import { RefreshEntityTokens } from 'src/app/domain/constants/refresh-entity-tokens.constants';

interface QualFormModel {
  name: string;
  description: string;
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
export class QualificationsComponent implements OnInit, AfterViewInit, OnDestroy, IRefreshable {
  public readonly refreshableEntities = RefreshEntityTokens.QUALIFICATION;
  @ViewChild('qualModal', { read: TemplateRef }) qualModal!: TemplateRef<unknown>;

  private dataQualService = inject(DataQualificationService);
  private toastService = inject(ToastShowService);
  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  public translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private refreshRegistry = inject(DataRefreshRegistry);
  private unregisterRefresh?: () => void;
  private destroy$ = new Subject<void>();
  currentLang: Language = DomainMessages.DEFAULT_LANG;

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
  selectedType = signal<QualificationType>(QualificationType.Work);
  selectedCountries = signal<string[]>([]);
  emojiPickerOpen = signal<boolean>(false);

  readonly QualificationType = QualificationType;
  readonly QualificationCategory = QualificationCategory;
  selectedCategory = signal<QualificationCategory>(QualificationCategory.None);
  selectedCategoryIndex = signal<number>(0);

  readonly categories: EmojiCategory[] = EMOJI_CATEGORIES;
  readonly emojiNames: Record<string, string> = EMOJI_NAMES;
  readonly categoryIcons: string[] = ['😀', '👋', '🐶', '🍎', '✈️', '⚽', '💡', '❤️', '🌍', '👷', '🎓'];

  currentCategoryEmojis = computed(() =>
    this.categories[this.selectedCategoryIndex()]?.emojis ?? []
  );

  private formModel = signal<QualFormModel>({ name: '', description: '' });
  qualForm = form(this.formModel, f => {
    debounce(f.name, 300);
    debounce(f.description, 300);
  });

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang as Language;
    this.loadQualifications();
  }

  ngAfterViewInit(): void {
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentLang = this.translate.currentLang as Language;
        this.cdr.markForCheck();
      });

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

    this.unregisterRefresh = this.refreshRegistry.register(this);
  }

  ngOnDestroy(): void {
    this.unregisterRefresh?.();
    this.destroy$.next();
    this.destroy$.complete();
  }

  reload(): void {
    this.loadQualifications();
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
    this.editingQualification = {
      name: new MultiLanguage(),
      isTimeLimited: false,
      type: QualificationType.Work,
      countries: [],
      category: QualificationCategory.None,
    };
    this.originalQualification = null;
    this.formModel.set({ name: '', description: '' });
    this.selectedEmoji.set('');
    this.isTimeLimitedValue.set(false);
    this.selectedType.set(QualificationType.Work);
    this.selectedCountries.set([]);
    this.selectedCategory.set(QualificationCategory.None);
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
    const lang = this.currentLang;
    this.formModel.set({
      name: q.name?.[lang] || q.name?.de || '',
      description: q.description?.[lang] || q.description?.de || '',
    });
    this.selectedEmoji.set(q.emoji ?? '');
    this.isTimeLimitedValue.set(q.isTimeLimited);
    this.selectedType.set(q.type ?? QualificationType.Work);
    this.selectedCountries.set(q.countries ?? []);
    this.selectedCategory.set(q.category ?? QualificationCategory.None);
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

  readonly countryOptions: { code: string; label: string }[] = [
    { code: 'CH', label: 'CH – Schweiz' },
    { code: 'DE', label: 'DE – Deutschland' },
    { code: 'AT', label: 'AT – Österreich' },
    { code: 'FR', label: 'FR – Frankreich' },
    { code: 'BE', label: 'BE – Belgien' },
    { code: 'IT', label: 'IT – Italien' },
    { code: 'GB', label: 'GB – Großbritannien' },
    { code: 'US', label: 'US – USA' },
    { code: 'AU', label: 'AU – Australien' },
    { code: 'CA', label: 'CA – Kanada' },
    { code: 'IE', label: 'IE – Irland' },
    { code: 'JP', label: 'JP – Japan' },
    { code: 'CN', label: 'CN – China' },
    { code: 'TW', label: 'TW – Taiwan' },
    { code: 'KR', label: 'KR – Südkorea' },
    { code: 'SG', label: 'SG – Singapur' },
    { code: 'SA', label: 'SA – Saudi-Arabien' },
    { code: 'AE', label: 'AE – Vereinigte Arabische Emirate' },
    { code: 'MA', label: 'MA – Marokko' },
    { code: 'IL', label: 'IL – Israel' },
    { code: 'SM', label: 'SM – San Marino' },
    { code: 'LI', label: 'LI – Liechtenstein' },
    { code: 'LU', label: 'LU – Luxemburg' },
  ];

  onCountryToggle(code: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const checked = input.type === 'checkbox' ? input.checked : !this.selectedCountries().includes(code);
    const current = this.selectedCountries();
    this.selectedCountries.set(
      checked ? [...current, code] : current.filter(c => c !== code)
    );
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
    return !!this.formModel().name?.trim();
  }

  private async saveQualification(): Promise<boolean> {
    if (!this.editingQualification || !this.isFormValid() || this.isSaving) {
      return false;
    }

    this.isSaving = true;
    const m = this.formModel();
    const lang = this.currentLang;
    const name: IMultiLanguage = { ...(this.editingQualification.name ?? {}), [lang]: m.name };
    const existingDesc = this.editingQualification.description ?? {};
    const description: IMultiLanguage | undefined = m.description
      ? { ...existingDesc, [lang]: m.description }
      : Object.values(existingDesc).some(v => v) ? existingDesc : undefined;
    const toSave: IQualification = {
      ...this.editingQualification,
      name,
      description,
      emoji: this.selectedEmoji() || undefined,
      isTimeLimited: this.isTimeLimitedValue(),
      type: this.selectedType(),
      countries: this.selectedCountries(),
      category: this.selectedCategory(),
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

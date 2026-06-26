// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Card component for managing required qualifications on a shift. Lists rows in a table with
 * emoji, qualification dropdown, min-level dropdown and a mandatory toggle. Changes are held
 * in-memory on the edited shift and persisted together with the shift via the savebar (shift PUT).
 * Editability follows the same gate as the group / macro cards: editable on OriginalOrder for
 * everyone, and on any other status (Sealed / OriginalShift / Split) for Admin / Authorised users.
 * @param isReadOnly - Disables all editing when true
 * @param isChangingEvent - Emits true whenever a qualification row is added, changed or removed
 */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  EventEmitter,
  inject,
  OnDestroy,
  OnInit,
  Output,
  input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Subject, takeUntil } from 'rxjs';
import { IQualification } from 'src/app/domain/models/settings/qualification';
import { QualificationLevel } from 'src/app/domain/enums/qualification-level.enum';
import { QualificationType } from 'src/app/domain/enums/qualification-type.enum';
import { QualificationCategory } from 'src/app/domain/enums/qualification-category.enum';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { DataQualificationService } from 'src/app/infrastructure/api/settings/data-qualification.service';
import { ShiftStatus } from 'src/app/domain/models/shift/shift-class';
import { IShiftRequiredQualification, ShiftRequiredQualification } from 'src/app/domain/models/shift/shift-required-qualification-class';
import { AuthService } from 'src/app/presentation/auth/auth.service';
import { ButtonNewComponent } from 'src/app/presentation/shared/button-new/button-new.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { ExpandableCardComponent } from 'src/app/presentation/shared/expandable-card/expandable-card.component';

@Component({
  selector: 'app-shift-qualifications',
  templateUrl: './shift-qualifications.component.html',
  styleUrls: ['./shift-qualifications.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbTooltipModule,
    TranslateModule,
    FontAwesomeModule,
    ButtonNewComponent,
    TrashIconRedComponent,
    ExpandableCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShiftQualificationsComponent implements OnInit, OnDestroy {
  readonly isReadOnly = input(false);
  @Output() isChangingEvent = new EventEmitter<boolean>();

  public dataManagementShiftService = inject(DataManagementShiftService);
  private dataQualificationService = inject(DataQualificationService);
  private authService = inject(AuthService);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  public readonly QualificationType = QualificationType;
  public readonly QualificationCategory = QualificationCategory;
  public currentLang = 'de';
  public masterQualifications: IQualification[] = [];
  public filterType: QualificationType | null = null;
  public filterCountry = '';
  public filterCategory: QualificationCategory | null = null;
  public readonly levelOptions: number[] = [
    QualificationLevel.Low,
    QualificationLevel.Basic,
    QualificationLevel.Proficient,
    QualificationLevel.Advanced,
    QualificationLevel.Expert,
  ];

  private qualificationMap = new Map<string, IQualification>();
  private ngUnsubscribe = new Subject<void>();

  private reloadEffect = effect(() => {
    this.dataManagementShiftService.isReset();
    this.dataManagementShiftService.isRead();
    this.cdr.markForCheck();
  });

  get rows(): IShiftRequiredQualification[] {
    return this.dataManagementShiftService.editShift?.requiredQualifications ?? [];
  }

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang ?? 'de';
    this.translate.onLangChange.pipe(takeUntil(this.ngUnsubscribe)).subscribe((event) => {
      this.currentLang = event.lang;
      this.cdr.markForCheck();
    });
    this.loadMasterQualifications();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this.reloadEffect.destroy();
  }

  isDisabled(): boolean {
    const shift = this.dataManagementShiftService.editShift;
    if (this.isReadOnly() || !shift) {
      return true;
    }
    const isNotOriginal = shift.status !== ShiftStatus.OriginalOrder;
    const isNotAuthorisedOrAdmin = !this.authService.isAuthorisedOrAdmin();
    return isNotOriginal && isNotAuthorisedOrAdmin;
  }

  hasMasterQualifications(): boolean {
    return this.masterQualifications.length > 0;
  }

  trackByIndex(index: number): number {
    return index;
  }

  getQualification(qualificationId?: string): IQualification | undefined {
    return qualificationId ? this.qualificationMap.get(qualificationId) : undefined;
  }

  getEmoji(row: IShiftRequiredQualification): string {
    return this.getQualification(row.qualificationId)?.emoji ?? '';
  }

  getQualificationName(row: IShiftRequiredQualification): string {
    const qualification = this.getQualification(row.qualificationId);
    return qualification ? getLocalizedValue(qualification.name, this.currentLang) : '';
  }

  localizedName(qualification: IQualification): string {
    return getLocalizedValue(qualification.name, this.currentLang);
  }

  get availableCountries(): string[] {
    return [...new Set(this.masterQualifications.flatMap((q) => q.countries))].sort();
  }

  availableQualifications(row: IShiftRequiredQualification): IQualification[] {
    const usedIds = new Set(
      this.rows.filter((q) => q !== row && !!q.qualificationId).map((q) => q.qualificationId)
    );
    return this.masterQualifications.filter((q) => {
      if (!q.id) return false;
      if (q.id === row.qualificationId) return true;
      if (usedIds.has(q.id)) return false;
      if (this.filterType !== null && q.type !== this.filterType) return false;
      if (this.filterCategory !== null && q.category !== this.filterCategory) return false;
      if (this.filterCountry && q.countries.length > 0 && !q.countries.includes(this.filterCountry)) return false;
      return true;
    });
  }

  onFilterTypeChange(value: QualificationType | null): void {
    this.filterType = value;
    if (value !== QualificationType.Work) {
      this.filterCategory = null;
    }
    this.cdr.markForCheck();
  }

  onFilterCategoryChange(value: QualificationCategory | null): void {
    this.filterCategory = value;
    this.cdr.markForCheck();
  }

  onFilterCountryChange(value: string): void {
    this.filterCountry = value;
    this.cdr.markForCheck();
  }

  addRow(): void {
    if (this.isDisabled()) return;
    const shift = this.dataManagementShiftService.editShift;
    if (!shift) return;
    const row = new ShiftRequiredQualification();
    row.shiftId = shift.id ?? '';
    shift.requiredQualifications = [...shift.requiredQualifications, row];
    this.isChangingEvent.emit(true);
    this.cdr.markForCheck();
  }

  onQualificationChange(index: number, qualificationId: string | undefined): void {
    const row = this.rows[index];
    if (!row) return;
    row.qualificationId = qualificationId;
    this.isChangingEvent.emit(true);
  }

  onLevelChange(index: number, level: number): void {
    const row = this.rows[index];
    if (!row) return;
    row.minLevel = level;
    this.isChangingEvent.emit(true);
  }

  onMandatoryChange(index: number, value: boolean): void {
    const row = this.rows[index];
    if (!row) return;
    row.isMandatory = value;
    this.isChangingEvent.emit(true);
  }

  removeRow(index: number): void {
    const shift = this.dataManagementShiftService.editShift;
    if (!shift) return;
    const row = this.rows[index];
    if (!row) return;
    shift.requiredQualifications = shift.requiredQualifications.filter((r) => r !== row);
    this.isChangingEvent.emit(true);
    this.cdr.markForCheck();
  }

  private loadMasterQualifications(): void {
    this.dataQualificationService
      .getQualificationList()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((list) => {
        this.masterQualifications = list ?? [];
        this.qualificationMap = new Map(
          this.masterQualifications.filter((q) => !!q.id).map((q) => [q.id!, q])
        );
        this.cdr.markForCheck();
      });
  }
}

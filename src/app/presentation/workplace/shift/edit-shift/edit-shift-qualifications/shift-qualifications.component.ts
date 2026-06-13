// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Card component for managing required qualifications on a shift. Lists rows in a table with
 * emoji, qualification dropdown, min-level dropdown and a mandatory toggle. Changes are persisted
 * immediately via the Shifts/RequiredQualifications endpoints (not via the savebar).
 * Editing is allowed only when the shift status is OriginalOrder.
 * @param isReadOnly - Disables all editing when true
 */
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  Input,
  OnDestroy,
  OnInit,
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
import { DataShiftQualificationService } from 'src/app/infrastructure/api/shift/data-shift-qualification.service';
import { IShiftRequiredQualification, ShiftRequiredQualification } from 'src/app/domain/models/shift/shift-required-qualification-class';
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
  @Input() isReadOnly = false;

  public dataManagementShiftService = inject(DataManagementShiftService);
  private dataShiftQualificationService = inject(DataShiftQualificationService);
  private dataQualificationService = inject(DataQualificationService);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  public readonly QualificationType = QualificationType;
  public readonly QualificationCategory = QualificationCategory;
  public currentLang = 'de';
  public masterQualifications: IQualification[] = [];
  public rows: IShiftRequiredQualification[] = [];
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
    this.loadRows();
  });

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
    return this.isReadOnly || !this.dataManagementShiftService.editShift;
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
    if (!shift?.id) return;
    const row = new ShiftRequiredQualification();
    row.shiftId = shift.id;
    this.rows = [...this.rows, row];
    this.cdr.markForCheck();
  }

  onQualificationChange(index: number, qualificationId: string | undefined): void {
    const row = this.rows[index];
    if (!row) return;
    row.qualificationId = qualificationId;
    this.persistRow(row);
  }

  onLevelChange(index: number, level: number): void {
    const row = this.rows[index];
    if (!row) return;
    row.minLevel = level;
    this.persistRow(row);
  }

  onMandatoryChange(index: number, value: boolean): void {
    const row = this.rows[index];
    if (!row) return;
    row.isMandatory = value;
    this.persistRow(row);
  }

  removeRow(index: number): void {
    const row = this.rows[index];
    if (!row) return;
    if (row.id) {
      this.dataShiftQualificationService
        .deleteRequiredQualification(row.id)
        .pipe(takeUntil(this.ngUnsubscribe))
        .subscribe(() => {
          this.rows.splice(index, 1);
          this.rows = [...this.rows];
          this.cdr.markForCheck();
        });
    } else {
      this.rows.splice(index, 1);
      this.rows = [...this.rows];
      this.cdr.markForCheck();
    }
  }

  private persistRow(row: IShiftRequiredQualification): void {
    const shift = this.dataManagementShiftService.editShift;
    if (!shift?.id || !row.qualificationId) return;

    this.dataShiftQualificationService
      .setRequiredQualification({
        shiftId: shift.id,
        qualificationId: row.qualificationId,
        isMandatory: row.isMandatory,
        minLevel: row.minLevel,
      })
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((id) => {
        if (!row.id) {
          row.id = id;
        }
        this.cdr.markForCheck();
      });
  }

  private loadRows(): void {
    const shiftId = this.dataManagementShiftService.editShift?.id;
    if (!shiftId) {
      this.rows = [];
      this.cdr.markForCheck();
      return;
    }
    this.dataShiftQualificationService
      .getByShiftId(shiftId)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((list) => {
        this.rows = list ?? [];
        this.cdr.markForCheck();
      });
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

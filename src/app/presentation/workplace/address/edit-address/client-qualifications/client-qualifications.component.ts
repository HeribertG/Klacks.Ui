// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Card that attaches qualifications (employee skills) to the edited client. Lists attached
 * qualifications in a table with emoji, level and an optional expiry date, and lets the user
 * add or remove rows. Changes are part of the atomic client save via the savebar.
 * @param isReadOnly - Disables all editing when true
 * @param isChangingEvent - Emitted whenever the qualifications change, to flag the client dirty
 */
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule, NgbDateStruct, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import { Subject, takeUntil } from 'rxjs';
import { IClientQualification } from 'src/app/domain/models/client/client-qualification-class';
import { IQualification } from 'src/app/domain/models/settings/qualification';
import { QualificationLevel } from 'src/app/domain/enums/qualification-level.enum';
import { QualificationType } from 'src/app/domain/enums/qualification-type.enum';
import { QualificationCategory } from 'src/app/domain/enums/qualification-category.enum';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { DataManagementQualificationService } from 'src/app/domain/services/settings/data-management-qualification.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ButtonNewComponent } from 'src/app/presentation/shared/button-new/button-new.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { ExpandableCardComponent } from 'src/app/presentation/shared/expandable-card/expandable-card.component';
import {
  transformDateToNgbDateStruct,
  transformNgbDateStructToDate,
} from 'src/app/shared/helpers/ngb-date.helper';

import { DomainMessages } from 'src/app/domain/constants/messages';
@Component({
  selector: 'app-client-qualifications',
  templateUrl: './client-qualifications.component.html',
  styleUrls: ['./client-qualifications.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbModule,
    NgbTooltipModule,
    TranslateModule,
    FontAwesomeModule,
    ButtonNewComponent,
    TrashIconRedComponent,
    ExpandableCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientQualificationsComponent implements OnInit, OnDestroy {
  readonly isReadOnly = input(false);
  readonly isChangingEvent = output<boolean>();

  public dataManagementClientService = inject(DataManagementClientService);
  public authorizationService = inject(AuthorizationService);
  private dataQualificationService = inject(DataManagementQualificationService);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  public readonly QualificationType = QualificationType;
  public readonly QualificationCategory = QualificationCategory;
  public faCalendar = faCalendar;
  public currentLang = DomainMessages.DEFAULT_LANG;
  public qualifications: IQualification[] = [];
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

  public validUntilValues = new Map<IClientQualification, NgbDateStruct | undefined>();

  private qualificationMap = new Map<string, IQualification>();
  private ngUnsubscribe = new Subject<void>();

  constructor() {
    effect(() => {
      const client = this.dataManagementClientService.editClient();
      if (client?.qualifications) {
        this.validUntilValues.clear();
        client.qualifications.forEach((row) => {
          this.validUntilValues.set(
            row,
            row.validUntil ? transformDateToNgbDateStruct(row.validUntil) : undefined
          );
        });
      }
    });
  }

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang ?? DomainMessages.DEFAULT_LANG;
    this.translate.onLangChange.pipe(takeUntil(this.ngUnsubscribe)).subscribe((event) => {
      this.currentLang = event.lang;
      this.cdr.markForCheck();
    });

    this.loadQualifications();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  isDisabled(): boolean {
    return (
      this.isReadOnly() ||
      this.dataManagementClientService.editClientDeleted() ||
      !this.authorizationService.isAdmin
    );
  }

  hasMasterQualifications(): boolean {
    return this.qualifications.length > 0;
  }

  trackByIndex(index: number): number {
    return index;
  }

  getQualification(qualificationId?: string): IQualification | undefined {
    return qualificationId ? this.qualificationMap.get(qualificationId) : undefined;
  }

  getEmoji(row: IClientQualification): string {
    return this.getQualification(row.qualificationId)?.emoji ?? '';
  }

  getQualificationName(row: IClientQualification): string {
    const qualification = this.getQualification(row.qualificationId);
    return qualification ? getLocalizedValue(qualification.name, this.currentLang) : '';
  }

  localizedName(qualification: IQualification): string {
    return getLocalizedValue(qualification.name, this.currentLang);
  }

  isTimeLimited(row: IClientQualification): boolean {
    return this.getQualification(row.qualificationId)?.isTimeLimited ?? false;
  }

  get availableCountries(): string[] {
    return [...new Set(this.qualifications.flatMap((q) => q.countries))].sort();
  }

  availableQualifications(row: IClientQualification): IQualification[] {
    const usedIds = new Set(
      (this.dataManagementClientService.editClient()?.qualifications ?? [])
        .filter((q) => q !== row && !!q.qualificationId)
        .map((q) => q.qualificationId)
    );
    return this.qualifications.filter((q) => {
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

  getValidUntil(row: IClientQualification): NgbDateStruct | undefined {
    return this.validUntilValues.get(row);
  }

  setValidUntil(row: IClientQualification, value: NgbDateStruct | undefined): void {
    this.validUntilValues.set(row, value);
    row.validUntil = value ? transformNgbDateStructToDate(value) : undefined;
    this.emitChange();
  }

  onQualificationChange(index: number, qualificationId: string | undefined): void {
    const currentClient = this.dataManagementClientService.editClient();
    const row = currentClient?.qualifications?.[index];
    if (!row) {
      return;
    }

    row.qualificationId = qualificationId;

    if (!this.isTimeLimited(row)) {
      row.validUntil = undefined;
      this.validUntilValues.set(row, undefined);
    }

    this.commitChange();
  }

  onLevelChange(index: number, level: number): void {
    const currentClient = this.dataManagementClientService.editClient();
    const row = currentClient?.qualifications?.[index];
    if (!row) {
      return;
    }

    row.level = level;
    this.commitChange();
  }

  addQualification(): void {
    this.dataManagementClientService.addQualification();
    this.isChangingEvent.emit(true);
  }

  removeQualification(index: number): void {
    const currentClient = this.dataManagementClientService.editClient();
    if (!currentClient?.qualifications) {
      return;
    }

    currentClient.qualifications.splice(index, 1);
    this.commitChange();
  }

  private commitChange(): void {
    this.dataManagementClientService.clientEditService.editClient.update((c) => ({ ...c! }));
    this.isChangingEvent.emit(true);
  }

  private emitChange(): void {
    this.isChangingEvent.emit(true);
  }

  private loadQualifications(): void {
    this.dataQualificationService
      .getQualificationList(true)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((list) => {
        this.qualifications = list ?? [];
        this.qualificationMap = new Map(
          this.qualifications.filter((q) => !!q.id).map((q) => [q.id!, q])
        );
        this.cdr.markForCheck();
      });
  }

}

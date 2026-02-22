// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  AfterViewInit,
  Component,
  Injector,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { Filter } from 'src/app/domain/models/client/client-class';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { Language } from 'src/app/application/helpers/sharedItems';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import {
  NgbDatepickerModule,
  NgbDropdownModule,
  NgbTooltipModule,
  NgbDateStruct,
} from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';
import { transformDateToNgbDateStruct, transformNgbDateStructToDate } from 'src/app/shared/helpers/ngb-date.helper';

@Component({
  selector: 'app-edit-shift-nav',
  templateUrl: './edit-shift-nav.component.html',
  styleUrls: ['./edit-shift-nav.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    NgbDropdownModule,
    NgbDatepickerModule,
    NgbTooltipModule,
    TranslateModule,
    FontAwesomeModule,
    FallbackPipe
],
})
export class EditShiftNavComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('navShiftForm', { static: false }) navShiftForm:
    | NgForm
    | undefined;

  public dataManagementShiftService = inject(DataManagementShiftService);
  private translateService = inject(TranslateService);
  private localStorageService = inject(LocalStorageService);
  private injector = inject(Injector);

  public navShift: HTMLElement | undefined;
  public faCalendar = faCalendar;
  public isComboBoxOpen = false;

  public objectForUnsubscribe: any;
  public clientTypeName = DomainMessages.ENTITY_TYPE_ALL;

  public isInitFinished = false;
  public currentLang: Language = DomainMessages.DEFAULT_LANG;
  private ngUnsubscribe = new Subject<void>();

  public scopeFromValue: NgbDateStruct | undefined;
  public scopeUntilValue: NgbDateStruct | undefined;

  onScopeFromChange(value: NgbDateStruct | undefined): void {
    this.scopeFromValue = value;
    const filter = this.dataManagementShiftService.currentClientFilter;
    filter.scopeFrom = value ? transformNgbDateStructToDate(value) : undefined;
  }

  onScopeUntilChange(value: NgbDateStruct | undefined): void {
    this.scopeUntilValue = value;
    const filter = this.dataManagementShiftService.currentClientFilter;
    filter.scopeUntil = value ? transformNgbDateStructToDate(value) : undefined;
  }

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;

    this.navShift = document.getElementById('navShiftForm')!;
    this.readSignals();
  }

  ngAfterViewInit(): void {
    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
      });

    if (this.navShiftForm && this.navShiftForm.valueChanges) {
      this.objectForUnsubscribe = this.navShiftForm.valueChanges.subscribe(
        () => {
          if (this.navShiftForm!.dirty) {
            if (!this.isComboBoxOpen) {
              setTimeout(() => this.onFilterChange(), 100);
            }
          }
        }
      );
    }
  }

  ngOnDestroy(): void {
    if (this.objectForUnsubscribe) {
      this.objectForUnsubscribe.unsubscribe();
    }
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onOpenChange(event: boolean) {
    this.isComboBoxOpen = event;
  }

  onClickSetEmpty() {
    this.localStorageService.remove('edit-shift-address');
    this.dataManagementShiftService.currentClientFilter = new Filter();
    this.onFilterChange();
  }

  isRequestPossible(): boolean {
    return (
      this.dataManagementShiftService.currentClientFilter.male ||
      this.dataManagementShiftService.currentClientFilter.female ||
      this.dataManagementShiftService.currentClientFilter.legalEntity
    );
  }

  private onFilterChange() {
    // Emit event to notify address component that filters have changed
    // This will trigger a refresh of the address search results
  }

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        if (this.dataManagementShiftService.initIsRead()) {
          const filter = this.dataManagementShiftService.currentClientFilter;
          this.scopeFromValue = filter.scopeFrom ? transformDateToNgbDateStruct(filter.scopeFrom) : undefined;
          this.scopeUntilValue = filter.scopeUntil ? transformDateToNgbDateStruct(filter.scopeUntil) : undefined;
        }
      });
    });
  }
}

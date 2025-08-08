/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
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
import { Filter } from 'src/app/domain/models/client-class';
import { DataManagementShiftService } from 'src/app/domain/services/data-management-shift.service';
import { Language } from 'src/app/application/helpers/sharedItems';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import {
  NgbDatepickerModule,
  NgbDropdownModule,
  NgbTooltipModule,
} from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';

@Component({
  selector: 'app-edit-shift-nav',
  templateUrl: './edit-shift-nav.component.html',
  styleUrls: ['./edit-shift-nav.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbDropdownModule,
    NgbDatepickerModule,
    NgbTooltipModule,
    TranslateModule,
    FontAwesomeModule,
    FallbackPipe,
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
  public clientTypeName = MessageLibrary.ENTITY_TYPE_ALL;

  public isInitFinished = false;
  public currentLang: Language = MessageLibrary.DEFAULT_LANG;
  private ngUnsubscribe = new Subject<void>();

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
        this.dataManagementShiftService.initIsRead();
      });
    });
  }
}

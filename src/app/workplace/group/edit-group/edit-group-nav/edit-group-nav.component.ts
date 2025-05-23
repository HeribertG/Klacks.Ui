/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AfterViewInit,
  Component,
  IterableDiffers,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { DataManagementGroupService } from 'src/app/data/management/data-management-group.service';
import { Language } from 'src/app/helpers/sharedItems';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import { CommonModule } from '@angular/common';
import {
  NgbDatepickerModule,
  NgbDropdownModule,
  NgbTooltipModule,
} from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FallbackPipe } from 'src/app/pipes/fallback/fallback.pipe';

@Component({
  selector: 'app-edit-group-nav',
  templateUrl: './edit-group-nav.component.html',
  styleUrls: ['./edit-group-nav.component.scss'],
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
export class EditGroupNavComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('navGroupForm', { static: false }) navGroupForm:
    | NgForm
    | undefined;

  public dataManagementGroupService = inject(DataManagementGroupService);
  private iterableDiffers = inject(IterableDiffers);
  private translateService = inject(TranslateService);
  private localStorageService = inject(LocalStorageService);

  public navGroup: HTMLElement | undefined;
  public faCalendar = faCalendar;
  public isComboBoxOpen = false;

  public objectForUnsubscribe: any;
  public clientTypeName = MessageLibrary.ENTITY_TYPE_ALL;

  public iterableDiffer: any;
  public isInitFinished = false;
  public defaultTop = 0;
  public currentLang: Language = MessageLibrary.DEFAULT_LANG;
  private ngUnsubscribe = new Subject<void>();

  constructor() {
    this.iterableDiffer = this.iterableDiffers.find([]).create(undefined);
  }

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;
    this.dataManagementGroupService.init();

    this.navGroup = document.getElementById('navGroupForm')!;

    this.readSignals();
  }

  ngAfterViewInit(): void {
    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
      });

    if (this.navGroupForm && this.navGroupForm.valueChanges) {
      this.objectForUnsubscribe = this.navGroupForm.valueChanges.subscribe(
        () => {
          if (this.navGroupForm!.dirty) {
            if (!this.isComboBoxOpen) {
              setTimeout(() => this.dataManagementGroupService.readPage(), 100);
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

  private isInit(): void {
    this.isInitFinished = true;

    const scopeFromFlag = document.getElementById(
      'scopeFromFlag'
    ) as HTMLInputElement;
    const scopeUntilFlag = document.getElementById(
      'scopeUntilFlag'
    ) as HTMLInputElement;

    if (scopeFromFlag) {
      scopeFromFlag.checked =
        this.dataManagementGroupService.currentClientFilter.scopeFromFlag!;
    }

    if (scopeUntilFlag) {
      scopeUntilFlag.checked =
        this.dataManagementGroupService.currentClientFilter.scopeUntilFlag!;
    }
  }

  onOpenChange(event: boolean) {
    this.isComboBoxOpen = event;
    if (this.isComboBoxOpen) {
      this.dataManagementGroupService.setTemporaryFilter();
    }
    if (
      !this.isComboBoxOpen &&
      this.dataManagementGroupService.isTemoraryFilter_Dirty()
    ) {
      setTimeout(() => {
        this.dataManagementGroupService.headerCheckBoxValue = false;

        this.dataManagementGroupService.readPage();
      }, 100);
    }
  }

  onClickSetEmpty() {
    this.localStorageService.remove('edit-address');
    this.dataManagementGroupService.currentClientFilter.setEmpty();
    (document.getElementById('scopeFromFlag') as HTMLInputElement).checked =
      false;
    (document.getElementById('scopeUntilFlag') as HTMLInputElement).checked =
      false;

    this.onClickClientType(
      this.dataManagementGroupService.currentClientFilter.clientType
    );
  }

  onClickClientType(index: number) {
    this.setEntityName(index);

    if (index === -1) {
      this.dataManagementGroupService.currentClientFilter.clientType = -1;
    } else {
      this.dataManagementGroupService.currentClientFilter.clientType = index;

      this.dataManagementGroupService.clearCheckedArray();
      this.dataManagementGroupService.headerCheckBoxValue = false;
    }

    setTimeout(() => {
      this.dataManagementGroupService.readPage();
    }, 100);
  }

  private setEntityName(index?: number) {
    if (index === null || index === -1) {
      this.clientTypeName = MessageLibrary.ENTITY_TYPE_ALL;
    } else {
      this.clientTypeName =
        this.dataManagementGroupService.clientAttribute[index!].name;
    }
  }

  isRequestPossible(): boolean {
    return (
      this.dataManagementGroupService.currentClientFilter.male ||
      this.dataManagementGroupService.currentClientFilter.female ||
      this.dataManagementGroupService.currentClientFilter.legalEntity
    );
  }

  private readSignals(): void {
    effect(() => {
      if (this.dataManagementGroupService.initIsRead()) {
        this.isInit();
      }
    });
  }
}

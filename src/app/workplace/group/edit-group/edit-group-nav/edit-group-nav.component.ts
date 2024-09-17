import {
  AfterViewInit,
  Component,
  IterableDiffers,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { DataManagementGroupService } from 'src/app/data/management/data-management-group.service';
import { Language } from 'src/app/helpers/sharedItems';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { LocalStorageService } from 'src/app/services/local-storage.service';

@Component({
  selector: 'app-edit-group-nav',
  templateUrl: './edit-group-nav.component.html',
  styleUrls: ['./edit-group-nav.component.scss'],
})
export class EditGroupNavComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('navGroupForm', { static: false }) navGroupForm:
    | NgForm
    | undefined;
  navGroup: HTMLElement | undefined;

  isComboBoxOpen = false;

  objectForUnsubscribe: any;
  clientTypeName = MessageLibrary.ENTITY_TYPE_ALL;

  iterableDiffer: any;
  isInitFinished = false;
  defaultTop: number = 0;
  currentLang: Language = MessageLibrary.DEFAULT_LANG;
  private ngUnsubscribe = new Subject<void>();

  constructor(
    public dataManagementGroupService: DataManagementGroupService,
    private iterableDiffers: IterableDiffers,
    private renderer: Renderer2,
    private translateService: TranslateService,
    private localStorageService: LocalStorageService
  ) {
    this.iterableDiffer = iterableDiffers.find([]).create(undefined);
  }

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;
    this.dataManagementGroupService.init();

    this.navGroup = document.getElementById('navGroupForm')!;
  }

  ngAfterViewInit(): void {
    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
      });

    this.dataManagementGroupService.initIsRead
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.isInit();
      });

    const res = this.localStorageService.get(MessageLibrary.TOKEN) !== null;
    if (this.navGroupForm && this.navGroupForm.valueChanges) {
      this.objectForUnsubscribe = this.navGroupForm.valueChanges.subscribe(
        (x) => {
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

      if (this.isInitFinished) {
        if (
          this.dataManagementGroupService.currentClientFilter.clientType !== -1
        ) {
          const key =
            this.dataManagementGroupService.currentClientFilter.clientType;
        }
      }

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
}

import {
  AfterViewInit,
  Component,
  IterableDiffers,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
  effect,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { DataManagementClientService } from 'src/app/data/management/data-management-client.service';
import { Language } from 'src/app/helpers/sharedItems';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-all-address-nav',
  templateUrl: './all-address-nav.component.html',
  styleUrls: ['./all-address-nav.component.scss'],
})
export class AllAddressNavComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('navClientForm', { static: false }) navClientForm:
    | NgForm
    | undefined;
  public navClient: HTMLElement | undefined;
  public faCalendar = faCalendar;
  public isComboBoxOpen = false;

  public objectForUnsubscribe: any;
  public clientTypeName = MessageLibrary.ENTITY_TYPE_ALL;

  public iterableDiffer: any;
  public isInitFinished = false;
  public defaultTop: number = 0;
  public currentLang: Language = MessageLibrary.DEFAULT_LANG;
  private ngUnsubscribe = new Subject<void>();

  constructor(
    public dataManagementClientService: DataManagementClientService,
    private iterableDiffers: IterableDiffers,
    private renderer: Renderer2,
    private translateService: TranslateService,
    private localStorageService: LocalStorageService
  ) {
    this.iterableDiffer = iterableDiffers.find([]).create(undefined);
    effect(() => {
      if (this.dataManagementClientService.initIsRead()) {
        this.isInit();
      }
    });
  }

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;
    this.dataManagementClientService.init();
    this.setEntityName(
      this.dataManagementClientService.currentFilter.clientType
    );
    this.navClient = document.getElementById('navClientForm')!;
  }

  ngAfterViewInit(): void {
    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
      });

    const res = this.localStorageService.get(MessageLibrary.TOKEN) !== null;
    this.objectForUnsubscribe = this.navClientForm!.valueChanges!.subscribe(
      (x) => {
        if (this.navClientForm!.dirty) {
          if (!this.isComboBoxOpen) {
            setTimeout(() => this.dataManagementClientService.readPage(), 100);
          }
        }
      }
    );
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
        this.dataManagementClientService.currentFilter.scopeFromFlag!;
    }

    if (scopeUntilFlag) {
      scopeUntilFlag.checked =
        this.dataManagementClientService.currentFilter.scopeUntilFlag!;
    }
  }

  onOpenChange(event: boolean) {
    this.isComboBoxOpen = event;
    if (this.isComboBoxOpen) {
      this.dataManagementClientService.setTemporaryFilter();
    }
    if (
      !this.isComboBoxOpen &&
      this.dataManagementClientService.isTemoraryFilter_Dirty()
    ) {
      setTimeout(() => {
        this.dataManagementClientService.headerCheckBoxValue = false;

        this.dataManagementClientService.readPage();
      }, 100);
    }
  }

  onClickSetEmpty() {
    this.localStorageService.remove('edit-address');
    this.dataManagementClientService.currentFilter.setEmpty();
    (document.getElementById('scopeFromFlag') as HTMLInputElement).checked =
      false;
    (document.getElementById('scopeUntilFlag') as HTMLInputElement).checked =
      false;

    this.onClickClientType(
      this.dataManagementClientService.currentFilter.clientType
    );
  }

  onClickClientType(index: number) {
    this.setEntityName(index);

    if (index === -1) {
      this.dataManagementClientService.currentFilter.clientType = -1;
    } else {
      this.dataManagementClientService.currentFilter.clientType = index;

      if (this.isInitFinished) {
        if (this.dataManagementClientService.currentFilter.clientType !== -1) {
          const key = this.dataManagementClientService.currentFilter.clientType;
        }
      }

      this.dataManagementClientService.clearCheckedArray();
      this.dataManagementClientService.headerCheckBoxValue = false;
    }

    setTimeout(() => {
      this.dataManagementClientService.readPage();
    }, 100);
  }

  private setEntityName(index?: number) {
    if (index === null || index === -1) {
      this.clientTypeName = MessageLibrary.ENTITY_TYPE_ALL;
    } else {
      this.clientTypeName =
        this.dataManagementClientService.clientAttribute[index!].name;
    }
  }

  isRequestPossible(): boolean {
    return (
      this.dataManagementClientService.currentFilter.male ||
      this.dataManagementClientService.currentFilter.female ||
      this.dataManagementClientService.currentFilter.legalEntity
    );
  }

  onClickShowDeleteEntries() {
    setTimeout(() => {
      this.dataManagementClientService.editClientDeleted =
        this.dataManagementClientService.currentFilter.showDeleteEntries;
    }, 100);
  }
}

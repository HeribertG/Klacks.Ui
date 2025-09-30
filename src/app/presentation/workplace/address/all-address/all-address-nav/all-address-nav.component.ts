/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AfterViewInit,
  Component,
  EffectRef,
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
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
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
import { CommonModule } from '@angular/common';
import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';
import { AllAddressStateService } from '../services/all-address-state.service';

@Component({
  selector: 'app-all-address-nav',
  templateUrl: './all-address-nav.component.html',
  styleUrls: ['./all-address-nav.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    FontAwesomeModule,
    NgbDropdownModule,
    NgbDatepickerModule,
    NgbTooltipModule,
    FallbackPipe,
  ],
  providers: [AllAddressStateService],
})
export class AllAddressNavComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('navClientForm', { static: false }) navClientForm:
    | NgForm
    | undefined;

  public dataManagementClientService = inject(DataManagementClientService);
  private translateService = inject(TranslateService);
  private localStorageService = inject(LocalStorageService);
  private injector = inject(Injector);
  private allAddressStateService = inject(AllAddressStateService);

  public navClient: HTMLElement | undefined;
  public faCalendar = faCalendar;
  public isComboBoxOpen = false;

  public objectForUnsubscribe: any;
  public clientTypeName = MessageLibrary.ENTITY_TYPE_ALL;

  public iterableDiffer: any;
  public isInitFinished = false;
  public defaultTop = 0;
  public currentLang: Language = MessageLibrary.DEFAULT_LANG;
  private ngUnsubscribe = new Subject<void>();
  private effectRef: EffectRef | null = null;

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;
    this.dataManagementClientService.init();
    this.setEntityName(
      this.dataManagementClientService.currentFilter.clientType
    );
    this.navClient = document.getElementById('navClientForm')!;

    this.readSignals();
  }

  ngAfterViewInit(): void {
    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
      });

    this.objectForUnsubscribe = this.navClientForm!.valueChanges!.subscribe(
      () => {
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

    if (this.effectRef) {
      this.effectRef.destroy();
      this.effectRef = null;
    }
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
    if (!this.isComboBoxOpen) {
      setTimeout(() => {
        this.allAddressStateService.updateFilterState();
        this.dataManagementClientService.readPage();
      }, 100);
    }
  }

  onClickSetEmpty() {
    this.allAddressStateService.clearStoredFilter();
    this.allAddressStateService.resetFilter();
    (document.getElementById('scopeFromFlag') as HTMLInputElement).checked =
      false;
    (document.getElementById('scopeUntilFlag') as HTMLInputElement).checked =
      false;

    this.dataManagementClientService.currentFilter.employee = true;
    this.dataManagementClientService.currentFilter.externEmp = true;
    this.dataManagementClientService.currentFilter.customer = true;

    this.dataManagementClientService.currentFilter.female = true;
    this.dataManagementClientService.currentFilter.male = true;
    this.dataManagementClientService.currentFilter.intersexuality = true;
    this.dataManagementClientService.currentFilter.legalEntity = true;

    this.onClickClientType(
      this.dataManagementClientService.currentFilter.clientType
    );
  }

  onClickClientType(index: number) {
    this.setEntityName(index);

    this.allAddressStateService.updateClientType(index === -1 ? -1 : index);
    this.allAddressStateService.updateFilterState();

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
      this.dataManagementClientService.currentFilter.legalEntity ||
      this.dataManagementClientService.currentFilter.intersexuality
    );
  }

  onClickShowDeleteEntries() {
    this.allAddressStateService.setShowDeleteEntries(
      this.dataManagementClientService.currentFilter.showDeleteEntries
    );
  }

  private readSignals(): void {
    this.effectRef = runInInjectionContext(this.injector, () => {
      return effect(() => {
        if (this.dataManagementClientService.initIsRead()) {
          this.isInit();
        }
      });
    });
  }
}

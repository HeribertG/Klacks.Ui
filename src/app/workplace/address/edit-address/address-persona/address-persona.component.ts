/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AfterViewInit,
  Component,
  EffectRef,
  EventEmitter,
  Injector,
  LOCALE_ID,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  effect,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import {
  NgbDatepickerModule,
  NgbDateStruct,
  NgbModal,
  NgbTooltipModule,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { Address, ICommunication } from 'src/app/core/client-class';
import { DataManagementClientService } from 'src/app/data/management/data-management-client.service';
import {
  formatPhoneNumber,
  transformDateToNgbDateStruct,
  transformNgbDateStructToDate,
} from 'src/app/helpers/format-helper';
import { createStringId } from 'src/app/helpers/object-helpers';
import { Language } from 'src/app/helpers/sharedItems';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { ModalService, ModalType } from 'src/app/modal/modal.service';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CommonModule } from '@angular/common';
import { GearGreyComponent } from 'src/app/icons/gear-grey.component';
import { FallbackPipe } from 'src/app/pipes/fallback/fallback.pipe';
import { AuthorizationService } from 'src/app/services/authorization.service';
import { ButtonNewComponent } from 'src/app/shared/button-new/button-new.component';

@Component({
  selector: 'app-address-persona',
  templateUrl: './address-persona.component.html',
  styleUrls: ['./address-persona.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NgbTooltipModule,
    NgbDatepickerModule,
    FontAwesomeModule,
    GearGreyComponent,
    FallbackPipe,
    ButtonNewComponent,
  ],
})
export class AddressPersonaComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  public dataManagementClientService = inject(DataManagementClientService);
  private authorizationService = inject(AuthorizationService);
  private ngbModal = inject(NgbModal);
  private locale = inject(LOCALE_ID);
  private translateService = inject(TranslateService);
  private modalService = inject(ModalService);
  private injector = inject(Injector);

  @Output() isChangingEvent = new EventEmitter<boolean>();

  @ViewChild('clientForm', { static: false }) clientForm: NgForm | undefined;

  public faCalendar = faCalendar;

  public addStreetLine2 = false;
  public addStreetLine3 = false;

  public addFirstNameLine2 = false;
  public addNameLine2 = false;

  public objectForUnsubscribe: Subscription | undefined;

  public editClientType = 0;
  public addressType = 0;
  public addressValidFrom: NgbDateStruct | undefined;

  public newAddressType = 0;
  public newAddressValidFrom: NgbDateStruct = transformDateToNgbDateStruct(
    new Date()
  )!;
  public message = MessageLibrary.DEACTIVE_ADDRESS;
  public title = MessageLibrary.DEACTIVE_ADDRESS_TITLE;
  public newAddressString = MessageLibrary.NEW_ADDRESS;
  public currentLang: Language = MessageLibrary.DEFAULT_LANG;

  public isPhoneValueSeals = false;

  private ngUnsubscribe = new Subject<void>();
  private effects: EffectRef[] = [];

  ngOnInit(): void {
    this.locale = MessageLibrary.DEFAULT_LANG;
    this.currentLang = this.translateService.currentLang as Language;
    this.dataManagementClientService.init();
    this.message = MessageLibrary.DEACTIVE_ADDRESS;
    this.title = MessageLibrary.DEACTIVE_ADDRESS_TITLE;
    this.newAddressString = MessageLibrary.NEW_ADDRESS;
    this.readSignals();
  }

  ngAfterViewInit(): void {
    this.objectForUnsubscribe = this.clientForm!.valueChanges!.subscribe(() => {
      if (this.clientForm!.dirty === true) {
        setTimeout(() => this.isChangingEvent.emit(true), 100);

        if (!this.dataManagementClientService.editClient!.id) {
          setTimeout(() => this.dataManagementClientService.findClients(), 100);
        }
      }
    });

    if (
      this.dataManagementClientService.editClient &&
      this.dataManagementClientService.editClient.legalEntity
    ) {
      const ele = document.getElementById(
        'profile-company'
      ) as HTMLInputElement;
      if (ele) {
        ele.focus();
      }
    } else {
      const ele = document.getElementById(
        'profile-firstname'
      ) as HTMLInputElement;
      if (ele) {
        ele.focus();
      }
    }

    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
        setTimeout(() => {
          this.message = MessageLibrary.DEACTIVE_ADDRESS;
          this.title = MessageLibrary.DEACTIVE_ADDRESS_TITLE;
          this.newAddressString = MessageLibrary.NEW_ADDRESS;
        }, 200);
      });

    this.modalService.resultEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x: ModalType) => {
        if (x === ModalType.Delete) {
          this.onDeleteCurrentAddress();
        }
      });
  }

  ngOnDestroy(): void {
    if (this.objectForUnsubscribe) {
      this.objectForUnsubscribe.unsubscribe();
    }
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();

    this.effects.forEach((effectRef) => {
      if (effectRef) {
        effectRef.destroy();
      }
    });
    this.effects = [];
  }

  isDisabled(): boolean {
    return (
      this.dataManagementClientService.editClientDeleted ||
      !this.authorizationService.isAuthorised
    );
  }
  isWeekend(date: NgbDateStruct) {
    const d = new Date(date.year!, date.month! - 1, date.day!);
    return d.getDay() === 0 || d.getDay() === 6;
  }

  private setEnvironmentVariable() {
    if (this.dataManagementClientService.editClient?.maidenName) {
      this.addNameLine2 = true;
    }

    if (this.dataManagementClientService.editClient?.secondName) {
      this.addFirstNameLine2 = true;
    }

    if (this.dataManagementClientService.editClient?.secondName) {
      this.addFirstNameLine2 = true;
    }

    this.assemblyAddress(0);
  }

  assemblyAddress(index: number) {
    if (this.dataManagementClientService.editClient?.addresses[index].street2) {
      if (
        this.dataManagementClientService.editClient.addresses[index].street2 !==
        ''
      ) {
        this.addStreetLine2 = true;
      }
    }

    if (this.dataManagementClientService.editClient?.addresses[index].street3) {
      if (
        this.dataManagementClientService.editClient.addresses[index].street3 !==
        ''
      ) {
        this.addStreetLine3 = true;
      }
    }
  }

  onChangePhoneType(index: number, event: any) {
    const value = event.currentTarget.value;

    if (value) {
      const tmp =
        this.dataManagementClientService.communicationPhoneList[index];
      let data =
        this.dataManagementClientService.editClient!.communications.find(
          (x) => x.internalId === tmp.internalId
        );

      if (!data) {
        data = tmp;
        data.internalId = createStringId();
        data.index = index;
        data.type = 0;
        data.isPhone = true;
        this.dataManagementClientService.editClient!.communications.push(data);
      }

      data.type = +value;

      this.isChangingEvent.emit(true);
    }
  }

  onChangePhonePrefix(index: number, event: any) {
    const value = event.currentTarget.value;
    if (value) {
      const tmp =
        this.dataManagementClientService.communicationPhoneList[index];
      let data =
        this.dataManagementClientService.editClient!.communications.find(
          (x) => x.internalId === tmp.internalId
        );

      if (!data) {
        data = tmp;
        data.internalId = createStringId();
        data.index = index;
        data.type = 0;
        data.isPhone = true;
        this.dataManagementClientService.editClient!.communications.push(data);
      }

      data.prefix = value;

      this.isChangingEvent.emit(true);
    }
  }

  onChangePhoneValue(index: number, event: any) {
    if (this.isPhoneValueSeals) {
      return;
    }

    const value = event.currentTarget.value;
    if (value) {
      this.isPhoneValueSeals = false;

      const tmp =
        this.dataManagementClientService.communicationPhoneList[index];
      let data =
        this.dataManagementClientService.editClient!.communications.find(
          (x) => x.internalId === tmp.internalId
        );

      if (!data) {
        data = tmp;
        data.internalId = createStringId();
        data.index = index;
        data.isPhone = true;
        this.dataManagementClientService.editClient!.communications.push(data);
      }

      data.value = value;

      this.isChangingEvent.emit(true);
    }
  }

  onKeyupPhoneNumber(pos: number, event: any) {
    event.srcElement.value = formatPhoneNumber(event.srcElement.value);

    this.onChangePhoneValue(pos, event);
  }

  onChangeEmailValue(index: number, event: any) {
    const value = event.currentTarget.value;
    if (value) {
      const tmp =
        this.dataManagementClientService.communicationEmailList[index];
      let data =
        this.dataManagementClientService.editClient!.communications.find(
          (x) => x.internalId === tmp.internalId
        );

      if (!data) {
        data = tmp;
        data.internalId = createStringId();
        data.index = index;
        data.isEmail = true;
        this.dataManagementClientService.editClient!.communications.push(data);
      }

      data.value = value;

      this.isChangingEvent.emit(true);
    }
  }

  onChangeEmailType(index: number, event: any) {
    const value = event.currentTarget.value;

    if (value) {
      const tmp =
        this.dataManagementClientService.communicationEmailList[index];
      let data =
        this.dataManagementClientService.editClient!.communications.find(
          (x) => x.internalId === tmp.internalId
        );

      if (!data) {
        data = tmp;
        data.internalId = createStringId();
        data.index = index;
        data.isEmail = true;
        this.dataManagementClientService.editClient!.communications.push(data);
      }

      data.type = +value;

      this.isChangingEvent.emit(true);
    }
  }

  onClickAddPhone() {
    this.dataManagementClientService.addPhone();
  }

  onClickDelPhone(data: ICommunication) {
    this.dataManagementClientService.delPhone(data.index);
    this.isChangingEvent.emit(true);
  }

  onClickAddEmail() {
    this.dataManagementClientService.addEmail();
  }

  onClickDelEmail(data: ICommunication) {
    this.dataManagementClientService.delEmail(data.index);
    this.isChangingEvent.emit(true);
  }

  onAddressTypeName(index: number): string {
    switch (index) {
      case 0:
        return MessageLibrary.ADDRES_TYPE0_NAME;
      case 1:
        return MessageLibrary.ADDRES_TYPE1_NAME;
      case 2:
        return MessageLibrary.ADDRES_TYPE2_NAME;
    }
    return '';
  }

  onDeleteCurrentAddress() {
    this.dataManagementClientService.removeCurrentAddress();
    this.isChangingEvent.emit(true);
  }

  openAddressType(content: any) {
    const tmpDate = new Date(
      this.dataManagementClientService.editClient!.addresses[
        this.dataManagementClientService.currentAddressIndex
      ].validFrom
    );
    this.editClientType = +this.dataManagementClientService.editClient!.type;
    this.addressType =
      +this.dataManagementClientService.editClient!.addresses[
        this.dataManagementClientService.currentAddressIndex
      ].type;

    this.addressValidFrom = transformDateToNgbDateStruct(tmpDate);

    this.ngbModal
      .open(content, {
        size: 'md',
        centered: true,
        windowClass: 'custom-class',
      })
      .result.then(
        () => {
          this.dataManagementClientService.editClient!.addresses[
            this.dataManagementClientService.currentAddressIndex
          ].validFrom = transformNgbDateStructToDate(this.addressValidFrom)!;

          const clientType = +this.editClientType;

          this.dataManagementClientService.editClient!.type = clientType;
          this.dataManagementClientService.editClient!.addresses[
            this.dataManagementClientService.currentAddressIndex
          ].type = +this.addressType;

          this.dataManagementClientService.prepareClient(
            this.dataManagementClientService.editClient!,
            true
          );

          this.isChangingEvent.emit(true);
        },
        () => {}
      );
  }

  openNewAddress(content: any) {
    this.newAddressType =
      +this.dataManagementClientService.editClient!.addresses[
        this.dataManagementClientService.currentAddressIndex
      ].type;
    this.newAddressValidFrom = transformDateToNgbDateStruct(new Date())!;

    this.ngbModal
      .open(content, {
        size: 'md',
        centered: true,
        windowClass: 'custom-class',
      })
      .result.then(
        () => {
          const c = new Address();
          c.isScoped = true;
          c.type = this.newAddressType;
          c.validFrom = transformNgbDateStructToDate(this.newAddressValidFrom)!;

          this.dataManagementClientService.editClient!.addresses.push(c);
          this.dataManagementClientService.currentAddressIndex =
            this.dataManagementClientService.editClient!.addresses.length - 1;

          this.isChangingEvent.emit(true);
        },
        () => {}
      );
  }

  openDeleteAddress() {
    this.modalService.deleteMessage = this.message;
    this.modalService.deleteMessageTitle = this.title;
    this.modalService.deleteMessageOkButton = this.title;

    this.modalService.openModel(ModalType.Delete);
  }

  openAddressList(content: any) {
    this.dataManagementClientService.readClientAddressListWithoutQueryFilter();

    this.ngbModal
      .open(content, {
        size: 'lg',
        centered: true,
        windowClass: 'custom-class',
      })
      .result.then(
        () => {},
        () => {}
      );
  }

  async onZipFocusout() {
    await this.dataManagementClientService.writeCity();
  }

  onChangingAddress(event: any) {
    const address = this.dataManagementClientService.editClient!.addresses.find(
      (x) => x.id === event.toString()
    );

    if (address!.id === event.toString()) {
      this.dataManagementClientService.reReadAddress();
      this.isChangingEvent.emit(true);
    }
  }
  choseCorrectState(): string {
    if (this.dataManagementClientService.editClient) {
      const country =
        this.dataManagementClientService.editClient!.addresses[
          this.dataManagementClientService.currentAddressIndex
        ].country;

      return 'address.all-address.all-address-persona.choose-' + country;
    }

    return 'address.edit-address.address-persona.state';
  }

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      const effect1 = effect(() => {
        const isRead = this.dataManagementClientService.isRead();
        if (isRead) {
          setTimeout(() => this.setEnvironmentVariable(), 100);
          this.dataManagementClientService.isRead.set(false);
        }
      });
      this.effects.push(effect1);

      const effect2 = effect(() => {
        const isReset = this.dataManagementClientService.isReset();
        if (isReset) {
          setTimeout(() => this.isChangingEvent.emit(false), 100);
        }
      });
      this.effects.push(effect2);
    });
  }
}

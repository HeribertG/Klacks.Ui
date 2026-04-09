// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AfterViewInit,
  Component,
  DestroyRef,
  EffectRef,
  EventEmitter,
  Injector,
  Input,
  LOCALE_ID,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  effect,
  inject,
  runInInjectionContext,
  untracked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import {
  NgbDatepickerModule,
  NgbDateStruct,
  NgbModal,
  NgbTooltipModule,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import {
  Address,
  ICommunication,
  IClient,
} from 'src/app/domain/models/client/client-class';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { formatPhoneNumber } from 'src/app/shared/helpers/phone.helper';
import {
  transformDateToNgbDateStruct,
  transformNgbDateStructToDate,
} from 'src/app/shared/helpers/ngb-date.helper';
import { Language } from 'src/app/domain/models/settings/language-config';
import { DomainMessages } from 'src/app/domain/constants/messages';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { faCalendar, faStreetView } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CommonModule } from '@angular/common';
import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { FeaturePluginStateService } from 'src/app/application/services/feature-plugin-state.service';
import { DataMessagingInvitationService } from 'src/app/infrastructure/api/messaging/data-messaging-invitation.service';
import { ButtonNewComponent } from 'src/app/presentation/shared/button-new/button-new.component';
import { OtherGreyComponent } from 'src/app/presentation/icons/icon-other-grey.component';
import { GenderEnum, EntityTypeEnum } from 'src/app/domain/enums/client-enum';
import { ExpandableCardComponent } from 'src/app/presentation/shared/expandable-card/expandable-card.component';
import { IconLocationPinComponent } from 'src/app/presentation/icons/icon-location-pin.component';

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
    OtherGreyComponent,
    FallbackPipe,
    ButtonNewComponent,
    ExpandableCardComponent,
    IconLocationPinComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressPersonaComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  public dataManagementClientService = inject(DataManagementClientService);
  public featurePluginState = inject(FeaturePluginStateService);
  private authorizationService = inject(AuthorizationService);
  private messagingInvitationService = inject(DataMessagingInvitationService);
  private ngbModal = inject(NgbModal);
  private locale = inject(LOCALE_ID);
  private translateService = inject(TranslateService);
  private modalService = inject(ModalService);
  private injector = inject(Injector);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  @Input() isReadOnly = false;
  @Output() isChangingEvent = new EventEmitter<boolean>();

  @ViewChild('clientForm', { static: false }) clientForm: NgForm | undefined;

  public faCalendar = faCalendar;
  public faStreetView = faStreetView;

  public addStreetLine2 = false;
  public addStreetLine3 = false;

  public addFirstNameLine2 = false;
  public addNameLine2 = false;

  public editClientType = 0;
  public addressType = 0;
  public addressValidFrom: NgbDateStruct | undefined;

  public newAddressType = 0;
  public newAddressValidFrom: NgbDateStruct = transformDateToNgbDateStruct(
    new Date()
  )!;
  public message = DomainMessages.DEACTIVE_ADDRESS;
  public title = DomainMessages.DEACTIVE_ADDRESS_TITLE;
  public newAddressString = DomainMessages.NEW_ADDRESS;
  public currentLang: Language = DomainMessages.DEFAULT_LANG;

  public isPhoneValueSeals = false;

  public isCompanyValid: boolean | undefined;
  public isFirstNameValid: boolean | undefined;
  public isNameValid: boolean | undefined;
  public isGenderValid: boolean | undefined;
  public isZipValid: boolean | undefined;
  public isCityValid: boolean | undefined;
  public isCountryValid: boolean | undefined;

  public birthdateValue: NgbDateStruct | undefined;

  private ngUnsubscribe = new Subject<void>();
  private effects: EffectRef[] = [];

  onBirthdateChange(value: NgbDateStruct | undefined): void {
    this.birthdateValue = value;
    const client = this.dataManagementClientService.editClient();
    if (client) {
      client.birthdate = value ? transformNgbDateStructToDate(value) : undefined;
    }
  }

  get headerTitle(): string {
    const idNumberLabel = this.translateService.instant('address.edit-address.address-persona.id-number');
    const typeAbbr = this.dataManagementClientService.editClient()?.typeAbbreviation || '';
    const idNumber = this.dataManagementClientService.editClient()?.idNumber || '';
    return `${idNumberLabel} ${typeAbbr}${idNumber}`;
  }

  ngOnInit(): void {
    this.locale = DomainMessages.DEFAULT_LANG;
    this.currentLang = this.translateService.currentLang as Language;
    this.message = DomainMessages.DEACTIVE_ADDRESS;
    this.title = DomainMessages.DEACTIVE_ADDRESS_TITLE;
    this.newAddressString = DomainMessages.NEW_ADDRESS;
    this.readSignals();
  }

  ngAfterViewInit(): void {
    this.clientForm!.valueChanges!
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.clientForm!.dirty === true) {
          queueMicrotask(() => this.isChangingEvent.emit(true));

          if (!this.dataManagementClientService.editClient()?.id) {
            queueMicrotask(() => this.dataManagementClientService.findClients());
          }
        }
      });

    if (
      this.dataManagementClientService.editClient() &&
      this.dataManagementClientService.editClient()?.legalEntity
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
        queueMicrotask(() => {
          this.message = DomainMessages.DEACTIVE_ADDRESS;
          this.title = DomainMessages.DEACTIVE_ADDRESS_TITLE;
          this.newAddressString = DomainMessages.NEW_ADDRESS;
          this.cdr.markForCheck();
        });
      });

    this.modalService.resultEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === 'address-persona'
        ) {
          this.onDeleteCurrentAddress();
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
        }
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
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
      this.isReadOnly ||
      this.dataManagementClientService.editClientDeleted() ||
      !this.authorizationService.isAdmin
    );
  }

  canSendTelegramInvitation(): boolean {
    const client = this.dataManagementClientService.editClient();
    return (
      !!client
      && !!client.id
      && client.type === EntityTypeEnum.employee
      && this.featurePluginState.isPluginEnabled('messaging')
    );
  }

  sendTelegramInvitation(): void {
    const client = this.dataManagementClientService.editClient();
    if (!client?.id) return;
    this.messagingInvitationService.sendTelegramInvitation(client.id).subscribe({
      next: (resp) => {
        console.info('Telegram invitation result:', resp.result);
      },
      error: (err) => {
        console.error('Telegram invitation failed', err);
      },
    });
  }

  isCustomerWithCoordinates(): boolean {
    const client = this.dataManagementClientService.editClient();
    if (!client || client.type !== EntityTypeEnum.customer) {
      return false;
    }
    const address = client.addresses[this.dataManagementClientService.currentAddressIndex()];
    return !!address?.latitude && !!address?.longitude;
  }

  openOpenStreetMap(): void {
    const client = this.dataManagementClientService.editClient();
    if (!client) {
      return;
    }
    const address = client.addresses[this.dataManagementClientService.currentAddressIndex()];
    if (!address?.latitude || !address?.longitude) {
      return;
    }
    const url = `https://www.openstreetmap.org/?mlat=${address.latitude}&mlon=${address.longitude}#map=17/${address.latitude}/${address.longitude}`;
    window.open(url, '_blank');
  }

  openStreetView(): void {
    const client = this.dataManagementClientService.editClient();
    if (!client) {
      return;
    }
    const address = client.addresses[this.dataManagementClientService.currentAddressIndex()];
    if (!address?.latitude || !address?.longitude) {
      return;
    }
    const url = `https://www.google.com/maps/@${address.latitude},${address.longitude},3a,75y,90t/data=!3m6!1e1!3m4!1s!2e0!7i16384!8i8192`;
    window.open(url, '_blank');
  }

  onLegalEntityChange(isLegalEntity: boolean): void {
    if (this.dataManagementClientService.editClient()) {
      if (isLegalEntity) {
        this.dataManagementClientService.editClient()!.type =
          EntityTypeEnum.customer;
        this.dataManagementClientService.editClient()!.gender =
          GenderEnum.legalEntity;
      } else {
        this.dataManagementClientService.editClient()!.type = 0;
        this.dataManagementClientService.editClient()!.gender =
          GenderEnum.female;
      }
      this.calcValidation();
    }
  }

  onCountryChange(): void {
    this.dataManagementClientService.filterState();
    this.calcValidation();
  }

  onStateChange(): void {
    this.calcValidation();
  }

  getCurrentStateName(): string {
    if (!this.dataManagementClientService.editClient()) {
      return '';
    }

    const currentState =
      this.dataManagementClientService.editClient()!.addresses[
        this.dataManagementClientService.currentAddressIndex()
      ].state;

    if (!currentState) {
      return '';
    }

    const stateToken = this.dataManagementClientService
      .filteredStateList()
      .find((s) => s.state === currentState);

    if (!stateToken || !stateToken.stateName) {
      return '';
    }

    const currentLang = this.translateService.currentLang as Language;
    return getLocalizedValue(stateToken.stateName, currentLang) || currentState;
  }

  isWeekend(date: NgbDateStruct) {
    const d = new Date(date.year!, date.month! - 1, date.day!);
    return d.getDay() === 0 || d.getDay() === 6;
  }

  private setEnvironmentVariable() {
    if (this.dataManagementClientService.editClient()?.maidenName) {
      this.addNameLine2 = true;
    }

    if (this.dataManagementClientService.editClient()?.secondName) {
      this.addFirstNameLine2 = true;
    }

    if (this.dataManagementClientService.editClient()?.secondName) {
      this.addFirstNameLine2 = true;
    }

    this.assemblyAddress(0);
  }

  assemblyAddress(index: number) {
    if (
      this.dataManagementClientService.editClient()?.addresses[index].street2
    ) {
      if (
        this.dataManagementClientService.editClient()!.addresses[index]
          .street2 !== ''
      ) {
        this.addStreetLine2 = true;
      }
    }

    if (
      this.dataManagementClientService.editClient()?.addresses[index].street3
    ) {
      if (
        this.dataManagementClientService.editClient()!.addresses[index]
          .street3 !== ''
      ) {
        this.addStreetLine3 = true;
      }
    }
  }

  onChangePhoneType(index: number, event: any): void {
    this.updateCommunication(
      this.dataManagementClientService.communicationPhoneList(), index,
      { isPhone: true, type: 0 }, 'type', +event.currentTarget.value
    );
  }

  onChangePhonePrefix(index: number, event: any): void {
    this.updateCommunication(
      this.dataManagementClientService.communicationPhoneList(), index,
      { isPhone: true, type: 0 }, 'prefix', event.currentTarget.value
    );
  }

  onChangePhoneValue(index: number, event: any): void {
    if (this.isPhoneValueSeals) {
      return;
    }
    this.updateCommunication(
      this.dataManagementClientService.communicationPhoneList(), index,
      { isPhone: true }, 'value', event.currentTarget.value
    );
  }

  onKeyupPhoneNumber(pos: number, event: any) {
    const formatted = formatPhoneNumber(event.srcElement.value);
    event.srcElement.value = formatted;

    const phoneList = this.dataManagementClientService.communicationPhoneList();
    if (phoneList[pos]) {
      phoneList[pos].value = formatted;
    }
  }

  onChangeEmailValue(index: number, event: any): void {
    this.updateCommunication(
      this.dataManagementClientService.communicationEmailList(), index,
      { isEmail: true }, 'value', event.currentTarget.value
    );
  }

  onChangeEmailType(index: number, event: any): void {
    this.updateCommunication(
      this.dataManagementClientService.communicationEmailList(), index,
      { isEmail: true }, 'type', +event.currentTarget.value
    );
  }

  private updateCommunication(
    list: ICommunication[], index: number,
    defaults: Partial<ICommunication>, field: keyof ICommunication, value: any
  ): void {
    if (!value && value !== 0) {
      return;
    }

    const tmp = list[index];
    let data = this.dataManagementClientService
      .editClient()!
      .communications.find((x) => x.index === tmp.index);

    if (!data) {
      data = tmp;
      data.index = index;
      Object.assign(data, defaults);
      this.dataManagementClientService.editClient()!.communications.push(data);
    }

    (data as any)[field] = value;
    this.isChangingEvent.emit(true);
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
        return DomainMessages.ADDRES_TYPE0_NAME;
      case 1:
        return DomainMessages.ADDRES_TYPE1_NAME;
      case 2:
        return DomainMessages.ADDRES_TYPE2_NAME;
    }
    return '';
  }

  onDeleteCurrentAddress() {
    this.dataManagementClientService.removeCurrentAddress();
    this.isChangingEvent.emit(true);
  }

  openAddressType(content: any) {
    const tmpDate = new Date(
      this.dataManagementClientService.editClient()!.addresses[
        this.dataManagementClientService.currentAddressIndex()
      ].validFrom
    );
    this.editClientType = +this.dataManagementClientService.editClient()!.type;
    this.addressType =
      +this.dataManagementClientService.editClient()!.addresses[
        this.dataManagementClientService.currentAddressIndex()
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
          this.dataManagementClientService.editClient()!.addresses[
            this.dataManagementClientService.currentAddressIndex()
          ].validFrom = transformNgbDateStructToDate(this.addressValidFrom)!;

          const clientType = +this.editClientType;

          this.dataManagementClientService.editClient()!.type = clientType;
          this.dataManagementClientService.editClient()!.addresses[
            this.dataManagementClientService.currentAddressIndex()
          ].type = +this.addressType;

          this.dataManagementClientService.refreshClientState();

          this.isChangingEvent.emit(true);
        },
        () => {}
      );
  }

  openNewAddress(content: any) {
    this.newAddressType =
      +this.dataManagementClientService.editClient()!.addresses[
        this.dataManagementClientService.currentAddressIndex()
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

          this.dataManagementClientService.editClient()!.addresses.push(c);
          this.dataManagementClientService.clientEditService.currentAddressIndex.set(
            this.dataManagementClientService.editClient()!.addresses.length - 1
          );

          this.isChangingEvent.emit(true);
        },
        () => {}
      );
  }

  openDeleteAddress() {
    this.modalService.Filing = '';
    this.modalService.componentContext = 'address-persona';

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
    this.calcValidation();
    this.cdr.markForCheck();
  }

  onChangingAddress(event: any) {
    const address = this.dataManagementClientService
      .editClient()!
      .addresses.find((x) => x.id === event.toString());

    if (address!.id === event.toString()) {
      this.dataManagementClientService.reReadAddress();
      this.isChangingEvent.emit(true);
    }
  }
  choseCorrectState(): string {
    if (this.dataManagementClientService.editClient()) {
      const country =
        this.dataManagementClientService.editClient()!.addresses[
          this.dataManagementClientService.currentAddressIndex()
        ].country;

      return 'address.all-address.all-address-persona.choose-' + country;
    }

    return 'address.edit-address.address-persona.state';
  }

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      const effect1 = effect(() => {
        const isRead = this.dataManagementClientService.isRead();
        const isReset = this.dataManagementClientService.isReset();
        const client = this.dataManagementClientService.editClient();

        if (isRead && client) {
          const birthdate = client.birthdate;
          this.birthdateValue = birthdate ? transformDateToNgbDateStruct(birthdate) : undefined;
          untracked(() => {
            queueMicrotask(() => {
              this.setEnvironmentVariable();
              this.dataManagementClientService.filterState();
              this.calcValidation();
              this.cdr.markForCheck();
            });
          });
        }

        if (isReset) {
          untracked(() => {
            queueMicrotask(() => this.isChangingEvent.emit(false));
          });
        }
      });
      this.effects.push(effect1);

      if (this.dataManagementClientService.isRead() && this.dataManagementClientService.editClient()) {
        queueMicrotask(() => this.setEnvironmentVariable());
      }
    });
  }

  public calcValidation(): void {
    const client = this.dataManagementClientService.editClient();
    if (!client) {
      return;
    }

    if (client.legalEntity) {
      this.calcValidationLegalEntity(client);
    } else {
      this.calcValidationNormalClient(client);
    }
  }

  private calcValidationLegalEntity(client: IClient): void {
    this.isCompanyValid =
      client.company && client.company.trim() !== '' ? true : false;

    const currentAddress =
      client.addresses[this.dataManagementClientService.currentAddressIndex()];
    if (currentAddress) {
      this.isZipValid =
        currentAddress.zip && currentAddress.zip.trim() !== '' ? true : false;
      this.isCityValid =
        currentAddress.city && currentAddress.city.trim() !== '' ? true : false;
      this.isCountryValid =
        currentAddress.country && currentAddress.country.trim() !== ''
          ? true
          : false;
    }

    this.isFirstNameValid = undefined;
    this.isNameValid = undefined;
    this.isGenderValid = undefined;
  }

  private calcValidationNormalClient(client: IClient): void {
    this.isFirstNameValid =
      client.firstName && client.firstName.trim() !== '' ? true : false;
    this.isNameValid = client.name && client.name.trim() !== '' ? true : false;
    this.isGenderValid =
      client.gender === GenderEnum.female ||
      client.gender === GenderEnum.male ||
      client.gender === GenderEnum.intersexuality
        ? true
        : false;

    const currentAddress =
      client.addresses[this.dataManagementClientService.currentAddressIndex()];
    if (currentAddress) {
      this.isZipValid =
        currentAddress.zip && currentAddress.zip.trim() !== '' ? true : false;
      this.isCityValid =
        currentAddress.city && currentAddress.city.trim() !== '' ? true : false;
      this.isCountryValid =
        currentAddress.country && currentAddress.country.trim() !== ''
          ? true
          : false;
    }

    this.isCompanyValid = undefined;
  }
}

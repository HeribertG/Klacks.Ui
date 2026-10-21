// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Card for editing the address and persona details of a client. Hosts the component-scoped persona services, the
 * header actions and the address type and new address dialog templates, and composes the entity, name, street,
 * locality and communication sub-components.
 * @param isReadOnly - When true, all form fields are disabled
 * @param isChangingEvent - Emits true when the user modifies any field, false on reset
 */

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCalendar, faStreetView } from '@fortawesome/free-solid-svg-icons';
import { NgbDatepickerModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { IAddress } from 'src/app/domain/models/client/client-class';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { GeoServicesConfigService } from 'src/app/domain/services/settings/geo-services-config.service';
import { IconLocationPinComponent } from 'src/app/presentation/icons/icon-location-pin.component';
import { OtherGreyComponent } from 'src/app/presentation/icons/icon-other-grey.component';
import { ExpandableCardComponent } from 'src/app/presentation/shared/expandable-card/expandable-card.component';
import {
  EDIT_ADDRESS_CARD_KEYS,
  EditAddressCardVisibilityService,
} from 'src/app/presentation/workplace/address/edit-address/edit-address-card-visibility.service';
import { AddressPersonaCommunicationsComponent } from './address-persona-communications/address-persona-communications.component';
import { AddressPersonaEntityFieldsComponent } from './address-persona-entity-fields/address-persona-entity-fields.component';
import { AddressPersonaLocalityFieldsComponent } from './address-persona-locality-fields/address-persona-locality-fields.component';
import { AddressPersonaNameFieldsComponent } from './address-persona-name-fields/address-persona-name-fields.component';
import { AddressPersonaStreetFieldsComponent } from './address-persona-street-fields/address-persona-street-fields.component';
import { ADDRESS_PERSONA_COMPANY_FIELD_ID, ADDRESS_PERSONA_FIRST_NAME_FIELD_ID } from './address-persona.constants';
import { AddressPersonaAddressDialogsService } from './services/address-persona-address-dialogs.service';
import { AddressPersonaAddressRemovalService } from './services/address-persona-address-removal.service';
import { AddressPersonaCommunicationService } from './services/address-persona-communication.service';
import { AddressPersonaDisplayService } from './services/address-persona-display.service';
import { AddressPersonaFormSyncService } from './services/address-persona-form-sync.service';
import { AddressPersonaLabelsService } from './services/address-persona-labels.service';
import { AddressPersonaMapLinksService } from './services/address-persona-map-links.service';
import { AddressPersonaStateService } from './services/address-persona-state.service';
import { AddressPersonaTelegramService } from './services/address-persona-telegram.service';
import { AddressPersonaValidationService } from './services/address-persona-validation.service';

@Component({
  selector: 'app-address-persona',
  templateUrl: './address-persona.component.html',
  styleUrls: ['./address-persona.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    NgbTooltipModule,
    NgbDatepickerModule,
    FontAwesomeModule,
    OtherGreyComponent,
    ExpandableCardComponent,
    IconLocationPinComponent,
    AddressPersonaEntityFieldsComponent,
    AddressPersonaNameFieldsComponent,
    AddressPersonaStreetFieldsComponent,
    AddressPersonaLocalityFieldsComponent,
    AddressPersonaCommunicationsComponent,
  ],
  providers: [
    AddressPersonaStateService,
    AddressPersonaValidationService,
    AddressPersonaFormSyncService,
    AddressPersonaCommunicationService,
    AddressPersonaAddressDialogsService,
    AddressPersonaLabelsService,
    AddressPersonaAddressRemovalService,
    AddressPersonaMapLinksService,
    AddressPersonaTelegramService,
    AddressPersonaDisplayService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressPersonaComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly isReadOnly = input(false);
  readonly isChangingEvent = output<boolean>();

  protected readonly dataManagementClientService = inject(DataManagementClientService);
  protected readonly state = inject(AddressPersonaStateService);
  protected readonly dialogs = inject(AddressPersonaAddressDialogsService);
  protected readonly removal = inject(AddressPersonaAddressRemovalService);
  protected readonly labels = inject(AddressPersonaLabelsService);
  protected readonly mapLinks = inject(AddressPersonaMapLinksService);
  protected readonly telegram = inject(AddressPersonaTelegramService);
  protected readonly display = inject(AddressPersonaDisplayService);
  private readonly formSync = inject(AddressPersonaFormSyncService);
  private readonly appSettingsService = inject(AppSettingsManagementService);
  private readonly geoServicesConfig = inject(GeoServicesConfigService);
  private readonly cardVisibility = inject(EditAddressCardVisibilityService);

  protected readonly faCalendar = faCalendar;
  protected readonly faStreetView = faStreetView;

  private readonly ngUnsubscribe = new Subject<void>();

  constructor() {
    this.state.bind({ isReadOnly: this.isReadOnly, isChangingEvent: this.isChangingEvent });
    this.formSync.connect();
  }

  ngOnInit(): void {
    this.labels.initialize();
    void this.appSettingsService.loadSettingsAsync();
    void this.geoServicesConfig.ensureLoaded();
    this.telegram.loadTelegramProviderAvailability();
  }

  ngAfterViewInit(): void {
    this.focusFirstField();
    this.labels.connect(this.ngUnsubscribe);
    this.removal.connect(this.ngUnsubscribe);
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onExpandedChange(isExpanded: boolean): void {
    this.cardVisibility.setExpanded(EDIT_ADDRESS_CARD_KEYS.Persona, isExpanded);
  }

  protected showExternalMapLinks(): boolean {
    return this.mapLinks.showExternalMapLinks();
  }

  protected currentAddress(): IAddress | undefined {
    return this.dataManagementClientService.editClient()?.addresses[
      this.dataManagementClientService.currentAddressIndex()
    ];
  }

  private focusFirstField(): void {
    if (this.dataManagementClientService.editClient()?.legalEntity) {
      const ele = document.getElementById(ADDRESS_PERSONA_COMPANY_FIELD_ID) as HTMLInputElement;
      if (ele) { ele.focus(); }
    } else {
      const ele = document.getElementById(ADDRESS_PERSONA_FIRST_NAME_FIELD_ID) as HTMLInputElement;
      if (ele) { ele.focus(); }
    }
  }
}

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  Component,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnInit,
  OnDestroy,
  Output,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { EditAddressNavComponent } from '../edit-address-nav/edit-address-nav.component';
import { NoteComponent } from '../note/note.component';
import { MembershipComponent } from '../membership/membership.component';
import { ClientContractsComponent } from '../client-contracts/client-contracts.component';
import { ClientGroupsComponent } from '../client-groups/client-groups.component';
import { AddressPersonaComponent } from '../address-persona/address-persona.component';
import { ClientImageComponent } from '../client-image/client-image.component';
import { TranslateModule } from '@ngx-translate/core';
import { ClientMessengerContactsComponent } from 'klacks-plugin-messaging';
import { FeaturePluginStateService } from 'src/app/application/services/feature-plugin-state.service';
import { MESSAGING_PLUGIN_NAME } from 'src/app/domain/constants/feature-plugin.constants';

import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { UrlParameterService } from 'src/app/presentation/services/url-parameter.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { CanComponentDeactivate } from 'src/app/application/helpers/can-deactivate.guard';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType, AddressValidationFailedEvent } from 'src/app/domain/events/domain-events';
import { AsideService } from 'src/app/presentation/aside/aside.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ISuggestedRepliesConfig } from 'src/app/domain/models/assistant/suggested-reply.interface';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-edit-address-home',
  templateUrl: './edit-address-home.component.html',
  styleUrls: ['./edit-address-home.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    AddressPersonaComponent,
    MembershipComponent,
    ClientContractsComponent,
    ClientGroupsComponent,
    NoteComponent,
    ClientImageComponent,
    EditAddressNavComponent,
    ClientMessengerContactsComponent
],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditAddressHomeComponent implements OnInit, OnDestroy, CanComponentDeactivate {
  @Input() isEditClient = false;
  @Output() isEnterEvent = new EventEmitter();

  @HostListener('keyup', ['$event']) onkeyup(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      if (this.dataManagementClientService.areObjectsDirty()) {
        this.isEnterEvent.emit();
      }
    }
  }

  private workplaceStateService = inject(WorkplaceStateService);
  public dataManagementClientService = inject(DataManagementClientService);
  public dataManagementGroupService = inject(DataManagementGroupService);
  public authorizationService = inject(AuthorizationService);
  public featurePluginState = inject(FeaturePluginStateService);
  public readonly messagingPluginName = MESSAGING_PLUGIN_NAME;
  private urlParameterService = inject(UrlParameterService);
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private activatedRoute = inject(ActivatedRoute);
  private eventBus = inject(EVENT_BUS_TOKEN);
  private asideService = inject(AsideService);
  private toastShowService = inject(ToastShowService);
  private translateService = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  isReadOnly = false;
  private returnUrl: string | null = null;

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.searchService.setSearchVisibility(false);
    this.workplaceStateService.setActiveManagerByRoute('edit-address');

    this.savebarService.setSavebarVisibility(true);

    this.subscribeToAddressValidation();

    combineLatest([
      this.activatedRoute.params,
      this.activatedRoute.queryParams
    ]).pipe(takeUntil(this.destroy$)).subscribe(([params, queryParams]) => {
      this.isReadOnly = queryParams['readonly'] === 'true';
      this.returnUrl = queryParams['returnUrl'] || null;

      if (this.returnUrl) {
        this.dataManagementClientService.returnUrl = this.returnUrl;
      }

      const id = params['id'];
      if (id) {
        this.dataManagementClientService.readClient(id);
      } else {
        this.dataManagementClientService.createClient();
      }
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.dataManagementClientService.returnUrl = null;
    this.destroy$.next();
    this.destroy$.complete();
  }

  onIsChanging(event: boolean) {
    if (event === true) {
      this.workplaceStateService.areObjectsDirty();
    } else {
      this.workplaceStateService.checkIfDirtyIsNecessary();
    }
  }

  canDeactivate(): boolean {
    return true;
  }

  private subscribeToAddressValidation(): void {
    this.eventBus.on<AddressValidationFailedEvent>(DomainEventType.ADDRESS_VALIDATION_FAILED)
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        this.workplaceStateService.isDisabled = false;
        this.handleAddressValidationFailed(event);
      });
  }

  private handleAddressValidationFailed(event: AddressValidationFailedEvent): void {
    const addressStr = [event.street, event.zip, event.city].filter(Boolean).join(', ');
    const saveAnywayLabel = this.translateService.instant('address.validation.save-anyway');

    const suggestionOptions = event.suggestions.map((s) => ({
      label: s.displayName,
      value: s.displayName,
    }));

    const repliesConfig: ISuggestedRepliesConfig = {
      prompt: this.translateService.instant('address.validation.no-llm', { address: addressStr }),
      options: [...suggestionOptions, { label: saveAnywayLabel, value: '__save_anyway__' }],
      selectionMode: 'single',
    };

    this.toastShowService.showInteractiveReply(
      repliesConfig,
      (values: string[]) => {
        if (values.length === 0) return;

        if (values.includes('__save_anyway__')) {
          this.dataManagementClientService.clientEditService.forceSaveClient();
          return;
        }

        const selected = event.suggestions.find((s) => s.displayName === values[0]);
        if (!selected) return;

        this.applySelectedAddress(selected.displayName, selected.latitude, selected.longitude);
      },
    );
  }

  private applySelectedAddress(displayName: string, latitude: number, longitude: number): void {
    const client = this.dataManagementClientService.editClient();
    if (!client) return;

    const addressIndex = this.dataManagementClientService.currentAddressIndex();
    const address = client.addresses[addressIndex];
    if (!address) return;

    const parsed = this.parseNominatimDisplayName(displayName);
    if (parsed.street) address.street = parsed.street;
    if (parsed.zip) address.zip = parsed.zip;
    if (parsed.city) address.city = parsed.city;
    address.latitude = latitude;
    address.longitude = longitude;

    this.dataManagementClientService.clientEditService.editClient.update((c) => c ? { ...c } : c);
    this.dataManagementClientService.clientEditService.lastSaveError.set(false);
    this.dataManagementClientService.clientEditService.lastSaveErrorMessage.set('');
  }

  private parseNominatimDisplayName(displayName: string): { street?: string; zip?: string; city?: string } {
    const parts = displayName.split(',').map((p) => p.trim());
    if (parts.length < 3) return {};

    const zipMatch = parts.find((p) => /^\d{4,5}$/.test(p));
    const zipIndex = zipMatch ? parts.indexOf(zipMatch) : -1;

    return {
      street: parts.length > 3 ? parts[0] : undefined,
      zip: zipMatch,
      city: zipIndex >= 0 && zipIndex + 1 < parts.length ? parts[zipIndex + 1] : parts.length > 1 ? parts[1] : undefined,
    };
  }
}

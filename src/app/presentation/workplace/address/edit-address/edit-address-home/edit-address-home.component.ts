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

import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { UrlParameterService } from 'src/app/presentation/services/url-parameter.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { CanComponentDeactivate } from 'src/app/application/helpers/can-deactivate.guard';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, combineLatest } from 'rxjs';

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
    EditAddressNavComponent
],
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
  private urlParameterService = inject(UrlParameterService);
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private activatedRoute = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  isReadOnly = false;
  private returnUrl: string | null = null;

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.searchService.setSearchVisibility(false);
    this.workplaceStateService.setActiveManagerByRoute('edit-address');

    this.savebarService.setSavebarVisibility(true);

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
    const hasError = this.dataManagementClientService.clientEditService.lastSaveError();

    if (hasError) {
      return false;
    }

    const isDirty = this.dataManagementClientService.areObjectsDirty();

    if (isDirty) {
      return confirm('Es gibt ungespeicherte Änderungen. Möchten Sie wirklich fortfahren?');
    }

    return true;
  }
}

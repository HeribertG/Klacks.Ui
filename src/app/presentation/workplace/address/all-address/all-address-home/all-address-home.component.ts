// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Component, inject, OnInit, signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { AllAddressNavComponent } from '../all-address-nav/all-address-nav.component';
import { AllAddressListComponent } from '../all-address-list/all-address-list.component';
import { TranslateModule } from '@ngx-translate/core';
import { NavToggleComponent } from 'src/app/presentation/shared/nav-toggle/nav-toggle.component';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';

import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { AllAddressStateService } from '../services/all-address-state.service';

@Component({
  selector: 'app-all-address-home',
  templateUrl: './all-address-home.component.html',
  styleUrls: ['./all-address-home.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    AllAddressListComponent,
    AllAddressNavComponent,
    NavToggleComponent
],
  providers: [AllAddressStateService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllAddressHomeComponent implements OnInit {
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private allAddressStateService = inject(AllAddressStateService);
  private dataManagementClientService = inject(DataManagementClientService);

  readonly navOpen = signal(false);

  isFilterActive(): boolean {
    return !this.dataManagementClientService.currentFilter.emptyPlaceholder();
  }

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.savebarService.setSavebarVisibility(false);
    this.searchService.setSearchVisibility(true);

    this.allAddressStateService.initializeWorkplaceState();
  }
}

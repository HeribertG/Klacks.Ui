// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, inject, OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { AllAddressNavComponent } from '../all-address-nav/all-address-nav.component';
import { AllAddressListComponent } from '../all-address-list/all-address-list.component';
import { TranslateModule } from '@ngx-translate/core';

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
    AllAddressNavComponent
],
  providers: [AllAddressStateService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllAddressHomeComponent implements OnInit {
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private allAddressStateService = inject(AllAddressStateService);

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.savebarService.setSavebarVisibility(false);
    this.searchService.setSearchVisibility(true);

    this.allAddressStateService.initializeWorkplaceState();
  }
}

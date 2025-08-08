import { Component, inject, OnInit } from '@angular/core';
import { AllAddressNavComponent } from '../all-address-nav/all-address-nav.component';
import { AllAddressListComponent } from '../all-address-list/all-address-list.component';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { FooterService } from 'src/app/services/footer.service';
import { LayoutService } from 'src/app/services/layout.service';
import { SearchService } from 'src/app/services/search.service';
import { AllAddressStateService } from '../../services/all-address-state.service';

@Component({
  selector: 'app-all-address-home',
  templateUrl: './all-address-home.component.html',
  styleUrls: ['./all-address-home.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AllAddressListComponent,
    AllAddressNavComponent,
  ],
  providers: [AllAddressStateService],
})
export class AllAddressHomeComponent implements OnInit {
  private footerService = inject(FooterService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private allAddressStateService = inject(AllAddressStateService);

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.footerService.setFooterVisibility(false);
    this.searchService.setSearchVisibility(true);

    this.allAddressStateService.initializeWorkplaceState();
  }
}

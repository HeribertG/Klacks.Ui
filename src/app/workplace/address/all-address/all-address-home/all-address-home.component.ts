import { Component, inject, OnInit } from '@angular/core';
import { AllAddressNavComponent } from '../all-address-nav/all-address-nav.component';
import { AllAddressListComponent } from '../all-address-list/all-address-list.component';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { FooterService } from 'src/app/services/footer.service';
import { LayoutService } from 'src/app/services/layout.service';
import { SearchService } from 'src/app/services/search.service';
import { WorkplaceStateService } from 'src/app/data/management/workplace-state.service';

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
})
export class AllAddressHomeComponent implements OnInit {
  private footerService = inject(FooterService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private workplaceStateService = inject(WorkplaceStateService);


  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.footerService.setFooterVisibility(false);
    this.searchService.setSearchVisibility(true);

    // Set active manager for client route to enable search functionality
    this.workplaceStateService.setActiveManagerByRoute('client');
  }
}

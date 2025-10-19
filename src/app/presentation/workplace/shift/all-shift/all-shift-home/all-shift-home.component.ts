import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { AllShiftListComponent } from '../all-shift-list/all-shift-list.component';
import { AllShiftNavComponent } from '../all-shift-nav/all-shift-nav.component';
import { TranslateModule } from '@ngx-translate/core';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';

@Component({
  selector: 'app-all-shift-home',
  templateUrl: './all-shift-home.component.html',
  styleUrl: './all-shift-home.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AllShiftListComponent,
    AllShiftNavComponent,
  ],
})
export class AllShiftHomeComponent implements OnInit {
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private workplaceStateService = inject(WorkplaceStateService);

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.savebarService.setSavebarVisibility(false);
    this.searchService.setSearchVisibility(true);

    // Set active manager for shift route to enable search functionality
    this.workplaceStateService.setActiveManagerByRoute('shift');
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CutShiftListComponent } from '../cut-shift-list/cut-shift-list.component';
import { TranslateModule } from '@ngx-translate/core';
import { UrlParameterService } from 'src/app/services/url-parameter.service';
import { DataManagementShiftCutService } from 'src/app/data/management/data-management-shift-cut.service';
import { WorkplaceStateService } from 'src/app/data/management/workplace-state.service';
import { FooterService } from 'src/app/services/footer.service';
import { LayoutService } from 'src/app/services/layout.service';
import { SearchService } from 'src/app/services/search.service';

@Component({
  selector: 'app-cut-shift-home',
  standalone: true,
  imports: [CommonModule, TranslateModule, CutShiftListComponent],
  templateUrl: './cut-shift-home.component.html',
  styleUrl: './cut-shift-home.component.scss',
})
export class CutShiftHomeComponent implements OnInit {

  private urlParameterService = inject(UrlParameterService);
  private dataManagementShiftCutService = inject(DataManagementShiftCutService);
  private workplaceStateService = inject(WorkplaceStateService);
  private footerService = inject(FooterService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    
    // Hide search for cut pages
    this.searchService.setSearchVisibility(false);
    
    // Use new registry approach
    this.workplaceStateService.setActiveManagerByRoute('cut-shift');
    
    // Show footer for this cut page
    this.footerService.setFooterVisibility(true);
    
    if (this.dataManagementShiftCutService.cutShifts.length == 0) {
      const result = this.urlParameterService.parseCurrentUrl(
        '/workplace/cut-shift'
      );
      if (result.isValidRoute && result.hasId && result.id) {
        this.dataManagementShiftCutService.readCutShiftList(result.id);
      }
    }
  }

  onIsChanging(event: any) {
    
    // Forward to WorkplaceStateService to update footer buttons
    if (event === true) {
      this.workplaceStateService.areObjectsDirty();
    } else {
      this.workplaceStateService.checkIfDirtyIsNecessary();
    }
  }
}

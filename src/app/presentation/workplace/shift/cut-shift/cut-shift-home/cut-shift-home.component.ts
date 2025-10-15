/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { CutShiftListComponent } from '../cut-shift-list/cut-shift-list.component';
import { TranslateModule } from '@ngx-translate/core';
import { DataManagementShiftCutService } from 'src/app/domain/services/shift/data-management-shift-cut.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { FooterService } from 'src/app/presentation/services/footer.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';

@Component({
  selector: 'app-cut-shift-home',
  standalone: true,
  imports: [CommonModule, TranslateModule, CutShiftListComponent],
  templateUrl: './cut-shift-home.component.html',
  styleUrl: './cut-shift-home.component.scss',
})
export class CutShiftHomeComponent implements OnInit, OnDestroy {

  private activatedRoute = inject(ActivatedRoute);
  private dataManagementShiftCutService = inject(DataManagementShiftCutService);
  private workplaceStateService = inject(WorkplaceStateService);
  private footerService = inject(FooterService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.searchService.setSearchVisibility(false);
    this.workplaceStateService.setActiveManagerByRoute('cut-shift');
    this.footerService.setFooterVisibility(true);

    this.activatedRoute.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params['id'];

      if (id) {
        this.dataManagementShiftCutService.readCutShiftList(id);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

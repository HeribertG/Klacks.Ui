import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  effect,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AllGroupListComponent } from '../all-group-list/all-group-list.component';
import { AllGroupNavComponent } from '../all-group-nav/all-group-nav.component';
import { TreeGroupComponent } from '../tree-group/tree-group.component';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { EntityName } from 'src/app/domain/models/entity-names.enum';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';

@Component({
  selector: 'app-all-group-home',
  templateUrl: './all-group-home.component.html',
  styleUrls: ['./all-group-home.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    AllGroupListComponent,
    AllGroupNavComponent,
    TreeGroupComponent,
  ],
})
export class AllGroupHomeComponent implements OnInit {
  public authorizationService = inject(AuthorizationService);
  private workplaceStateService = inject(
    WorkplaceStateService
  );
  private localStorageService = inject(LocalStorageService);
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);


  private readonly STORAGE_KEY = 'group-view-mode';
  private _showGrid = true;

  constructor() {
    effect(() => {
      const focusChanged =
        this.workplaceStateService.isFocusChanged();
      const currentEntity =
        this.workplaceStateService.nameOfVisibleEntity();

      if (focusChanged && currentEntity === EntityName.GROUP) {
        setTimeout(() => {
          this.restoreViewMode();
        }, 10);
      }
    });
  }

  get showGrid(): boolean {
    return this._showGrid;
  }

  set showGrid(value: boolean) {
    this._showGrid = value;
    this.searchService.setGroupViewMode(value);
    this.localStorageService.set(this.STORAGE_KEY, value.toString());
  }

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.savebarService.setSavebarVisibility(false);
    this.searchService.setSearchVisibility(true);
    
    // Set active manager for group route to enable search functionality
    this.workplaceStateService.setActiveManagerByRoute('group');
    
    this.restoreViewMode();
  }

  private restoreViewMode(): void {
    const savedViewMode = this.localStorageService.get(this.STORAGE_KEY);
    if (savedViewMode !== null) {
      this._showGrid = savedViewMode === 'true';
    } else {
      this._showGrid = true;
    }

    this.searchService.setGroupViewMode(this._showGrid);
  }

  showAsGrid() {
    this.showGrid = true;
  }

  showAsTree() {
    this.showGrid = false;
  }
}

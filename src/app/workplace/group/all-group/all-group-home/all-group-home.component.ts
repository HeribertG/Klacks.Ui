import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  OnInit,
  effect,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AllGroupListComponent } from '../all-group-list/all-group-list.component';
import { AllGroupNavComponent } from '../all-group-nav/all-group-nav.component';
import { TreeGroupComponent } from '../tree-group/tree-group.component';
import { AuthorizationService } from 'src/app/services/authorization.service';
import { EntityName } from 'src/app/data/management/entity-names.enum';
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';

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
  private dataManagementSwitchboardService = inject(
    DataManagementSwitchboardService
  );
  private localStorageService = inject(LocalStorageService);

  @Input() isGroup = false;
  @Output() isChangingEvent = new EventEmitter();

  private readonly STORAGE_KEY = 'group-view-mode';
  private _showGrid = true;

  constructor() {
    effect(() => {
      const focusChanged =
        this.dataManagementSwitchboardService.isFocusChanged();
      const currentEntity =
        this.dataManagementSwitchboardService.nameOfVisibleEntity();

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
    this.dataManagementSwitchboardService.setGroupSearchVisible(value);
    this.localStorageService.set(this.STORAGE_KEY, value.toString());
  }

  ngOnInit(): void {
    this.restoreViewMode();
    this.dataManagementSwitchboardService.setGroupSearchVisible(this._showGrid);
  }

  private restoreViewMode(): void {
    const savedViewMode = this.localStorageService.get(this.STORAGE_KEY);
    if (savedViewMode !== null) {
      this._showGrid = savedViewMode === 'true';
    } else {
      this._showGrid = true;
    }

    this.dataManagementSwitchboardService.setGroupSearchVisible(this._showGrid);
  }

  showAsGrid() {
    this.showGrid = true;
  }

  showAsTree() {
    this.showGrid = false;
  }
}

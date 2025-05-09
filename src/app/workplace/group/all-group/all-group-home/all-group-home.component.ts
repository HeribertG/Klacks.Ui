import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AllGroupListComponent } from '../all-group-list/all-group-list.component';
import { AllGroupNavComponent } from '../all-group-nav/all-group-nav.component';
import { TreeGroupComponent } from '../tree-group/tree-group.component';
import { AuthorizationService } from 'src/app/services/authorization.service';
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';

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
export class AllGroupHomeComponent {
  public authorizationService = inject(AuthorizationService);
  private dataManagementSwitchboardService = inject(
    DataManagementSwitchboardService
  );

  @Input() isGroup: boolean = false;
  @Output() isChangingEvent = new EventEmitter();

  private _showGrid = false;

  get showGrid(): boolean {
    return this._showGrid;
  }

  set showGrid(value: boolean) {
    this._showGrid = value;
    this.dataManagementSwitchboardService.isSearchVisible = value;
  }

  showAsGrid() {
    this.showGrid = true;
  }

  showAsTree() {
    this.showGrid = false;
  }
}

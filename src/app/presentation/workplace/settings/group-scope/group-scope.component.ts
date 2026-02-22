// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { GroupScopeHeaderComponent } from './group-scope-header/group-scope-header.component';
import { GroupScopeRowComponent } from './group-scope-row/group-scope-row.component';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { DataManagementGroupVisibilityService } from 'src/app/domain/services/group/data-management-group-visibility.service';

@Component({
  selector: 'app-group-scope',
  templateUrl: './group-scope.component.html',
  styleUrl: './group-scope.component.scss',
  standalone: true,
  imports: [GroupScopeRowComponent, GroupScopeHeaderComponent, NgbModule],
})
export class GroupScopeComponent {
  public dataManagementSettingsService = inject(DataManagementSettingsService);
  public translate = inject(TranslateService);
  public dataManagementGroupService = inject(DataManagementGroupService);
  public dataManagementGroupVisibilityService = inject(
    DataManagementGroupVisibilityService
  );
  public readonly rootList = this.dataManagementGroupVisibilityService.rootList;
}

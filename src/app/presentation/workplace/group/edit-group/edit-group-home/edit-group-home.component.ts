// Copyright (c) Heribert Gasparoli Private. All rights reserved.


import {
  Component,
  inject,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { EditGroupItemComponent } from '../edit-group-item/edit-group-item.component';
import { EditGroupMembersComponent } from '../edit-group-members/edit-group-members.component';
import { EditGroupNavComponent } from '../edit-group-nav/edit-group-nav.component';
import { EditGroupParentComponent } from '../edit-group-parent/edit-group-parent.component';
import { UrlParameterService } from 'src/app/presentation/services/url-parameter.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';

@Component({
  selector: 'app-edit-group-home',
  templateUrl: './edit-group-home.component.html',
  styleUrls: ['./edit-group-home.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    EditGroupItemComponent,
    EditGroupMembersComponent,
    EditGroupNavComponent,
    EditGroupParentComponent
],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditGroupHomeComponent implements OnInit {

  private workplaceStateService = inject(
    WorkplaceStateService
  );
  public dataManagementGroupService = inject(DataManagementGroupService);
  private urlParameterService = inject(UrlParameterService);
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    
    // Hide search for edit pages
    this.searchService.setSearchVisibility(false);
    
    // Use new registry approach
    this.workplaceStateService.setActiveManagerByRoute('edit-group');
    
    // Show footer for this edit page
    this.savebarService.setSavebarVisibility(true);
    
    if (this.dataManagementGroupService.editGroup === undefined) {
      const result = this.urlParameterService.parseCurrentUrl(
        '/workplace/edit-group'
      );
      if (result.isValidRoute && result.hasId && result.id) {
        this.dataManagementGroupService.readGroup(result.id);
      } else {
        this.dataManagementGroupService.createGroup();
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onIsChanging(event: any) {
    // Forward to WorkplaceStateService to update footer buttons
    if (event === true) {
      this.workplaceStateService.areObjectsDirty();
    } else {
      this.workplaceStateService.checkIfDirtyIsNecessary();
    }
  }
}

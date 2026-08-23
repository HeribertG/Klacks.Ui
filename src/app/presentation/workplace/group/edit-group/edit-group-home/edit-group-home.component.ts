// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Host page of the group edit view, composing the group cards and the quick print action.
 * @param quickPrintSourceId - Report data source printed by the headline PDF button
 * @param editGroupId - Id of the currently edited group, mirrored as a signal so the
 * OnPush template re-evaluates once the group has been loaded
 */

import {
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { PdfIconComponent } from 'src/app/presentation/icons/pdf-icon.component';
import { QuickPrintActionService } from 'src/app/presentation/services/quick-print-action.service';
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
    EditGroupParentComponent,
    NgbTooltipModule,
    PdfIconComponent
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
  private cdr = inject(ChangeDetectorRef);

  public quickPrintAction = inject(QuickPrintActionService);
  public readonly quickPrintSourceId = 'edit-group';

  public isQuickPrinting = signal(false);
  public editGroupId = signal<string | undefined>(undefined);

  constructor() {
    effect(() => {
      this.dataManagementGroupService.isReset();
      this.dataManagementGroupService.initIsRead();
      this.editGroupId.set(this.dataManagementGroupService.editGroup?.id);
    });
  }

  async onClickQuickPrint(): Promise<void> {
    const groupId = this.dataManagementGroupService.editGroup?.id;
    if (!groupId || this.isQuickPrinting()) {
      return;
    }

    this.isQuickPrinting.set(true);
    this.cdr.markForCheck();
    try {
      await this.quickPrintAction.print({
        sourceId: this.quickPrintSourceId,
        fallbackDataSetIds: ['details'],
        params: { groupId },
        groupName: this.dataManagementGroupService.editGroup?.name ?? '',
      });
    } finally {
      this.isQuickPrinting.set(false);
      this.cdr.markForCheck();
    }
  }

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();

    void this.quickPrintAction.ensureDefaultsLoaded().then(() => this.cdr.markForCheck());
    
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

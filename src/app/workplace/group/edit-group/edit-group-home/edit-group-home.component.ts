import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DataManagementGroupService } from 'src/app/data/management/data-management-group.service';
import { WorkplaceStateService } from 'src/app/data/management/workplace-state.service';
import { EditGroupItemComponent } from '../edit-group-item/edit-group-item.component';
import { EditGroupMembersComponent } from '../edit-group-members/edit-group-members.component';
import { EditGroupNavComponent } from '../edit-group-nav/edit-group-nav.component';
import { EditGroupParentComponent } from '../edit-group-parent/edit-group-parent.component';
import { UrlParameterService } from 'src/app/services/url-parameter.service';

@Component({
  selector: 'app-edit-group-home',
  templateUrl: './edit-group-home.component.html',
  styleUrls: ['./edit-group-home.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    EditGroupItemComponent,
    EditGroupMembersComponent,
    EditGroupNavComponent,
    EditGroupParentComponent,
  ],
})
export class EditGroupHomeComponent implements OnInit {
  @Output() isChangingEvent = new EventEmitter();

  public workplaceStateService = inject(
    WorkplaceStateService
  );
  public dataManagementGroupService = inject(DataManagementGroupService);
  private urlParameterService = inject(UrlParameterService);

  ngOnInit(): void {
    // Use new registry approach
    this.workplaceStateService.setActiveManagerByRoute('edit-group');
    
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
    this.isChangingEvent.emit(event);
  }
}

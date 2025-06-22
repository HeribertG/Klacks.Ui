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
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';
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
  @Input() isEditGroup = false;
  @Output() isChangingEvent = new EventEmitter();

  public dataManagementSwitchboardService = inject(
    DataManagementSwitchboardService
  );
  public dataManagementGroupService = inject(DataManagementGroupService);
  private urlParameterService = inject(UrlParameterService);

  ngOnInit(): void {
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

    this.dataManagementSwitchboardService.nameOfVisibleEntity =
      'DataManagementGroupService_Edit';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onIsChanging(event: any) {
    this.isChangingEvent.emit(event);
  }
}

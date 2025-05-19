import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DataManagementGroupService } from 'src/app/data/management/data-management-group.service';
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';
import { EditGroupItemComponent } from '../edit-group-item/edit-group-item.component';
import { EditGroupMembersComponent } from '../edit-group-members/edit-group-members.component';
import { EditGroupNavComponent } from '../edit-group-nav/edit-group-nav.component';
import { EditGroupParentComponent } from '../edit-group-parent/edit-group-parent.component';

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
  private router = inject(Router);

  ngOnInit(): void {
    if (this.dataManagementGroupService.editGroup === undefined) {
      const tmpUrl = this.router.url;
      const res = tmpUrl.replace('?id=', ';').split(';');
      if (res.length === 2 && res[0] === '/workplace/edit-group') {
        if (!this.dataManagementGroupService.editGroup) {
          this.dataManagementGroupService.readGroup(res[1]);
        }
        return;
      } else {
        // Neue Gruppe erstellen - bevorzugt über den Tree-Service
        this.dataManagementGroupService.createGroup();
      }
    }

    this.dataManagementSwitchboardService.nameOfVisibleEntity =
      'DataManagementGroupService_Edit';
  }

  onIsChanging(event: any) {
    this.isChangingEvent.emit(event);
  }
}

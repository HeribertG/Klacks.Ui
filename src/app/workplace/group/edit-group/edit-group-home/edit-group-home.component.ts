import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { DataManagementGroupService } from 'src/app/data/management/data-management-group.service';
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';

@Component({
  selector: 'app-edit-group-home',
  templateUrl: './edit-group-home.component.html',
  styleUrls: ['./edit-group-home.component.scss'],
})
export class EditGroupHomeComponent implements OnInit {
  @Input() isEditGroup: boolean = false;
  @Output() isChangingEvent = new EventEmitter();

  constructor(
    public dataManagementSwitchboardService: DataManagementSwitchboardService,
    public dataManagementGroupService: DataManagementGroupService,
    private router: Router
  ) {}
  ngOnInit(): void {
    if (this.dataManagementGroupService.editGroup === undefined) {
      const tmpUrl = this.router.url;
      const res = tmpUrl.replace('?id=', ';').split(';');
      if (res.length === 2 && res[0] === '/workplace/edit-group') {
        this.dataManagementGroupService.readGroup(res[1]);
        return;
      } else {
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

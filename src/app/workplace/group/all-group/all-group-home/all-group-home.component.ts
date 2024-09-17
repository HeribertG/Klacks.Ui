import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { DataManagementGroupService } from 'src/app/data/management/data-management-group.service';
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';

@Component({
  selector: 'app-all-group-home',
  templateUrl: './all-group-home.component.html',
  styleUrls: ['./all-group-home.component.scss'],
})
export class AllGroupHomeComponent {
  @Input() isGroup: boolean = false;
  @Output() isChangingEvent = new EventEmitter();
  constructor() {}
}

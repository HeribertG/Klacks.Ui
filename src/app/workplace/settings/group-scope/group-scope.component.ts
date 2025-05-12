import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DataManagementGroupService } from 'src/app/data/management/data-management-group.service';

@Component({
  selector: 'app-group-scope',
  templateUrl: './group-scope.component.html',
  styleUrl: './group-scope.component.scss',
  standalone: true,
  imports: [],
})
export class GroupScopeComponent implements OnInit {
  @Output() isChangingEvent = new EventEmitter<boolean>();

  public translate = inject(TranslateService);
  public dataManagementGroupService = inject(DataManagementGroupService);

  ngOnInit(): void {
    //this.dataManagementGroupService.readData();
  }

  onIsChanging(value: boolean): void {
    this.isChangingEvent.emit(value);
  }
}

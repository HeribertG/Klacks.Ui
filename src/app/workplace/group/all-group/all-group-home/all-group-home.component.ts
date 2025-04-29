import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AllGroupListComponent } from '../all-group-list/all-group-list.component';
import { AllGroupNavComponent } from '../all-group-nav/all-group-nav.component';
import { TreeGroupComponent } from '../tree-group/tree-group.component';

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
  @Input() isGroup: boolean = false;
  @Output() isChangingEvent = new EventEmitter();
  showGrid = false;

  showAsGrid() {
    this.showGrid = true;
  }
  showAsTree() {
    this.showGrid = false;
  }
  constructor() {}
}

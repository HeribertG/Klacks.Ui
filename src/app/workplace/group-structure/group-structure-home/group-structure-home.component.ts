import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { TreeGroupComponent } from '../tree-group/tree-group.component';

@Component({
  selector: 'app-group-structure-home',
  templateUrl: './group-structure-home.component.html',
  styleUrl: './group-structure-home.component.scss',
  standalone: true,
  imports: [CommonModule, TranslateModule, TreeGroupComponent],
})
export class GroupStructureHomeComponent {
  @Input() isGroupStructure: boolean = false;
  @Output() isChangingEvent = new EventEmitter();
}

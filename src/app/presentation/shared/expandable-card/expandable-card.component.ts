import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconAngleDownComponent } from '../../icons/icon-angle-down.component';
import { IconAngleRightComponent } from '../../icons/icon-angle-right.component';

@Component({
  selector: 'app-expandable-card',
  templateUrl: './expandable-card.component.html',
  styleUrls: ['./expandable-card.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IconAngleDownComponent,
    IconAngleRightComponent,
  ],
})
export class ExpandableCardComponent implements OnInit {
  @Input() headerTitle = '';
  @Input() initiallyExpanded = true;
  @Input() showExpandButton = true;

  isExpanded = true;

  ngOnInit(): void {
    this.isExpanded = this.initiallyExpanded;
  }

  toggle(): void {
    this.isExpanded = !this.isExpanded;
  }

  get displayStyle(): string {
    return this.isExpanded ? 'block' : 'none';
  }
}

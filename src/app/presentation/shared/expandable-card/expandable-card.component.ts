// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectorRef, Component, Input, OnInit, AfterViewInit, inject,
  ChangeDetectionStrategy,
} from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpandableCardComponent implements OnInit, AfterViewInit {
  @Input() headerTitle = '';
  @Input() initiallyExpanded = true;
  @Input() showExpandButton = true;

  private cdr = inject(ChangeDetectorRef);

  isExpanded = true;
  private viewInitialized = false;

  ngOnInit(): void {
    this.isExpanded = true;
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    if (!this.initiallyExpanded) {
      setTimeout(() => {
        this.isExpanded = false;
        this.cdr.markForCheck();
      }, 0);
    }
  }

  toggle(): void {
    this.isExpanded = !this.isExpanded;
  }

  get displayStyle(): string {
    if (!this.viewInitialized) {
      return 'block';
    }
    return this.isExpanded ? 'block' : 'none';
  }
}

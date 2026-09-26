// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, AfterViewInit, Output, inject,
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
  @Output() expandedChange = new EventEmitter<boolean>();

  private cdr = inject(ChangeDetectorRef);

  isExpanded = true;
  private viewInitialized = false;
  private expandRequested = false;

  ngOnInit(): void {
    this.isExpanded = true;
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    if (!this.initiallyExpanded) {
      setTimeout(() => {
        if (this.expandRequested) {
          return;
        }
        this.isExpanded = false;
        this.cdr.markForCheck();
        this.expandedChange.emit(false);
      }, 0);
    } else {
      this.expandedChange.emit(true);
    }
  }

  expand(): void {
    this.expandRequested = true;
    if (this.isExpanded) {
      return;
    }
    this.isExpanded = true;
    this.cdr.markForCheck();
    this.expandedChange.emit(true);
  }

  toggle(): void {
    this.isExpanded = !this.isExpanded;
    this.expandedChange.emit(this.isExpanded);
  }

  get displayStyle(): string {
    if (!this.viewInitialized) {
      return 'block';
    }
    return this.isExpanded ? 'block' : 'none';
  }
}

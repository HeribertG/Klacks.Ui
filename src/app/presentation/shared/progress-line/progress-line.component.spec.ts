// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProgressLineComponent } from './progress-line.component';

describe('ProgressLineComponent', () => {
  let fixture: ComponentFixture<ProgressLineComponent>;

  function line(): HTMLElement | null {
    return fixture.nativeElement.querySelector('[role="progressbar"]');
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ProgressLineComponent] });
    fixture = TestBed.createComponent(ProgressLineComponent);
  });

  it('renders nothing while inactive', () => {
    // Arrange / Act
    fixture.detectChanges();

    // Assert
    expect(line()).toBeNull();
  });

  it('renders an indeterminate progressbar while active', () => {
    // Arrange
    fixture.componentRef.setInput('active', true);

    // Act
    fixture.detectChanges();

    // Assert
    expect(line()).not.toBeNull();
    expect(line()?.hasAttribute('aria-valuenow')).toBe(false);
  });

  it('exposes the label as accessible name', () => {
    // Arrange
    fixture.componentRef.setInput('active', true);
    fixture.componentRef.setInput('label', 'AutoWizard');

    // Act
    fixture.detectChanges();

    // Assert
    expect(line()?.getAttribute('aria-label')).toBe('AutoWizard');
  });

  it('removes the line again when it becomes inactive', () => {
    // Arrange
    fixture.componentRef.setInput('active', true);
    fixture.detectChanges();

    // Act
    fixture.componentRef.setInput('active', false);
    fixture.detectChanges();

    // Assert
    expect(line()).toBeNull();
  });
});

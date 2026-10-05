// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { NavToggleComponent } from './nav-toggle.component';

describe('NavToggleComponent', () => {
  const create = () => {
    TestBed.configureTestingModule({ imports: [NavToggleComponent, TranslateModule.forRoot()] });
    const fixture = TestBed.createComponent(NavToggleComponent);
    fixture.detectChanges();
    return fixture;
  };

  it('toggles the open state on click and reflects it in aria-expanded', () => {
    const fixture = create();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    expect(fixture.componentInstance.open()).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('false');

    button.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.open()).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('shows the indicator dot only while a filter is active', () => {
    const fixture = create();
    expect(fixture.nativeElement.querySelector('.nav-toggle-dot')).toBeNull();

    fixture.componentRef.setInput('filterActive', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.nav-toggle-dot')).not.toBeNull();
  });
});

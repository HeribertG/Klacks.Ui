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

  it('closes on a click outside and keeps open for clicks inside the panel', () => {
    const fixture = create();
    const panel = document.createElement('div');
    panel.className = 'container-address-nav';
    const inner = document.createElement('span');
    panel.appendChild(inner);
    document.body.appendChild(panel);
    fixture.componentInstance.open.set(true);

    inner.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(fixture.componentInstance.open()).toBe(true);

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(fixture.componentInstance.open()).toBe(false);

    panel.remove();
  });

  it('closes on Escape', () => {
    const fixture = create();
    fixture.componentInstance.open.set(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('shows the indicator dot only while a filter is active', () => {
    const fixture = create();
    expect(fixture.nativeElement.querySelector('.nav-toggle-dot')).toBeNull();

    fixture.componentRef.setInput('filterActive', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.nav-toggle-dot')).not.toBeNull();
  });
});

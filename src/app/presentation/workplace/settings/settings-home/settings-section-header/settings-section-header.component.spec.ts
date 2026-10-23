// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { SettingsSectionHeaderComponent } from './settings-section-header.component';

describe('SettingsSectionHeaderComponent', () => {
  let fixture: ComponentFixture<SettingsSectionHeaderComponent>;

  const header = (): HTMLElement => fixture.nativeElement.querySelector('.section-header') as HTMLElement;

  const render = (expanded: boolean): void => {
    fixture = TestBed.createComponent(SettingsSectionHeaderComponent);
    fixture.componentRef.setInput('titleKey', 'setting.section.work');
    fixture.componentRef.setInput('expanded', expanded);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsSectionHeaderComponent, TranslateModule.forRoot()],
    }).compileComponents();
  });

  it('renders the translated title as a focusable button-like header', () => {
    render(true);

    expect(header().textContent?.trim()).toBe('setting.section.work');
    expect(header().getAttribute('tabindex')).toBe('0');
    expect(header().getAttribute('role')).toBe('button');
  });

  it('shows the down arrow while expanded and the right arrow while collapsed', () => {
    render(true);
    expect(header().querySelector('app-icon-angle-down')).not.toBeNull();
    expect(header().querySelector('app-icon-angle-right')).toBeNull();

    fixture.componentRef.setInput('expanded', false);
    fixture.detectChanges();

    expect(header().querySelector('app-icon-angle-down')).toBeNull();
    expect(header().querySelector('app-icon-angle-right')).not.toBeNull();
  });

  it('emits toggled once per click, also when the arrow button is clicked, and on Enter', () => {
    render(true);
    const toggled = vi.fn();
    fixture.componentInstance.toggled.subscribe(toggled);

    header().click();
    (header().querySelector('.section-toggle-button') as HTMLElement).click();
    header().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(toggled).toHaveBeenCalledTimes(3);
  });
});

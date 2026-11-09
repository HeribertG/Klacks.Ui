// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { ActiveIndustriesSettingsComponent } from 'src/app/presentation/workplace/settings/active-industries-settings/active-industries-settings.component';
import { CompanySetupComponent } from './company-setup.component';

@Component({ selector: 'app-active-industries-settings', standalone: true, template: '<div id="industry-card-stub"></div>' })
class ActiveIndustriesSettingsStubComponent {}

const flushPromises = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

describe('CompanySetupComponent', () => {
  let fixture: ComponentFixture<CompanySetupComponent>;
  let contactSettings: ReturnType<typeof signal<{ globalCalendarCountry: string }>>;
  let loadSettingsAsync: ReturnType<typeof vi.fn>;
  let navigationService: any;

  const element = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    contactSettings = signal({ globalCalendarCountry: 'CH' });
    loadSettingsAsync = vi.fn().mockResolvedValue(undefined);
    navigationService = { navigateToDashboard: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CompanySetupComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: DataManagementSettingsService,
          useValue: { appSettings: { loadSettingsAsync, contactSettings } },
        },
        { provide: NavigationService, useValue: navigationService },
      ],
    })
      .overrideComponent(CompanySetupComponent, {
        remove: { imports: [ActiveIndustriesSettingsComponent] },
        add: { imports: [ActiveIndustriesSettingsStubComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CompanySetupComponent);
  });

  const render = async (): Promise<void> => {
    fixture.detectChanges();
    await flushPromises();
    fixture.detectChanges();
  };

  it('loads the app settings before it shows the industry card', async () => {
    fixture.detectChanges();
    expect(element().querySelector('#industry-card-stub')).toBeNull();

    await render();

    expect(loadSettingsAsync).toHaveBeenCalledTimes(1);
    expect(element().querySelector('#industry-card-stub')).not.toBeNull();
  });

  it('shows the installed country by name, read-only', async () => {
    await render();

    expect(element().querySelector('#company-setup-country')?.textContent?.trim()).toBe('Switzerland');
    expect(element().querySelector('input, select')).toBeNull();
  });

  it('explains when the installation applied no country profile', async () => {
    contactSettings.set({ globalCalendarCountry: '' });

    await render();

    expect(element().querySelector('#company-setup-country')).toBeNull();
    expect(element().querySelector('#company-setup-no-country')).not.toBeNull();
  });

  it('continues to the dashboard', async () => {
    await render();

    (element().querySelector('#company-setup-continue') as HTMLButtonElement).click();

    expect(navigationService.navigateToDashboard).toHaveBeenCalled();
  });
});

// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { ExportFormatOverridesSettingComponent } from './export-format-overrides-setting.component';
import {
  DataExportFormatOverridesService,
  ExportFormatFamilies,
  IExportFormatOverridesResponse,
} from 'src/app/infrastructure/api/settings/data-export-format-overrides.service';

describe('ExportFormatOverridesSettingComponent', () => {
  let component: ExportFormatOverridesSettingComponent;
  let fixture: ComponentFixture<ExportFormatOverridesSettingComponent>;
  let mockService: Partial<
    Record<keyof DataExportFormatOverridesService, ReturnType<typeof vi.fn>>
  >;

  const response: IExportFormatOverridesResponse = {
    currentVersion: '1.0.20',
    formats: [
      {
        formatKey: 'datev',
        family: ExportFormatFamilies.Payroll,
        allowedKeys: ['delimiter', 'encoding'],
        override: null,
      },
      {
        formatKey: 'abacus',
        family: ExportFormatFamilies.Order,
        allowedKeys: ['dateFormat', 'currencyCode'],
        override: {
          formatKey: 'abacus',
          patchJson: '{"dateFormat":"dd.MM.yyyy"}',
          isEnabled: true,
          note: 'TICKET-42',
          createdUnderVersion: '1.0.18',
          updateTime: null,
        },
      },
    ],
  };

  beforeEach(async () => {
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:preview');
    window.URL.revokeObjectURL = vi.fn();

    mockService = {
      getOverrides: vi.fn().mockReturnValue(of(response)),
      saveOverride: vi.fn().mockReturnValue(of(response.formats[1].override)),
      deleteOverride: vi.fn().mockReturnValue(of(void 0)),
      downloadPreview: vi.fn().mockReturnValue(
        of(
          new HttpResponse<Blob>({
            body: new Blob(['preview']),
            headers: new HttpHeaders({
              'content-disposition': 'attachment; filename="preview_datev.csv"',
            }),
          })
        )
      ),
    };

    await TestBed.configureTestingModule({
      imports: [ExportFormatOverridesSettingComponent, TranslateModule.forRoot()],
      providers: [{ provide: DataExportFormatOverridesService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ExportFormatOverridesSettingComponent);
    component = fixture.componentInstance;
  });

  async function initComponent(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('loads the overrides on init and selects the first format', async () => {
    await initComponent();
    expect(mockService.getOverrides).toHaveBeenCalled();
    expect(component.selectedFormatKey()).toBe('datev');
  });

  it('groups the formats by family in fixed family order', async () => {
    await initComponent();
    const groups = component.formatGroups();
    expect(groups.map((g) => g.family)).toEqual([
      ExportFormatFamilies.Order,
      ExportFormatFamilies.Payroll,
    ]);
    expect(groups[0].options[0].label).toContain('abacus');
  });

  it('marks formats with an active override in the option label', async () => {
    await initComponent();
    const orderGroup = component.formatGroups()[0];
    expect(orderGroup.options[0].label).toBe('● abacus');
  });

  it('saves the override with the form values and shows a success message', async () => {
    await initComponent();
    component.patchJson.set('{"delimiter":","}');
    component.note.set('TICKET-7');
    component.isEnabled.set(true);
    await component.save();
    expect(mockService.saveOverride).toHaveBeenCalledWith('datev', {
      patchJson: '{"delimiter":","}',
      isEnabled: true,
      note: 'TICKET-7',
    });
    expect(component.actionMessage()).not.toBe('');
    expect(component.errorMessage()).toBe('');
  });

  it('shows the server error message when saving fails with 400', async () => {
    mockService.saveOverride!.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: 'Unknown patch key: foo',
          })
      )
    );
    await initComponent();
    await component.save();
    fixture.detectChanges();
    expect(component.errorMessage()).toBe('Unknown patch key: foo');
    const errorElement: HTMLElement | null = fixture.nativeElement.querySelector(
      '#export-format-overrides-error-message'
    );
    expect(errorElement?.textContent).toContain('Unknown patch key: foo');
  });

  it('shows the version warning when the override was created under an older version', async () => {
    await initComponent();
    component.onFormatSelected('abacus');
    fixture.detectChanges();
    expect(component.versionWarning()).toEqual({ created: '1.0.18', current: '1.0.20' });
    const warningElement: HTMLElement | null = fixture.nativeElement.querySelector(
      '#export-format-overrides-version-warning'
    );
    expect(warningElement).not.toBeNull();
  });

  it('shows no version warning when the override matches the current version', async () => {
    await initComponent();
    expect(component.versionWarning()).toBeNull();
  });

  it('deletes the override and reloads the list', async () => {
    await initComponent();
    component.onFormatSelected('abacus');
    await component.removeOverride();
    expect(mockService.deleteOverride).toHaveBeenCalledWith('abacus');
    expect(mockService.getOverrides).toHaveBeenCalledTimes(2);
    expect(component.actionMessage()).not.toBe('');
  });

  it('requests the preview with the current textarea content', async () => {
    await initComponent();
    component.patchJson.set('{"encoding":"utf-8"}');
    await component.downloadPreview();
    expect(mockService.downloadPreview).toHaveBeenCalledWith('datev', '{"encoding":"utf-8"}');
  });
});

// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { LocalSttStatusComponent } from './local-stt-status.component';
import { LocalSttStatusView } from 'src/app/domain/models/assistant/local-stt-status-view.interface';
import { WhisperOperationStatuses, WhisperOperationTypes } from 'src/app/domain/constants/whisper-operation.constants';
import { WhisperOperationInfo } from 'src/app/domain/models/assistant/whisper-operation-info.interface';

const STATUS_ELEMENT_ID = 'host-status-text';

const operation = (overrides: Partial<WhisperOperationInfo> = {}): WhisperOperationInfo => ({
  id: 'op-1',
  operationType: WhisperOperationTypes.Install,
  status: WhisperOperationStatuses.Running,
  modelAlias: 'parakeet-v3',
  message: null,
  requestedAt: new Date().toISOString(),
  startedAt: new Date().toISOString(),
  completedAt: null,
  ...overrides,
});

const baseView: LocalSttStatusView = {
  known: true,
  unavailable: false,
  installed: false,
  engineName: '',
  activeOperation: null,
  installActive: false,
  awaitingUpdater: false,
  waitingMinutes: 0,
  otherOperationActive: false,
  failedInstall: null,
};

@Component({
  standalone: true,
  imports: [LocalSttStatusComponent],
  template: `
    <app-local-stt-status [view]="view()" statusElementId="${STATUS_ELEMENT_ID}" (retry)="retries = retries + 1">
      <div class="projected-column">projected</div>
    </app-local-stt-status>
  `,
})
class HostComponent {
  public readonly view = signal<LocalSttStatusView>(baseView);
  public retries = 0;
}

describe('LocalSttStatusComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const element = (): HTMLElement => fixture.nativeElement;
  const text = (): string => element().textContent ?? '';
  const show = (overrides: Partial<LocalSttStatusView>): void => {
    host.view.set({ ...baseView, ...overrides });
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('wraps the status in a polite live region that stays in the DOM', () => {
    const region = element().querySelector('[role="status"]');
    expect(region?.getAttribute('aria-live')).toBe('polite');

    show({ known: false, unavailable: true });
    expect(element().querySelector('[role="status"]')).toBe(region);
  });

  it('gives the status text the id the host asked for', () => {
    expect(element().querySelector(`#${STATUS_ELEMENT_ID}`)?.textContent).toContain(
      'setting.speech.whisper-plugin.status-not-installed',
    );
  });

  it('projects extra columns into the status row', () => {
    expect(element().querySelector('.row-line .projected-column')).toBeTruthy();
  });

  it('shows the installed engine in the success style', () => {
    show({ installed: true, engineName: 'Parakeet' });
    expect(element().querySelector(`#${STATUS_ELEMENT_ID}.status-text-success`)).toBeTruthy();
    expect(text()).toContain('setting.speech.whisper-plugin.status-installed');
  });

  it('shows a running install with the install hint', () => {
    show({ activeOperation: operation(), installActive: true });
    expect(text()).toContain('setting.speech.whisper-plugin.status-installing');
    expect(text()).toContain('setting.speech.whisper-plugin.install-hint');
  });

  it('shows a running uninstall', () => {
    show({ activeOperation: operation({ operationType: WhisperOperationTypes.Uninstall }), installActive: false });
    expect(text()).toContain('setting.speech.whisper-plugin.status-uninstalling');
  });

  it('shows the stuck request in the error style with its hint', () => {
    show({ activeOperation: operation(), installActive: true, awaitingUpdater: true, waitingMinutes: 20 });
    expect(element().querySelector(`#${STATUS_ELEMENT_ID}.status-text-error`)).toBeTruthy();
    expect(text()).toContain('setting.speech.whisper-plugin.awaiting-updater-hint');
    expect(text()).not.toContain('setting.speech.whisper-plugin.install-hint');
  });

  it('shows a failed install with its message', () => {
    show({ failedInstall: operation({ status: WhisperOperationStatuses.Failed, message: 'Download failed' }) });
    expect(element().querySelector(`#${STATUS_ELEMENT_ID}.status-text-error`)?.textContent).toContain('Download failed');
  });

  it('flags a locked queue', () => {
    show({ otherOperationActive: true });
    expect(text()).toContain('setting.speech.whisper-plugin.other-operation-active');
  });

  it('shows only the unavailable hint with a retry button while the status is unknown', () => {
    show({ known: false, unavailable: true });

    expect(element().querySelector(`#${STATUS_ELEMENT_ID}`)).toBeNull();
    expect(text()).toContain('setting.speech.whisper-plugin.status-unavailable');

    element().querySelector<HTMLButtonElement>('.status-retry-btn')!.click();
    expect(host.retries).toBe(1);
  });

  it('keeps the last status next to the unavailable hint when it may be stale', () => {
    show({ unavailable: true });
    expect(element().querySelector(`#${STATUS_ELEMENT_ID}`)).toBeTruthy();
    expect(element().querySelector('.status-retry-btn')).toBeTruthy();
  });

  it('shows no retry hint while the status is available', () => {
    expect(element().querySelector('.status-retry-btn')).toBeNull();
  });

  it('puts the unavailable hint on its own line below the status row', () => {
    show({ unavailable: true });
    const rows = Array.from(element().querySelectorAll<HTMLElement>('.row-line'));
    expect(rows.length).toBe(2);
    rows.forEach((row) => expect(getComputedStyle(row).display).toBe('flex'));
  });
});

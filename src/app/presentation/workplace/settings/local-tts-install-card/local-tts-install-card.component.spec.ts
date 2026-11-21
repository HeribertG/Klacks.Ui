// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { LocalTtsInstallCardComponent } from './local-tts-install-card.component';
import { LocalTtsEngineService } from 'src/app/domain/services/speech/local-tts-engine.service';
import { LocalTtsStatus } from 'src/app/domain/models/assistant/local-tts-status.interface';
import { LocalTtsLicense } from 'src/app/domain/models/assistant/local-tts-license.interface';
import { LOCAL_TTS_KEYS } from 'src/app/domain/constants/local-tts.constants';

const LICENSE: LocalTtsLicense = { version: 'openrail-m-supertonic3-3cadd1ee', text: 'licence text' };

function makeLocalTtsFake(initial: LocalTtsStatus | null) {
  const status = signal<LocalTtsStatus | null>(initial);
  const busy = signal(false);
  const pollingSuspended = signal(false);
  return {
    status,
    license: signal<LocalTtsLicense | null>(LICENSE),
    licenseLoadFailed: signal(false),
    busy,
    installErrorKey: signal(''),
    pollingSuspended,
    isInstalled: computed(() => !!status()?.installed),
    isPending: computed(() => !!status()?.pending),
    lastError: computed(() => {
      const s = status();
      return s && !s.pending && !s.installed ? s.lastError : null;
    }),
    statusUnavailable: computed(() => !status() || pollingSuspended()),
    canInstall: computed(() => !!status() && !status()?.installed && !status()?.pending && !busy()),
    attach: vi.fn().mockResolvedValue(undefined),
    detach: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
    loadLicense: vi.fn().mockResolvedValue(undefined),
    install: vi.fn().mockResolvedValue(true),
  };
}

function statusFixture(overrides: Partial<LocalTtsStatus> = {}): LocalTtsStatus {
  return {
    installed: false,
    pending: false,
    lastError: null,
    licenseAccepted: false,
    licenseAcceptedAt: null,
    sizeBytes: 128774318,
    ...overrides,
  };
}

describe('LocalTtsInstallCardComponent', () => {
  let fixture: ComponentFixture<LocalTtsInstallCardComponent>;
  let localTts: ReturnType<typeof makeLocalTtsFake>;

  const element = (): HTMLElement => fixture.nativeElement;
  const statusText = (): string => element().querySelector('#local-tts-status-text')?.textContent?.trim() ?? '';
  const installButton = (): HTMLButtonElement | null => element().querySelector('#local-tts-install-btn');

  const render = (status: LocalTtsStatus | null): void => {
    localTts = makeLocalTtsFake(status);
    TestBed.configureTestingModule({
      imports: [LocalTtsInstallCardComponent, TranslateModule.forRoot()],
      providers: [{ provide: LocalTtsEngineService, useValue: localTts }],
    });
    fixture = TestBed.createComponent(LocalTtsInstallCardComponent);
    fixture.detectChanges();
  };

  it('attaches to the shared service and detaches on destroy', () => {
    render(statusFixture());
    expect(localTts.attach).toHaveBeenCalled();
    fixture.destroy();
    expect(localTts.detach).toHaveBeenCalled();
  });

  it('shows the download size in megabytes from the status', () => {
    render(statusFixture());
    expect(fixture.componentInstance.sizeMegabytes()).toBe(129);
  });

  it('offers the install while the voice is not installed', () => {
    render(statusFixture());
    expect(statusText()).toBe(LOCAL_TTS_KEYS.STATUS_NOT_INSTALLED);
    expect(installButton()?.disabled).toBe(false);
  });

  it('opens the licence dialog and loads the text instead of installing directly', () => {
    render(statusFixture());
    installButton()!.click();
    fixture.detectChanges();

    expect(element().querySelector('app-local-tts-license-dialog')).not.toBeNull();
    expect(localTts.loadLicense).toHaveBeenCalled();
    expect(localTts.install).not.toHaveBeenCalled();
  });

  it('installs with the accepted licence version and closes the dialog', async () => {
    render(statusFixture());
    fixture.componentInstance.openDialog();
    fixture.detectChanges();

    await fixture.componentInstance.onLicenseAccepted(LICENSE.version);
    fixture.detectChanges();

    expect(localTts.install).toHaveBeenCalledWith(LICENSE.version);
    expect(element().querySelector('app-local-tts-license-dialog')).toBeNull();
  });

  it('shows a pending installation without an enabled install button', () => {
    render(statusFixture({ pending: true }));
    expect(statusText()).toBe(LOCAL_TTS_KEYS.STATUS_PENDING);
    expect(installButton()?.disabled).toBe(true);
  });

  it('shows the installed state without an install button', () => {
    render(statusFixture({ installed: true, licenseAccepted: true }));
    expect(statusText()).toBe(LOCAL_TTS_KEYS.STATUS_INSTALLED);
    expect(installButton()).toBeNull();
    expect(element().querySelector('#local-tts-license-accepted')).not.toBeNull();
  });

  it('shows a failed installation and offers a retry through the dialog', () => {
    render(statusFixture({ lastError: 'checksum mismatch' }));
    expect(element().querySelector('#local-tts-status-text')?.classList).toContain('status-text-error');
    expect(installButton()?.textContent?.trim()).toBe(LOCAL_TTS_KEYS.RETRY);

    installButton()!.click();
    fixture.detectChanges();
    expect(element().querySelector('app-local-tts-license-dialog')).not.toBeNull();
  });

  it('offers to reload an unknown status', () => {
    render(null);
    expect(statusText()).toBe(LOCAL_TTS_KEYS.STATUS_UNAVAILABLE);
    element().querySelector<HTMLButtonElement>('#local-tts-refresh-btn')!.click();
    expect(localTts.refresh).toHaveBeenCalled();
  });

  it('announces status changes in a polite live region', () => {
    render(statusFixture());
    expect(element().querySelector('[role="status"][aria-live="polite"] #local-tts-status-text')).not.toBeNull();
  });
});

// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { LocalTtsLicenseDialogComponent } from './local-tts-license-dialog.component';
import { LocalTtsLicense } from 'src/app/domain/models/assistant/local-tts-license.interface';

const LICENSE: LocalTtsLicense = { version: 'openrail-m-supertonic3-3cadd1ee', text: 'BigScience OpenRAIL-M License\nAttachment A' };

describe('LocalTtsLicenseDialogComponent', () => {
  let fixture: ComponentFixture<LocalTtsLicenseDialogComponent>;

  const element = (): HTMLElement => fixture.nativeElement;
  const acceptButton = (): HTMLButtonElement => element().querySelector('#local-tts-license-accept-btn')!;
  const checkbox = (): HTMLInputElement => element().querySelector('#local-tts-license-consent')!;

  const render = (license: LocalTtsLicense | null, options: { busy?: boolean; loadFailed?: boolean } = {}): void => {
    TestBed.configureTestingModule({ imports: [LocalTtsLicenseDialogComponent, TranslateModule.forRoot()] });
    fixture = TestBed.createComponent(LocalTtsLicenseDialogComponent);
    fixture.componentRef.setInput('license', license);
    fixture.componentRef.setInput('busy', options.busy ?? false);
    fixture.componentRef.setInput('loadFailed', options.loadFailed ?? false);
    fixture.detectChanges();
  };

  const tick = (): void => {
    checkbox().checked = true;
    checkbox().dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };

  it('shows the full licence text in a scrollable box', () => {
    render(LICENSE);
    expect(element().querySelector('#local-tts-license-text')?.textContent).toBe(LICENSE.text);
    expect(element().querySelector('.license-text-box')).not.toBeNull();
  });

  it('keeps the install button disabled until the checkbox is ticked', () => {
    render(LICENSE);
    expect(acceptButton().disabled).toBe(true);

    tick();
    expect(acceptButton().disabled).toBe(false);
  });

  it('disables the button again when the checkbox is cleared', () => {
    render(LICENSE);
    tick();
    checkbox().checked = false;
    checkbox().dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(acceptButton().disabled).toBe(true);
  });

  it('cannot be accepted before the licence text has loaded', () => {
    render(null);
    expect(checkbox().disabled).toBe(true);
    expect(acceptButton().disabled).toBe(true);
  });

  it('reports a licence text that could not be loaded', () => {
    render(null, { loadFailed: true });
    expect(element().querySelector('.status-text-error')?.textContent).toContain('setting.speech.local-tts.dialog-load-failed');
  });

  it('cannot be accepted while the request is being sent', () => {
    render(LICENSE, { busy: true });
    tick();
    expect(acceptButton().disabled).toBe(true);
  });

  it('emits the licence version it showed when accepted', () => {
    render(LICENSE);
    const accepted = vi.fn();
    fixture.componentInstance.accepted.subscribe(accepted);
    tick();

    acceptButton().click();

    expect(accepted).toHaveBeenCalledWith(LICENSE.version);
  });

  it('does not emit without consent', () => {
    render(LICENSE);
    const accepted = vi.fn();
    fixture.componentInstance.accepted.subscribe(accepted);

    fixture.componentInstance.onAccept();

    expect(accepted).not.toHaveBeenCalled();
  });

  it('emits dismissed on cancel', () => {
    render(LICENSE);
    const dismissed = vi.fn();
    fixture.componentInstance.dismissed.subscribe(dismissed);

    element().querySelector<HTMLButtonElement>('#local-tts-license-cancel-btn')!.click();

    expect(dismissed).toHaveBeenCalled();
  });
});

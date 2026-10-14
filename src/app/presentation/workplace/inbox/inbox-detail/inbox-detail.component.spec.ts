// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { InboxDetailComponent } from './inbox-detail.component';
import { InboxService } from 'src/app/domain/services/email/inbox.service';
import { TranslationService } from 'src/app/domain/services/translation/translation.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ROLE_ADMIN } from 'src/app/domain/constants/permissions.constants';
import { IReceivedEmail } from 'src/app/domain/models/email/received-email.model';
import { InboxEmailPdfExportService } from '../services/inbox-email-pdf-export.service';
import { LocaleService } from 'src/app/application/services/locale.service';
import { CompanyDateTimePipe } from 'src/app/shared/pipes/company-date-time/company-date-time.pipe';

describe('InboxDetailComponent - permanent delete', () => {
  let held: Set<string>;
  let permanentlyDeleteEmail: ReturnType<typeof vi.fn>;

  const createComponent = (): InboxDetailComponent => {
    permanentlyDeleteEmail = vi.fn();

    TestBed.configureTestingModule({
      imports: [InboxDetailComponent],
      providers: [
        {
          provide: InboxService,
          useValue: {
            selectedEmail: signal({ id: 'mail-1' } as IReceivedEmail),
            isTrashFolder: signal(true),
            permanentlyDeleteEmail,
          },
        },
        { provide: TranslationService, useValue: { checkStatus: vi.fn() } },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
        { provide: InboxEmailPdfExportService, useValue: { exportEmail: vi.fn() } },
        { provide: AuthorizationService, useValue: { hasPermission: (permission: string) => held.has(permission) } },
      ],
    });
    TestBed.overrideComponent(InboxDetailComponent, { set: { template: '', imports: [] } });

    return TestBed.createComponent(InboxDetailComponent).componentInstance;
  };

  beforeEach(() => {
    held = new Set<string>();
  });

  it('reports a planer or a supervisor without the admin role as not admin, hiding the button', () => {
    expect(createComponent().isAdmin).toBe(false);
  });

  it('refuses the permanent delete for a non-admin, not only hiding the button', () => {
    createComponent().onPermanentlyDelete();

    expect(permanentlyDeleteEmail).not.toHaveBeenCalled();
  });

  it('permanently deletes the selected e-mail for an admin', () => {
    held.add(ROLE_ADMIN);

    const component = createComponent();
    expect(component.isAdmin).toBe(true);
    component.onPermanentlyDelete();

    expect(permanentlyDeleteEmail).toHaveBeenCalledWith('mail-1');
  });
});

describe('InboxDetailComponent - permanent delete button (rendered template)', () => {
  const PERMANENT_DELETE_LABEL = 'inbox.detail.permanently-delete';

  const render = (held: Set<string>, isTrash: boolean): HTMLElement => {
    TestBed.configureTestingModule({
      imports: [InboxDetailComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: InboxService,
          useValue: {
            selectedEmail: signal({ id: 'mail-1', subject: 'Subject', isRead: true } as IReceivedEmail),
            isTrashFolder: signal(isTrash),
            permanentlyDeleteEmail: vi.fn(),
          },
        },
        { provide: TranslationService, useValue: { checkStatus: vi.fn(), isConfigured: false } },
        { provide: InboxEmailPdfExportService, useValue: { exportEmail: vi.fn() } },
        { provide: LocaleService, useValue: { getLocale: () => 'en-US' } },
        { provide: AuthorizationService, useValue: { hasPermission: (permission: string) => held.has(permission) } },
      ],
    });
    TestBed.overrideComponent(InboxDetailComponent, {
      set: { imports: [TranslateModule, CompanyDateTimePipe], schemas: [NO_ERRORS_SCHEMA] },
    });

    const fixture = TestBed.createComponent(InboxDetailComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  const permanentDeleteButton = (element: HTMLElement): Element | null =>
    element.querySelector(`button[aria-label="${PERMANENT_DELETE_LABEL}"]`);

  it('does not render the button in the trash for a supervisor without the admin role', () => {
    const element = render(new Set<string>(), true);

    expect(element.querySelector('button[aria-label="inbox.detail.restore"]')).not.toBeNull();
    expect(permanentDeleteButton(element)).toBeNull();
  });

  it('renders the button in the trash for an admin', () => {
    expect(permanentDeleteButton(render(new Set<string>([ROLE_ADMIN]), true))).not.toBeNull();
  });

  it('never renders it outside the trash, not even for an admin', () => {
    expect(permanentDeleteButton(render(new Set<string>([ROLE_ADMIN]), false))).toBeNull();
  });
});

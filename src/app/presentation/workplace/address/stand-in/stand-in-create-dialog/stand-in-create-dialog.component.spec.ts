// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { StandInCreateDialogComponent } from './stand-in-create-dialog.component';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { DataManagementQualificationService } from 'src/app/domain/services/settings/data-management-qualification.service';
import { ClientConfigService } from 'src/app/domain/services/client/client-config.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ICreatedStandIn } from 'src/app/domain/models/client/stand-in/created-stand-in.interface';
import { STAND_IN_I18N } from 'src/app/domain/constants/stand-in.constants';

describe('StandInCreateDialogComponent', () => {
  let component: StandInCreateDialogComponent;
  let api: { createStandIns: ReturnType<typeof vi.fn> };
  let toast: { showSuccess: ReturnType<typeof vi.fn>; showError: ReturnType<typeof vi.fn> };
  let close: ReturnType<typeof vi.fn>;

  interface Exposed {
    textModel: { set: (value: { count: number | null; namePattern: string }) => void };
    problem: () => { key: string } | null;
    isSaving: () => boolean;
    onCreate: () => void;
    groupId: () => string;
    groupName: () => string;
    onToggleQualification: (id: string) => void;
  }
  const exposed = (): Exposed => component as unknown as Exposed;

  const GROUP = { groupId: 'group-1', groupName: 'Bern Objektschutz' };

  beforeEach(async () => {
    close = vi.fn();
    api = { createStandIns: vi.fn().mockReturnValue(of([{ id: 'c-1', idNumber: 1, name: 'Fair 1' }])) };
    toast = { showSuccess: vi.fn(), showError: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [StandInCreateDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataClientService, useValue: api },
        { provide: ClientConfigService, useValue: {} },
        { provide: DataManagementQualificationService, useValue: { getQualificationList: () => of([]) } },
        { provide: ToastShowService, useValue: toast },
      ],
    })
      .overrideProvider(NgbModal, { useValue: { open: vi.fn().mockReturnValue({ close, dismiss: vi.fn() }) } })
      .compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      [STAND_IN_I18N.createFailed]: 'The placeholders could not be created.',
      'standIn.create.success': '{{count}} placeholders created.',
    });
    translate.use('en');

    const fixture = TestBed.createComponent(StandInCreateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('takes the group selected in the schedule, without a group field of its own', () => {
    component.open(GROUP);

    expect(exposed().groupId()).toBe('group-1');
    expect(exposed().groupName()).toBe('Bern Objektschutz');
  });

  it('explains a missing name pattern in the dialog and sends nothing', () => {
    component.open(GROUP);

    exposed().onCreate();

    expect(exposed().problem()?.key).toBe(STAND_IN_I18N.invalidPattern);
    expect(api.createStandIns).not.toHaveBeenCalled();
  });

  it('explains a missing group in the dialog and sends nothing', () => {
    component.open({ groupId: '', groupName: '' });
    exposed().textModel.set({ count: 3, namePattern: 'Fair {n}' });

    exposed().onCreate();

    expect(exposed().problem()?.key).toBe(STAND_IN_I18N.invalidGroup);
    expect(api.createStandIns).not.toHaveBeenCalled();
  });

  it('creates in the given group with the period and qualifications, closes and reports the created stand-ins', () => {
    const created: ICreatedStandIn[][] = [];
    component.created.subscribe((list) => created.push(list));
    component.open({ groupId: 'group-7', groupName: 'Fair', validFrom: new Date(2026, 10, 9), validUntil: new Date(2026, 10, 12) });
    exposed().textModel.set({ count: 3, namePattern: 'Fair {n}' });
    exposed().onToggleQualification('q-1');
    exposed().onToggleQualification('q-2');
    exposed().onToggleQualification('q-2');

    exposed().onCreate();

    expect(api.createStandIns).toHaveBeenCalledWith({
      count: 3,
      namePattern: 'Fair {n}',
      groupId: 'group-7',
      validFrom: '2026-11-09',
      validUntil: '2026-11-12',
      qualificationIds: ['q-1'],
    });
    expect(close).toHaveBeenCalledTimes(1);
    expect(created).toEqual([[{ id: 'c-1', idNumber: 1, name: 'Fair 1' }]]);
    expect(toast.showSuccess).toHaveBeenCalledWith('1 placeholders created.', '');
  });

  it('shows a refused create as a translated toast, keeps the dialog open and allows another try', () => {
    api.createStandIns.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    component.open(GROUP);
    exposed().textModel.set({ count: 2, namePattern: 'Fair {n}' });

    exposed().onCreate();

    expect(toast.showError).toHaveBeenCalledWith('The placeholders could not be created.');
    expect(close).not.toHaveBeenCalled();
    expect(exposed().isSaving()).toBe(false);
  });

  it('sends a second click while the first create runs only once', () => {
    const pending = new Subject<ICreatedStandIn[]>();
    api.createStandIns.mockReturnValue(pending);
    component.open(GROUP);
    exposed().textModel.set({ count: 2, namePattern: 'Fair {n}' });

    exposed().onCreate();
    exposed().onCreate();

    expect(api.createStandIns).toHaveBeenCalledTimes(1);
  });
});

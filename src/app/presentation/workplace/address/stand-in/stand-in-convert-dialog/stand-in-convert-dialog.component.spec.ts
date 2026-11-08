// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { StandInConvertDialogComponent } from './stand-in-convert-dialog.component';
import { StandInConvertFormModel } from './stand-in-convert-form-model.interface';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { ClientConfigService } from 'src/app/domain/services/client/client-config.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { EntityTypeEnum, GenderEnum } from 'src/app/domain/enums/client-enum';
import { ADDRESS_VALIDATION_FAILED_KEY } from 'src/app/domain/helpers/address-validation-failure.helper';
import { STAND_IN_I18N } from 'src/app/domain/constants/stand-in.constants';

describe('StandInConvertDialogComponent', () => {
  let component: StandInConvertDialogComponent;
  let api: { convertStandIn: ReturnType<typeof vi.fn> };
  let toast: { showSuccess: ReturnType<typeof vi.fn>; showError: ReturnType<typeof vi.fn> };
  let close: ReturnType<typeof vi.fn>;

  interface Exposed {
    model: { update: (fn: (model: StandInConvertFormModel) => StandInConvertFormModel) => void; (): StandInConvertFormModel };
    problem: () => { key: string } | null;
    onConvert: () => void;
  }
  const exposed = (): Exposed => component as unknown as Exposed;

  const fillPerson = (): void =>
    exposed().model.update((model) => ({
      ...model,
      targetType: String(EntityTypeEnum.externEmp),
      firstName: 'Anna',
      name: 'Muster',
      gender: String(GenderEnum.female),
      street: 'Hauptstrasse 1',
      zip: '3000',
      city: 'Bern',
      country: 'CH',
    }));

  beforeEach(async () => {
    close = vi.fn();
    api = { convertStandIn: vi.fn().mockReturnValue(of({ id: 'stand-in-1' })) };
    toast = { showSuccess: vi.fn(), showError: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [StandInConvertDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataClientService, useValue: api },
        {
          provide: ClientConfigService,
          useValue: {
            countries: signal([{ abbreviation: 'CH' }]),
            defaultTypePhone: signal(1),
            defaultTypeEmail: signal(4),
            communicationTypePhoneList: signal([]),
            communicationTypeEmailList: signal([]),
          },
        },
        { provide: ToastShowService, useValue: toast },
        { provide: NgbModal, useValue: { open: vi.fn().mockReturnValue({ close, dismiss: vi.fn() }) } },
      ],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      [STAND_IN_I18N.convertFailed]: 'The placeholder could not be converted.',
      [ADDRESS_VALIDATION_FAILED_KEY]: 'Address not found: {{address}}',
    });
    translate.use('en');

    const fixture = TestBed.createComponent(StandInConvertDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts as an employee without an address and explains the missing person data without sending', () => {
    component.open('stand-in-1', 'Fair 1');

    expect(exposed().model().targetType).toBe(String(EntityTypeEnum.employee));
    expect(exposed().model().country).toBe('');

    exposed().onConvert();

    expect(exposed().problem()?.key).toBe(STAND_IN_I18N.invalidPerson);
    expect(api.convertStandIn).not.toHaveBeenCalled();
  });

  it('explains a half-filled address without sending', () => {
    component.open('stand-in-1', 'Fair 1');
    fillPerson();
    exposed().model.update((model) => ({ ...model, city: '' }));

    exposed().onConvert();

    expect(exposed().problem()?.key).toBe(STAND_IN_I18N.invalidAddress);
    expect(api.convertStandIn).not.toHaveBeenCalled();
  });

  it('converts a person without an address, so an address the geocoder cannot find never blocks the conversion', () => {
    component.open('stand-in-1', 'Fair 1');
    fillPerson();
    exposed().model.update((model) => ({ ...model, street: '', zip: '', city: '', country: '' }));

    exposed().onConvert();

    expect(exposed().problem()).toBeNull();
    expect(api.convertStandIn.mock.calls[0][1].address).toBeNull();
  });

  it('converts the stand-in into the chosen type, closes and tells the host', () => {
    let converted = 0;
    component.converted.subscribe(() => converted++);
    component.open('stand-in-1', 'Fair 1');
    fillPerson();

    exposed().onConvert();

    expect(api.convertStandIn).toHaveBeenCalledTimes(1);
    const [clientId, request] = api.convertStandIn.mock.calls[0];
    expect(clientId).toBe('stand-in-1');
    expect(request).toEqual(
      expect.objectContaining({ targetType: EntityTypeEnum.externEmp, firstName: 'Anna', name: 'Muster', gender: GenderEnum.female }),
    );
    expect(close).toHaveBeenCalledTimes(1);
    expect(converted).toBe(1);
  });

  it('shows a refused conversion as a translated toast, never the server text, and keeps the dialog open', () => {
    api.convertStandIn.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { errors: { 'Resource.TargetType': ['A stand-in can only be converted into an employee.'] } },
          }),
      ),
    );
    component.open('stand-in-1', 'Fair 1');
    fillPerson();

    exposed().onConvert();

    expect(toast.showError).toHaveBeenCalledWith('The placeholder could not be converted.');
    expect(close).not.toHaveBeenCalled();
  });

  it('names a refused address with the geocoding text', () => {
    api.convertStandIn.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { errors: { 'Resource.Address': ['address.validation.failed|Hauptstrasse 1, 3000 Bern'] } },
          }),
      ),
    );
    component.open('stand-in-1', 'Fair 1');
    fillPerson();

    exposed().onConvert();

    expect(toast.showError).toHaveBeenCalledWith('Address not found: Hauptstrasse 1, 3000 Bern');
  });
});

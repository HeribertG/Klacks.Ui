// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TransportModeEnum } from 'src/app/domain/enums/transport-mode.enum';
import { ContainerTemplatePropertiesService } from '../services/container-template-properties.service';
import { ContainerTemplateRouteService } from '../services/container-template-route.service';
import { ContainerTemplatePropertiesDialogComponent } from './container-template-properties-dialog.component';

describe('ContainerTemplatePropertiesDialogComponent', () => {
  let fixture: ComponentFixture<ContainerTemplatePropertiesDialogComponent>;
  let modal: { close: ReturnType<typeof vi.fn>; dismiss: ReturnType<typeof vi.fn> };
  let propertiesService: Record<string, unknown>;
  let routeService: Record<string, unknown>;

  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(ContainerTemplatePropertiesDialogComponent);
    fixture.componentRef.setInput('modal', modal as unknown as NgbActiveModal);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    modal = { close: vi.fn(), dismiss: vi.fn() };
    propertiesService = {
      contextMenuTargetItem: { shift: { isTimeRange: false } },
      getPropertiesBriefingTime: vi.fn(),
      getPropertiesDebriefingTime: vi.fn(),
      getPropertiesTravelTimeBefore: vi.fn(),
      getPropertiesTravelTimeAfter: vi.fn(),
      getPropertiesTransportMode: vi.fn(() => TransportModeEnum.byCar),
      selectPropertiesTransportMode: vi.fn(),
    };
    routeService = { isTransportModeMix: true };

    TestBed.configureTestingModule({
      imports: [ContainerTemplatePropertiesDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ContainerTemplatePropertiesService, useValue: propertiesService },
        { provide: ContainerTemplateRouteService, useValue: routeService },
      ],
    });
    TestBed.overrideComponent(ContainerTemplatePropertiesDialogComponent, {
      set: { imports: [TranslateModule], schemas: [NO_ERRORS_SCHEMA] },
    });
  });

  it('dismisses on the close cross and on cancel and closes on save', () => {
    const root = render();

    (root.querySelector('.modal-header .close') as HTMLElement).click();
    (root.querySelector('.modal-footer .link-button') as HTMLElement).click();
    (root.querySelector('.modal-footer .save-btn') as HTMLElement).click();

    expect(modal.dismiss).toHaveBeenCalledTimes(2);
    expect(modal.close).toHaveBeenCalledTimes(1);
  });

  it('offers the transport modes only in mix mode and marks the edited one active', () => {
    const root = render();
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('.transport-mode-btn'));

    buttons[1].click();

    expect(buttons.map((button) => button.classList.contains('active'))).toEqual([true, false, false]);
    expect(propertiesService['selectPropertiesTransportMode']).toHaveBeenCalledWith(TransportModeEnum.byBicycle);
  });

  it('hides the time range fields and the transport modes for a plain item outside mix mode', () => {
    routeService['isTransportModeMix'] = false;

    const root = render();

    expect(root.querySelector('#timeRangeStartItem')).toBeNull();
    expect(root.querySelector('.time-range-info-box')).toBeNull();
    expect(root.querySelector('.transport-mode-group')).toBeNull();
    expect(root.querySelector('#briefingTime')).not.toBeNull();
  });
});

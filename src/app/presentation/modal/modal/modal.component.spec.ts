// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalComponent } from './modal.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { ModalType } from '../modal.service';

describe('ModalComponent', () => {
    let component: ModalComponent;
    let fixture: ComponentFixture<ModalComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ModalComponent, TranslateModule.forRoot()],
            providers: [
                TranslateService,
                {
                    provide: NgbModal,
                    useValue: {
                        open: vi.fn().mockReturnValue({
                            result: Promise.resolve(),
                        }),
                    },
                },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ModalComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it.each([ModalType.Input, ModalType.Delete, ModalType.Confirmation, ModalType.Message])(
        'opens the %s modal centered in the default width, not the 300px small size',
        (modalType) => {
            const ngbModal = (component as unknown as { ngbModal: NgbModal }).ngbModal;
            const openSpy = vi.spyOn(ngbModal, 'open').mockReturnValue({ result: Promise.resolve() } as ReturnType<NgbModal['open']>);

            component.open({}, modalType);

            expect(openSpy).toHaveBeenCalledTimes(1);
            const options = openSpy.mock.calls[0][1] as NgbModalOptions;
            expect(options.centered).toBe(true);
            expect(options.size).toBeUndefined();
        },
    );
});

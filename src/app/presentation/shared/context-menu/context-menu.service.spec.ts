// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { ContextMenuService } from './context-menu.service';
import { TouchInteraction } from 'src/app/domain/constants/touch-interaction.constants';

describe('MenuService', () => {
    let service: ContextMenuService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ContextMenuService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('ghost-click guard', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('ignores item clicks inside the guard window after a touch open', () => {
            service.markOpened(true);
            service.onClickEvent('delete', undefined);
            expect(service.clickedSignal()).toBeNull();

            vi.advanceTimersByTime(TouchInteraction.GhostClickGuardMs + 1);
            service.onClickEvent('delete', undefined);
            expect(service.clickedSignal()).toEqual({ event: 'delete', value: '' });
        });

        it('never blocks clicks after a mouse open', () => {
            service.markOpened(false);
            service.onClickEvent('delete', 'x');
            expect(service.clickedSignal()).toEqual({ event: 'delete', value: 'x' });
        });

        it('lets a click through when no menu was ever opened', () => {
            service.onClickEvent('copy', undefined);
            expect(service.clickedSignal()).toEqual({ event: 'copy', value: '' });
        });

        it('lifts an earlier touch guard when the next open comes from a mouse', () => {
            service.markOpened(true);
            service.markOpened(false);
            service.onClickEvent('copy', undefined);
            expect(service.clickedSignal()).toEqual({ event: 'copy', value: '' });
        });
    });
});

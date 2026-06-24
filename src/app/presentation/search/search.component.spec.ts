// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { signal } from '@angular/core';

import { SearchComponent } from './search.component';
import { SearchStrategyService } from './search-strategy.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { SearchService } from 'src/app/application/services/search.service';

describe('SearchComponent', () => {
    let component: SearchComponent;
    let fixture: ComponentFixture<SearchComponent>;
    let searchStrategyService: any;
    let workplaceStateService: any;
    let searchService: any;

    beforeEach(async () => {
        const searchStrategyServiceSpy = {
            globalSearch: vi.fn(),
            resetFilterWithoutSignalWrite: vi.fn(),
            resetFilter: vi.fn(),
            restoreSearch: vi.fn()
        };
        const workplaceStateSpy = {
            isFocusChanged: signal(false)
        };
        const searchServiceSpy = {
            showSearch: vi.fn(),
            showIncludeAddress: vi.fn(),
            showIncludeClient: vi.fn()
        };

        searchServiceSpy.showSearch.mockReturnValue(true);
        searchServiceSpy.showIncludeAddress.mockReturnValue(false);
        searchServiceSpy.showIncludeClient.mockReturnValue(false);
        searchStrategyServiceSpy.restoreSearch.mockReturnValue('');

        await TestBed.configureTestingModule({
            imports: [
                SearchComponent,
                TranslateModule.forRoot(),
            ],
            providers: [
                { provide: SearchStrategyService, useValue: searchStrategyServiceSpy },
                { provide: WorkplaceStateService, useValue: workplaceStateSpy },
                { provide: SearchService, useValue: searchServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(SearchComponent);
        component = fixture.componentInstance;

        searchStrategyService = TestBed.inject(SearchStrategyService) as any;
        workplaceStateService = TestBed.inject(WorkplaceStateService) as any;
        searchService = TestBed.inject(SearchService) as any;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
        expect(component.searchString()).toBe('');
        expect(component.filterModel().includeAddress).toBe(false);
        expect(component.filterModel().includeClient).toBe(false);
    });

    it('should call globalSearch when onClickSearch is called', () => {
        component.searchString.set('test search');
        component.filterModel.update(m => ({ ...m, includeAddress: true }));

        component.onClickSearch();

        expect(searchStrategyService.globalSearch).toHaveBeenCalledWith('test search', true, false);
    });

    it('should reset filter when search input is cleared', () => {
        component.onSearchValueChange('');

        expect(searchStrategyService.resetFilterWithoutSignalWrite).toHaveBeenCalled();
    });

    it('should not reset filter when search input has value', () => {
        component.onSearchValueChange('some text');

        expect(searchStrategyService.resetFilterWithoutSignalWrite).not.toHaveBeenCalled();
    });

    it('should update searchString when onSearchValueChange is called', () => {
        component.onSearchValueChange('new value');

        expect(component.searchString()).toBe('new value');
    });

    it('should trigger search on HostListener search event', () => {
        vi.spyOn(component, 'onClickSearch');

        component.onsearch();

        expect(component.onClickSearch).toHaveBeenCalled();
    });

    it('should handle focus change correctly', () => {
        component.searchString.set('existing search');
        component.filterModel.update(m => ({ ...m, includeAddress: true, includeClient: true }));

        component['handleFocusChange']();

        expect(searchStrategyService.resetFilter).toHaveBeenCalled();
        expect(component.searchString()).toBe('');
        expect(component.filterModel().includeAddress).toBe(false);
        expect(component.filterModel().includeClient).toBe(false);
    });

    it('should update searchString via signal when value is set', () => {
        const restoredSearch = 'restored search';
        component.searchString.set(restoredSearch);
        expect(component.searchString()).toBe(restoredSearch);
    });

    it('should render search input when showSearch returns true', () => {
        searchService.showSearch.mockReturnValue(true);
        fixture.detectChanges();

        const searchInput = fixture.nativeElement.querySelector('app-search-input');
        expect(searchInput).toBeTruthy();
    });

    it('should not render search when showSearch returns false', () => {
        searchService.showSearch.mockReturnValue(false);
        fixture.detectChanges();

        const searchContainer = fixture.nativeElement.querySelector('.container-search');
        expect(searchContainer).toBeFalsy();
    });

    it('should render address checkbox when showIncludeAddress returns true', () => {
        searchService.showSearch.mockReturnValue(true);
        searchService.showIncludeAddress.mockReturnValue(true);
        fixture.detectChanges();

        const addressCheckbox = fixture.nativeElement.querySelector('#search-include-address');
        expect(addressCheckbox).toBeTruthy();
    });

    it('should render client checkbox when showIncludeClient returns true', () => {
        searchService.showSearch.mockReturnValue(true);
        searchService.showIncludeClient.mockReturnValue(true);
        fixture.detectChanges();

        const clientCheckbox = fixture.nativeElement.querySelector('#search-include-client');
        expect(clientCheckbox).toBeTruthy();
    });

    it('should bind searchString to search input', async () => {
        searchService.showSearch.mockReturnValue(true);
        component.searchString.set('test value');

        fixture.detectChanges();
        await fixture.whenStable();

        const searchInput = fixture.nativeElement.querySelector('app-search-input input') as HTMLInputElement;
        expect(searchInput.value).toBe('test value');
    });
});

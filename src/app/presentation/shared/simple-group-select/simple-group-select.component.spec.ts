// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { signal } from '@angular/core';

import { SimpleGroupSelectComponent } from './simple-group-select.component';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { Group } from 'src/app/domain/models/group/group-class';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleUpComponent } from 'src/app/presentation/icons/icon-angle-up.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { ClickOutsideDirective } from 'src/app/presentation/directives/click-outside.directive';

describe('SimpleGroupSelectComponent', () => {
    let component: SimpleGroupSelectComponent;
    let fixture: ComponentFixture<SimpleGroupSelectComponent>;
    let dataManagementGroupService: any;
    let groupSelectionService: any;
    let workplaceStateService: any;
    let translateService: any;

    const mockGroup1 = new Group();
    mockGroup1.id = 'group-1';
    mockGroup1.name = 'Test Group 1';
    mockGroup1.children = [];

    const mockGroup2 = new Group();
    mockGroup2.id = 'group-2';
    mockGroup2.name = 'Test Group 2';
    mockGroup2.children = [];

    const mockGroupWithChildren = new Group();
    mockGroupWithChildren.id = 'parent-group';
    mockGroupWithChildren.name = 'Parent Group';
    mockGroupWithChildren.children = [mockGroup1, mockGroup2];

    beforeEach(async () => {
        const groupServiceSpy = {
            init: vi.fn(),
            initTree: vi.fn(),
            selectNode: vi.fn(),
            isRead: signal(false),
            groupTree: { nodes: [mockGroupWithChildren] }
        };

        const groupSelectionSpy = {
            selectGroup: vi.fn(),
            clearSelection: vi.fn(),
            selectedGroup: null
        };

        const workplaceStateSpy = {
            isFocusChanged: signal(false)
        };

        const translateServiceSpy = {
            instant: vi.fn()
        };

        await TestBed.configureTestingModule({
            imports: [
                SimpleGroupSelectComponent,
                TranslateModule.forRoot(),
                IconAngleDownComponent,
                IconAngleUpComponent,
                IconAngleRightComponent,
                ClickOutsideDirective,
            ],
            providers: [
                { provide: DataManagementGroupService, useValue: groupServiceSpy },
                { provide: GroupSelectionService, useValue: groupSelectionSpy },
                { provide: WorkplaceStateService, useValue: workplaceStateSpy },
                { provide: TranslateService, useValue: translateServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(SimpleGroupSelectComponent);
        component = fixture.componentInstance;

        dataManagementGroupService = TestBed.inject(DataManagementGroupService) as any;
        groupSelectionService = TestBed.inject(GroupSelectionService) as any;
        workplaceStateService = TestBed.inject(WorkplaceStateService) as any;
        translateService = TestBed.inject(TranslateService) as any;

        // Setup default translation responses
        translateService.instant.mockReturnValue('Translated Text');
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have default property values', () => {
        expect(component.hasOptionButton).toBe(true);
        expect(component.required).toBe(false);
        expect(component.isDropdownOpen).toBe(false);
        expect(component.selectedGroup).toBeNull();
        expect(component.selectedGroupId).toBeNull();
        expect(component.isDisabled).toBe(false);
        expect(component.isVisible).toBe(true);
    });

    it('should initialize services on ngOnInit', () => {
        component.ngOnInit();

        expect(dataManagementGroupService.init).toHaveBeenCalled();
        expect(dataManagementGroupService.initTree).toHaveBeenCalled();
    });

    it('should accept hasOptionButton input', () => {
        component.hasOptionButton = false;
        expect(component.hasOptionButton).toBe(false);
    });

    it('should accept label input', () => {
        const testLabel = 'Select a group';
        component.label = testLabel;
        expect(component.label).toBe(testLabel);
    });

    it('should accept required input', () => {
        component.required = true;
        expect(component.required).toBe(true);
    });

    it('should build hierarchical tree when data is read', async () => {
        // Mock the groupTree data first
        dataManagementGroupService.groupTree = { nodes: [mockGroupWithChildren] };

        component.buildHierarchicalTree();

        // Use setTimeout to match the component's async behavior
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(component.hierarchicalTree).toEqual([mockGroupWithChildren]);
    });

    it('should build display tree from hierarchical tree', () => {
        component.hierarchicalTree = [mockGroupWithChildren];

        component.buildDisplayTree();

        expect(component.displayTree).toEqual([mockGroupWithChildren]);
    });

    it('should toggle dropdown when not disabled', () => {
        component.isDisabled = false;
        component.isDropdownOpen = false;

        component.toggleDropdown();

        expect(component.isDropdownOpen).toBe(true);
    });

    it('should not toggle dropdown when disabled', () => {
        component.isDisabled = true;
        component.isDropdownOpen = false;

        component.toggleDropdown();

        expect(component.isDropdownOpen).toBe(false);
    });

    it('should close dropdown', () => {
        component.isDropdownOpen = true;

        component.closeDropdown();

        expect(component.isDropdownOpen).toBe(false);
    });

    it('should detect if node has children', () => {
        expect(component.hasChildren(mockGroupWithChildren)).toBe(true);
        expect(component.hasChildren(mockGroup1)).toBe(false);
    });

    it('should check if node is expanded', () => {
        component.expandedNodes.add('test-id');

        const expandedNode = new Group();
        expandedNode.id = 'test-id';

        const notExpandedNode = new Group();
        notExpandedNode.id = 'other-id';

        expect(component.isNodeExpanded(expandedNode)).toBe(true);
        expect(component.isNodeExpanded(notExpandedNode)).toBe(false);
    });

    it('should toggle node expansion', () => {
        const mockEvent = new Event('click');
        vi.spyOn(mockEvent, 'stopPropagation');

        const testNode = new Group();
        testNode.id = 'toggle-test';

        // First toggle - should expand
        component.toggleNode(testNode, mockEvent);
        expect(component.expandedNodes.has('toggle-test')).toBe(true);
        expect(mockEvent.stopPropagation).toHaveBeenCalled();

        // Second toggle - should collapse
        component.toggleNode(testNode, mockEvent);
        expect(component.expandedNodes.has('toggle-test')).toBe(false);
    });

    it('should select group and emit events', () => {
        const mockEvent = new Event('click');
        vi.spyOn(mockEvent, 'stopPropagation');
        vi.spyOn(component.groupSelected, 'emit');
        vi.spyOn(component, 'closeDropdown');

        const mockOnChange = vi.fn();
        const mockOnTouched = vi.fn();
        component.registerOnChange(mockOnChange);
        component.registerOnTouched(mockOnTouched);

        component.selectGroup(mockGroup1, mockEvent);

        expect(component.selectedGroup).toBe(mockGroup1);
        expect(component.selectedGroupId).toBe('group-1');
        expect(mockOnChange).toHaveBeenCalledWith('group-1');
        expect(mockOnTouched).toHaveBeenCalled();
        expect(component.groupSelected.emit).toHaveBeenCalledWith(mockGroup1);
        expect(groupSelectionService.selectGroup).toHaveBeenCalledWith(mockGroup1);
        expect(dataManagementGroupService.selectNode).toHaveBeenCalledWith(mockGroup1);
        expect(component.closeDropdown).toHaveBeenCalled();
        expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should programmatically select group', () => {
        vi.spyOn(component.groupSelected, 'emit');

        const mockOnChange = vi.fn();
        const mockOnTouched = vi.fn();
        component.registerOnChange(mockOnChange);
        component.registerOnTouched(mockOnTouched);

        component.selectGroupProgrammatically(mockGroup2);

        expect(component.selectedGroup).toBe(mockGroup2);
        expect(component.selectedGroupId).toBe('group-2');
        expect(mockOnChange).toHaveBeenCalledWith('group-2');
        expect(mockOnTouched).toHaveBeenCalled();
        expect(component.groupSelected.emit).toHaveBeenCalledWith(mockGroup2);
        expect(groupSelectionService.selectGroup).toHaveBeenCalledWith(mockGroup2);
        expect(dataManagementGroupService.selectNode).toHaveBeenCalledWith(mockGroup2);
    });

    it('should write value and find group', () => {
        component.hierarchicalTree = [mockGroupWithChildren];

        component.writeValue('group-1');

        expect(component.selectedGroupId).toBe('group-1');
        expect(component.selectedGroup).toBe(mockGroup1);
    });

    it('should clear selection when writing null value', () => {
        component.selectedGroup = mockGroup1;

        component.writeValue('');

        expect(component.selectedGroup).toBeNull();
        expect(groupSelectionService.clearSelection).toHaveBeenCalled();
    });

    it('should register onChange callback', () => {
        const mockCallback = vi.fn();

        component.registerOnChange(mockCallback);

        // Trigger onChange to verify it was registered
        component.selectGroupProgrammatically(mockGroup1);
        expect(mockCallback).toHaveBeenCalledWith('group-1');
    });

    it('should register onTouched callback', () => {
        const mockCallback = vi.fn();

        component.registerOnTouched(mockCallback);

        // Trigger onTouched to verify it was registered
        component.selectGroupProgrammatically(mockGroup1);
        expect(mockCallback).toHaveBeenCalled();
    });

    it('should set disabled state', () => {
        component.setDisabledState(true);
        expect(component.isDisabled).toBe(true);

        component.setDisabledState(false);
        expect(component.isDisabled).toBe(false);
    });

    it('should clean up effects on destroy', () => {
        // Mock effect with destroy method
        const mockEffect = {
            destroy: vi.fn()
        };
        component['effects'] = [mockEffect];

        component.ngOnDestroy();

        expect(mockEffect.destroy).toHaveBeenCalled();
        expect(component['effects']).toEqual([]);
    });

    it('should find and select group recursively', () => {
        component.hierarchicalTree = [mockGroupWithChildren];

        component['findAndSelectGroup']('group-2', component.hierarchicalTree);

        expect(component.selectedGroup).toBe(mockGroup2);
        expect(groupSelectionService.selectGroup).toHaveBeenCalledWith(mockGroup2);
        expect(dataManagementGroupService.selectNode).toHaveBeenCalledWith(mockGroup2);
    });

    it('should handle component visibility', () => {
        const result = component['isComponentVisible']();
        expect(result).toBe(true);
    });

    it('should display selected group name', () => {
        component.selectedGroup = mockGroup1;
        fixture.detectChanges();

        const nameElement = fixture.nativeElement.querySelector('.group-select-value span');
        expect(nameElement.textContent.trim()).toBe('Translated Text');
    });

    it('should display placeholder when no group selected', () => {
        component.selectedGroup = null;
        fixture.detectChanges();

        const placeholderElement = fixture.nativeElement.querySelector('.placeholder');
        expect(placeholderElement).toBeTruthy();
    });

    it('should show dropdown when open', () => {
        component.isDropdownOpen = true;
        fixture.detectChanges();

        const dropdown = fixture.nativeElement.querySelector('.group-select-dropdown');
        expect(dropdown).toBeTruthy();
    });

    it('should hide dropdown when closed', () => {
        component.isDropdownOpen = false;
        fixture.detectChanges();

        const dropdown = fixture.nativeElement.querySelector('.group-select-dropdown');
        expect(dropdown).toBeFalsy();
    });

    it('should render required marker when required is true', () => {
        component.label = 'Test Label';
        component.required = true;
        fixture.detectChanges();

        const requiredMarker = fixture.nativeElement.querySelector('.required-marker');
        expect(requiredMarker).toBeTruthy();
        expect(requiredMarker.textContent).toBe('*');
    });

    it('should not render required marker when required is false', () => {
        component.label = 'Test Label';
        component.required = false;
        fixture.detectChanges();

        const requiredMarker = fixture.nativeElement.querySelector('.required-marker');
        expect(requiredMarker).toBeFalsy();
    });
});

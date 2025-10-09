/* eslint-disable @typescript-eslint/no-unused-vars */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  CdkDragDrop,
  CdkDragMove,
  DragDropModule,
} from '@angular/cdk/drag-drop';
import { of } from 'rxjs';

import { TreeGroupComponent } from './tree-group.component';
import { DataManagementGroupService } from 'src/app/domain/services/data-management-group.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { Group } from 'src/app/domain/models/group-class';

describe('TreeGroupComponent - Drag and Drop', () => {
  let component: TreeGroupComponent;
  let fixture: ComponentFixture<TreeGroupComponent>;
  let mockDataManagementGroupService: jasmine.SpyObj<DataManagementGroupService>;
  let mockAuthorizationService: jasmine.SpyObj<AuthorizationService>;
  let mockNavigationService: jasmine.SpyObj<NavigationService>;
  let mockModalService: jasmine.SpyObj<ModalService>;
  let mockTranslateService: jasmine.SpyObj<TranslateService>;

  const createMockGroup = (
    id: string,
    name: string,
    depth: number,
    lft: number,
    rgt: number,
    children: Group[] = []
  ): Group => {
    const group = new Group();
    group.id = id;
    group.name = name;
    group.depth = depth;
    group.lft = lft;
    group.rgt = rgt;
    group.children = children;
    group.clientsCount = 0;
    return group;
  };

  beforeEach(async () => {
    const dataManagementGroupServiceSpy = jasmine.createSpyObj(
      'DataManagementGroupService',
      [
        'init',
        'initTree',
        'refreshTree',
        'selectNode',
        'toggleNodeExpansion',
        'expandNode',
        'collapseAllNodes',
        'createGroup',
        'deleteGroup',
        'prepareGroup',
        'moveGroup',
        'isRead',
      ],
      {
        selectedNode: null,
        expandedNodes: new Set<string>(),
        groupTree: { nodes: [] },
      }
    );

    const authorizationServiceSpy = jasmine.createSpyObj(
      'AuthorizationService',
      [],
      {
        isAuthorised: true,
      }
    );

    const navigationServiceSpy = jasmine.createSpyObj('NavigationService', [
      'navigateToEditGroup',
    ]);

    const modalServiceSpy = jasmine.createSpyObj(
      'ModalService',
      ['openModel'],
      {
        Filing: '',
        componentContext: '',
        deleteMessageTitle: '',
        deleteMessage: '',
        deleteMessageOkButton: '',
        resultEvent: of(null),
      }
    );

    const translateServiceSpy = jasmine.createSpyObj('TranslateService', [
      'instant',
    ]);
    translateServiceSpy.instant.and.returnValue('Translated text');

    dataManagementGroupServiceSpy.isRead.and.returnValue(false);
    dataManagementGroupServiceSpy.deleteGroup.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [TreeGroupComponent, TranslateModule.forRoot(), DragDropModule],
      providers: [
        {
          provide: DataManagementGroupService,
          useValue: dataManagementGroupServiceSpy,
        },
        { provide: AuthorizationService, useValue: authorizationServiceSpy },
        { provide: NavigationService, useValue: navigationServiceSpy },
        { provide: ModalService, useValue: modalServiceSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    }).compileComponents();

    mockDataManagementGroupService = TestBed.inject(
      DataManagementGroupService
    ) as jasmine.SpyObj<DataManagementGroupService>;
    mockAuthorizationService = TestBed.inject(
      AuthorizationService
    ) as jasmine.SpyObj<AuthorizationService>;
    mockNavigationService = TestBed.inject(
      NavigationService
    ) as jasmine.SpyObj<NavigationService>;
    mockModalService = TestBed.inject(
      ModalService
    ) as jasmine.SpyObj<ModalService>;
    mockTranslateService = TestBed.inject(
      TranslateService
    ) as jasmine.SpyObj<TranslateService>;

    fixture = TestBed.createComponent(TreeGroupComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Drag and Drop State Management', () => {
    it('should set dragging state on drag started', () => {
      const testNode = createMockGroup('1', 'Test Group', 0, 1, 4);

      component.onDragStarted(testNode);

      expect(component.isDragging).toBe(true);
      expect(component.draggedNodeId).toBe('1');
    });

    it('should reset dragging state on drag ended', () => {
      const testNode = createMockGroup('1', 'Test Group', 0, 1, 4);
      component.onDragStarted(testNode);

      component.onDragEnded();

      expect(component.isDragging).toBe(false);
      expect(component.draggedNodeId).toBeNull();
      expect(component.hoveredNodeId).toBeNull();
    });

    it('should set hovered node on drop zone enter', () => {
      const draggedNode = createMockGroup('1', 'Dragged', 0, 1, 2);
      const targetNode = createMockGroup('2', 'Target', 0, 3, 4);

      component.onDragStarted(draggedNode);
      component.onDropZoneEnter(targetNode);

      expect(component.hoveredNodeId).toBe('2');
    });

    it('should not set hovered node when hovering over dragged node', () => {
      const testNode = createMockGroup('1', 'Test Group', 0, 1, 4);

      component.onDragStarted(testNode);
      component.onDropZoneEnter(testNode);

      expect(component.hoveredNodeId).toBeNull();
    });

    it('should clear hovered node on drop zone exit', () => {
      const draggedNode = createMockGroup('1', 'Dragged', 0, 1, 2);
      const targetNode = createMockGroup('2', 'Target', 0, 3, 4);

      component.onDragStarted(draggedNode);
      component.onDropZoneEnter(targetNode);

      component.onDropZoneExit();

      expect(component.hoveredNodeId).toBeNull();
    });
  });

  describe('Drop Zone Visibility', () => {
    it('should show drop zone when dragging and hovering over different node', () => {
      const draggedNode = createMockGroup('1', 'Dragged', 0, 1, 2);
      const targetNode = createMockGroup('2', 'Target', 0, 3, 4);

      component.onDragStarted(draggedNode);
      component.onDropZoneEnter(targetNode);

      expect(component.shouldShowDropZone(targetNode)).toBe(true);
    });

    it('should not show drop zone when not dragging', () => {
      const targetNode = createMockGroup('2', 'Target', 0, 3, 4);

      expect(component.shouldShowDropZone(targetNode)).toBe(false);
    });

    it('should not show drop zone when hovering over dragged node', () => {
      const draggedNode = createMockGroup('1', 'Dragged', 0, 1, 2);

      component.onDragStarted(draggedNode);

      expect(component.shouldShowDropZone(draggedNode)).toBe(false);
    });

    it('should not show drop zone when hovering over different node', () => {
      const draggedNode = createMockGroup('1', 'Dragged', 0, 1, 2);
      const otherNode = createMockGroup('3', 'Other', 0, 5, 6);

      component.onDragStarted(draggedNode);
      component.hoveredNodeId = '2';

      expect(component.shouldShowDropZone(otherNode)).toBe(false);
    });
  });

  describe('Auto-Expand Functionality', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should expand collapsed node after 800ms hover', () => {
      const child = createMockGroup('2', 'Child', 1, 2, 3);
      const parentNode = createMockGroup('1', 'Parent', 0, 1, 4, [child]);
      const draggedNode = createMockGroup('3', 'Dragged', 0, 5, 6);

      component.onDragStarted(draggedNode);
      component.onDropZoneEnter(parentNode);

      jasmine.clock().tick(800);

      expect(mockDataManagementGroupService.expandNode).toHaveBeenCalledWith(
        parentNode
      );
    });

    it('should not expand node if hover time is less than 800ms', () => {
      const child = createMockGroup('2', 'Child', 1, 2, 3);
      const parentNode = createMockGroup('1', 'Parent', 0, 1, 4, [child]);
      const draggedNode = createMockGroup('3', 'Dragged', 0, 5, 6);

      component.onDragStarted(draggedNode);
      component.onDropZoneEnter(parentNode);

      jasmine.clock().tick(799);

      expect(mockDataManagementGroupService.expandNode).not.toHaveBeenCalled();
    });

    it('should cancel expand timer on drop zone exit', () => {
      const child = createMockGroup('2', 'Child', 1, 2, 3);
      const parentNode = createMockGroup('1', 'Parent', 0, 1, 4, [child]);
      const draggedNode = createMockGroup('3', 'Dragged', 0, 5, 6);

      component.onDragStarted(draggedNode);
      component.onDropZoneEnter(parentNode);

      jasmine.clock().tick(400);
      component.onDropZoneExit();
      jasmine.clock().tick(400);

      expect(mockDataManagementGroupService.expandNode).not.toHaveBeenCalled();
    });

    it('should not expand already expanded node', () => {
      const child = createMockGroup('2', 'Child', 1, 2, 3);
      const parentNode = createMockGroup('1', 'Parent', 0, 1, 4, [child]);
      const draggedNode = createMockGroup('3', 'Dragged', 0, 5, 6);

      mockDataManagementGroupService.expandedNodes.add('1');

      component.onDragStarted(draggedNode);
      component.onDropZoneEnter(parentNode);

      jasmine.clock().tick(800);

      expect(mockDataManagementGroupService.expandNode).not.toHaveBeenCalled();
    });

    it('should not expand node without children', () => {
      const parentNode = createMockGroup('1', 'Parent', 0, 1, 2, []);
      const draggedNode = createMockGroup('3', 'Dragged', 0, 5, 6);

      component.onDragStarted(draggedNode);
      component.onDropZoneEnter(parentNode);

      jasmine.clock().tick(800);

      expect(mockDataManagementGroupService.expandNode).not.toHaveBeenCalled();
    });
  });

  describe('Drop Event Handling', () => {
    it('should call moveGroup when dropping on different parent', () => {
      const draggedNode = createMockGroup('1', 'Dragged', 0, 1, 2);
      const targetNode = createMockGroup('2', 'Target', 0, 3, 4);

      const mockEvent = {
        previousContainer: { data: {} },
        container: { data: targetNode },
        item: { data: draggedNode },
      } as unknown as CdkDragDrop<Group>;

      component.onDrop(mockEvent);

      expect(mockDataManagementGroupService.moveGroup).toHaveBeenCalledWith(
        '1',
        '2'
      );
    });

    it('should refresh tree when dropping on same container', () => {
      const draggedNode = createMockGroup('1', 'Dragged', 0, 1, 2);
      const container = { data: draggedNode };

      const mockEvent = {
        previousContainer: container,
        container: container,
        item: { data: draggedNode },
      } as unknown as CdkDragDrop<Group>;

      component.onDrop(mockEvent);

      expect(mockDataManagementGroupService.initTree).toHaveBeenCalledWith(
        undefined,
        true
      );
      expect(mockDataManagementGroupService.moveGroup).not.toHaveBeenCalled();
    });

    it('should not move when dropping node on itself', () => {
      const draggedNode = createMockGroup('1', 'Dragged', 0, 1, 2);

      const mockEvent = {
        previousContainer: { data: {} },
        container: { data: draggedNode },
        item: { data: draggedNode },
      } as unknown as CdkDragDrop<Group>;

      component.onDrop(mockEvent);

      expect(mockDataManagementGroupService.moveGroup).not.toHaveBeenCalled();
      expect(mockDataManagementGroupService.initTree).toHaveBeenCalledWith(
        undefined,
        true
      );
    });

    it('should prevent dropping parent into its own descendant', () => {
      const child = createMockGroup('2', 'Child', 1, 2, 3);
      const parent = createMockGroup('1', 'Parent', 0, 1, 4, [child]);

      const mockEvent = {
        previousContainer: { data: {} },
        container: { data: child },
        item: { data: parent },
      } as unknown as CdkDragDrop<Group>;

      component.onDrop(mockEvent);

      expect(mockDataManagementGroupService.moveGroup).not.toHaveBeenCalled();
      expect(mockDataManagementGroupService.initTree).toHaveBeenCalledWith(
        undefined,
        true
      );
    });

    it('should reset drag state after drop', () => {
      const draggedNode = createMockGroup('1', 'Dragged', 0, 1, 2);
      const targetNode = createMockGroup('2', 'Target', 0, 3, 4);

      component.onDragStarted(draggedNode);
      component.onDropZoneEnter(targetNode);

      const mockEvent = {
        previousContainer: { data: {} },
        container: { data: targetNode },
        item: { data: draggedNode },
      } as unknown as CdkDragDrop<Group>;

      component.onDrop(mockEvent);

      expect(component.isDragging).toBe(false);
      expect(component.draggedNodeId).toBeNull();
      expect(component.hoveredNodeId).toBeNull();
    });

    it('should handle drop with missing node IDs gracefully', () => {
      const draggedNode = createMockGroup('', 'Dragged', 0, 1, 2);
      const targetNode = createMockGroup('2', 'Target', 0, 3, 4);

      const mockEvent = {
        previousContainer: { data: {} },
        container: { data: targetNode },
        item: { data: draggedNode },
      } as unknown as CdkDragDrop<Group>;

      component.onDrop(mockEvent);

      expect(mockDataManagementGroupService.moveGroup).not.toHaveBeenCalled();
    });
  });

  describe('Auto-Scroll Functionality', () => {
    let mockAppMain: HTMLElement;

    beforeEach(() => {
      mockAppMain = document.createElement('div');
      Object.defineProperty(mockAppMain, 'scrollTop', {
        writable: true,
        value: 100,
      });
      spyOn(document, 'querySelector').and.returnValue(mockAppMain);
    });

    it('should trigger auto-scroll when near top edge', (done) => {
      const mockEvent = {
        pointerPosition: { x: 0, y: 150 },
      } as CdkDragMove;

      spyOn(mockAppMain, 'getBoundingClientRect').and.returnValue({
        top: 100,
        bottom: 600,
        left: 0,
        right: 800,
        width: 800,
        height: 500,
        x: 0,
        y: 100,
        toJSON: () => ({}),
      });

      const initialScrollTop = mockAppMain.scrollTop;
      component.onDragMoved(mockEvent);

      setTimeout(() => {
        expect(component['scrollInterval']).toBeTruthy();
        component.onDragEnded();
        done();
      }, 50);
    });

    it('should trigger auto-scroll when near bottom edge', (done) => {
      const mockEvent = {
        pointerPosition: { x: 0, y: 570 },
      } as CdkDragMove;

      spyOn(mockAppMain, 'getBoundingClientRect').and.returnValue({
        top: 100,
        bottom: 600,
        left: 0,
        right: 800,
        width: 800,
        height: 500,
        x: 0,
        y: 100,
        toJSON: () => ({}),
      });

      component.onDragMoved(mockEvent);

      setTimeout(() => {
        expect(component['scrollInterval']).toBeTruthy();
        component.onDragEnded();
        done();
      }, 50);
    });

    it('should not trigger auto-scroll when in middle zone', () => {
      const mockEvent = {
        pointerPosition: { x: 0, y: 350 },
      } as CdkDragMove;

      spyOn(mockAppMain, 'getBoundingClientRect').and.returnValue({
        top: 100,
        bottom: 600,
        left: 0,
        right: 800,
        width: 800,
        height: 500,
        x: 0,
        y: 100,
        toJSON: () => ({}),
      });

      component.onDragMoved(mockEvent);

      expect(component['scrollInterval']).toBeFalsy();
    });

    it('should stop auto-scroll on drag ended', (done) => {
      const mockEvent = {
        pointerPosition: { x: 0, y: 150 },
      } as CdkDragMove;

      spyOn(mockAppMain, 'getBoundingClientRect').and.returnValue({
        top: 100,
        bottom: 600,
        left: 0,
        right: 800,
        width: 800,
        height: 500,
        x: 0,
        y: 100,
        toJSON: () => ({}),
      });

      component.onDragMoved(mockEvent);

      setTimeout(() => {
        expect(component['scrollInterval']).toBeTruthy();
        component.onDragEnded();
        expect(component['scrollInterval']).toBeFalsy();
        done();
      }, 50);
    });

    it('should not crash when app-main element is not found', () => {
      (document.querySelector as jasmine.Spy).and.returnValue(null);

      const mockEvent = {
        pointerPosition: { x: 0, y: 150 },
      } as CdkDragMove;

      expect(() => component.onDragMoved(mockEvent)).not.toThrow();
    });
  });

  describe('Descendant Check', () => {
    it('should identify child as descendant of parent', () => {
      const child = createMockGroup('2', 'Child', 1, 2, 3);
      const parent = createMockGroup('1', 'Parent', 0, 1, 4, [child]);

      expect(component['isDescendant'](parent, child)).toBe(true);
    });

    it('should identify grandchild as descendant of grandparent', () => {
      const grandchild = createMockGroup('3', 'Grandchild', 2, 3, 4);
      const child = createMockGroup('2', 'Child', 1, 2, 5, [grandchild]);
      const parent = createMockGroup('1', 'Parent', 0, 1, 6, [child]);

      expect(component['isDescendant'](parent, grandchild)).toBe(true);
    });

    it('should not identify parent as descendant of child', () => {
      const child = createMockGroup('2', 'Child', 1, 2, 3);
      const parent = createMockGroup('1', 'Parent', 0, 1, 4, [child]);

      expect(component['isDescendant'](child, parent)).toBe(false);
    });

    it('should not identify sibling as descendant', () => {
      const sibling1 = createMockGroup('2', 'Sibling1', 1, 2, 3);
      const sibling2 = createMockGroup('3', 'Sibling2', 1, 4, 5);

      expect(component['isDescendant'](sibling1, sibling2)).toBe(false);
    });

    it('should not identify node as descendant of itself', () => {
      const node = createMockGroup('1', 'Node', 0, 1, 2);

      expect(component['isDescendant'](node, node)).toBe(false);
    });
  });
});

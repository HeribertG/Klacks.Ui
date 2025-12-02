/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoteComponent } from './note.component';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { signal, WritableSignal } from '@angular/core';
import { Annotation } from 'src/app/domain/models/client-class';

describe('NoteComponent', () => {
    let component: NoteComponent;
    let fixture: ComponentFixture<NoteComponent>;
    let mockDataManagementClientService: any;
    let mockAuthorizationService: any;
    let editClientSignal: WritableSignal<any>;
    let currentAnnotationIndexSignal: WritableSignal<number>;
    let editClientDeletedSignal: WritableSignal<boolean>;

    beforeEach(async () => {
        editClientSignal = signal({
            id: '123',
            annotations: [
                { id: '1', note: 'Test note 1', createTime: new Date() },
                { id: '2', note: 'Test note 2', createTime: new Date() },
            ],
        });

        currentAnnotationIndexSignal = signal(-1);
        editClientDeletedSignal = signal(false);

        mockDataManagementClientService = {
            editClient: editClientSignal,
            editClientDeleted: editClientDeletedSignal,
            currentAnnotationIndex: currentAnnotationIndexSignal,
            addAnnotation: vi.fn(),
            removeCurrentAnnotation: vi.fn(),
            clientEditService: {
                editClient: editClientSignal,
                currentAnnotationIndex: currentAnnotationIndexSignal,
            },
        };

        mockAuthorizationService = {
            isAdmin: true,
        };

        await TestBed.configureTestingModule({
            imports: [NoteComponent, TranslateModule.forRoot(), FormsModule],
            providers: [
                {
                    provide: DataManagementClientService,
                    useValue: mockDataManagementClientService,
                },
                { provide: AuthorizationService, useValue: mockAuthorizationService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(NoteComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('ngOnInit', () => {
        it('should initialize sortedAnnotations', () => {
            component.ngOnInit();
            expect(component.sortedAnnotations.length).toBe(2);
        });

        it('should initialize expandedNotes with first note expanded', () => {
            component.ngOnInit();
            expect(component.expandedNotes.length).toBe(2);
            expect(component.expandedNotes[0]).toBe(true);
            expect(component.expandedNotes[1]).toBe(false);
        });
    });

    describe('isDisabled', () => {
        it('should return true when client is deleted', () => {
            editClientDeletedSignal.set(true);
            expect(component.isDisabled()).toBe(true);
        });

        it('should return true when not authorized', () => {
            mockAuthorizationService.isAdmin = false;
            expect(component.isDisabled()).toBe(true);
        });

        it('should return false when authorized and client not deleted', () => {
            editClientDeletedSignal.set(false);
            mockAuthorizationService.isAdmin = true;
            expect(component.isDisabled()).toBe(false);
        });
    });

    describe('getFirstLine', () => {
        it('should return empty string for undefined text', () => {
            expect(component.getFirstLine(undefined)).toBe('');
        });

        it('should return full text when no newline', () => {
            expect(component.getFirstLine('Single line')).toBe('Single line');
        });

        it('should return only first line when newline present', () => {
            expect(component.getFirstLine('First line\nSecond line')).toBe('First line');
        });
    });

    describe('toggleNoteExpansion', () => {
        it('should toggle expansion state', () => {
            const mockEvent = new MouseEvent('click');
            vi.spyOn(mockEvent, 'stopPropagation');

            component.expandedNotes = [false, false];
            component.toggleNoteExpansion(0, mockEvent);

            expect(component.expandedNotes[0]).toBe(true);
            expect(mockEvent.stopPropagation).toHaveBeenCalled();
        });

        it('should prevent default on space key', () => {
            const mockEvent = new KeyboardEvent('keydown', { code: 'Space' });
            vi.spyOn(mockEvent, 'preventDefault');
            vi.spyOn(mockEvent, 'stopPropagation');

            component.expandedNotes = [false];
            component.toggleNoteExpansion(0, mockEvent);

            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(mockEvent.stopPropagation).toHaveBeenCalled();
        });
    });

    describe('getOriginalIndex', () => {
        it('should return the same index', () => {
            expect(component.getOriginalIndex(0)).toBe(0);
            expect(component.getOriginalIndex(5)).toBe(5);
        });
    });

    describe('onChange', () => {
        it('should update note content and emit change event', () => {
            const mockEvent = {
                target: { value: 'Updated note' },
            } as any;

            vi.spyOn(component.isChangingEvent, 'emit');

            component.onChange(0, mockEvent);

            expect(component.isChangingEvent.emit).toHaveBeenCalledWith(true);
        });
    });

    describe('newAnnotation', () => {
        it('should add new annotation and set it as expanded', async () => {
            const newAnnotation = new Annotation();
            editClientSignal.update((client) => {
                client.annotations.unshift(newAnnotation);
                return client;
            });

            vi.spyOn(component.isChangingEvent, 'emit');

            component.newAnnotation();

            await new Promise(resolve => setTimeout(resolve, 10));
            expect(mockDataManagementClientService.addAnnotation).toHaveBeenCalled();
            expect(component.expandedNotes[0]).toBe(true);
            expect(component.isChangingEvent.emit).toHaveBeenCalledWith(true);
        });
    });

    describe('onDeleteCurrentAnnotation', () => {
        it('should not delete when currentIndex is -1', () => {
            currentAnnotationIndexSignal.set(-1);
            component.onDeleteCurrentAnnotation();
            expect(mockDataManagementClientService.removeCurrentAnnotation).not.toHaveBeenCalled();
        });

        it('should delete annotation and reset currentIndex', async () => {
            currentAnnotationIndexSignal.set(0);
            component.expandedNotes = [true, false];

            editClientSignal.update((client) => {
                client.annotations.splice(0, 1);
                return client;
            });

            vi.spyOn(component.isChangingEvent, 'emit');

            component.onDeleteCurrentAnnotation();

            await new Promise(resolve => setTimeout(resolve, 10));
            expect(mockDataManagementClientService.removeCurrentAnnotation).toHaveBeenCalled();
            expect(currentAnnotationIndexSignal()).toBe(-1);
            expect(component.isChangingEvent.emit).toHaveBeenCalledWith(true);
        });
    });

    describe('onFocus', () => {
        it('should not set index when disabled', () => {
            editClientDeletedSignal.set(true);
            component.onFocus(1);
            expect(currentAnnotationIndexSignal()).toBe(-1);
        });

        it('should set currentAnnotationIndex when not disabled', () => {
            editClientDeletedSignal.set(false);
            mockAuthorizationService.isAdmin = true;
            component.onFocus(1);
            expect(currentAnnotationIndexSignal()).toBe(1);
        });
    });

    describe('handleKeyDown', () => {
        it('should toggle on Enter key', () => {
            const mockEvent = new KeyboardEvent('keydown', { key: 'Enter' });
            vi.spyOn(component, 'toggleNoteExpansion');

            component.handleKeyDown(0, mockEvent);

            expect(component.toggleNoteExpansion).toHaveBeenCalledWith(0, mockEvent);
        });

        it('should toggle on Space key', () => {
            const mockEvent = new KeyboardEvent('keydown', { key: ' ' });
            vi.spyOn(component, 'toggleNoteExpansion');

            component.handleKeyDown(0, mockEvent);

            expect(component.toggleNoteExpansion).toHaveBeenCalledWith(0, mockEvent);
        });

        it('should not toggle on other keys', () => {
            const mockEvent = new KeyboardEvent('keydown', { key: 'a' });
            vi.spyOn(component, 'toggleNoteExpansion');

            component.handleKeyDown(0, mockEvent);

            expect(component.toggleNoteExpansion).not.toHaveBeenCalled();
        });
    });

    describe('onContentChange', () => {
        it('should update annotation content and emit change', () => {
            vi.spyOn(component.isChangingEvent, 'emit');

            component.onContentChange(0, 'New content');

            expect(component.isChangingEvent.emit).toHaveBeenCalledWith(true);
        });
    });

    describe('initializeExpandedNotes', () => {
        it('should handle undefined annotations', () => {
            editClientSignal.set({ id: '123', annotations: undefined });
            component['initializeExpandedNotes']();

            expect(component.sortedAnnotations).toEqual([]);
            expect(component.expandedNotes).toEqual([]);
        });

        it('should handle empty annotations array', () => {
            editClientSignal.set({ id: '123', annotations: [] });
            component['initializeExpandedNotes']();

            expect(component.sortedAnnotations).toEqual([]);
            expect(component.expandedNotes).toEqual([]);
        });

        it('should expand first note by default', () => {
            editClientSignal.set({
                id: '123',
                annotations: [
                    { id: '1', note: 'Note 1' },
                    { id: '2', note: 'Note 2' },
                    { id: '3', note: 'Note 3' },
                ],
            });
            component['initializeExpandedNotes']();

            expect(component.expandedNotes[0]).toBe(true);
            expect(component.expandedNotes[1]).toBe(false);
            expect(component.expandedNotes[2]).toBe(false);
        });
    });
});

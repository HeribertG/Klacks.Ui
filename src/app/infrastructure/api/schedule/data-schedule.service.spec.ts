import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DataScheduleService } from './data-schedule.service';
import { Work } from 'src/app/domain/models/schedule/schedule-class';
import { environment } from 'src/environments/environment';
import { Client, Address, Communication, Annotation } from 'src/app/domain/models/client/client-class';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('DataScheduleService', () => {
    let service: DataScheduleService;
    let httpTestingController: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [],
            providers: [DataScheduleService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
        });
        service = TestBed.inject(DataScheduleService);
        httpTestingController = TestBed.inject(HttpTestingController);
    });

    it('should retrieve a work item by id', () => {
        const mockWorkInstance = mockWork();

        service.getWork('123').subscribe((work) => {
            expect(work).toEqual(mockWorkInstance);
        });

        const req = httpTestingController.expectOne(`${environment.baseUrl}Works/123`);
        expect(req.request.method).toEqual('GET');
        req.flush(mockWorkInstance);
    });

    afterEach(() => {
        httpTestingController.verify();
    });

    it('should add a new work item', () => {
        const newWork = mockWork(); // Verwende Mock-Work-Objekt
        service.addWork(newWork).subscribe((work) => {
            expect(work).toEqual(newWork); // Verifiziere, dass das hinzugefügte Work-Objekt zurückgegeben wird
        });

        const req = httpTestingController.expectOne(`${environment.baseUrl}Works/`);
        expect(req.request.method).toEqual('POST');
        req.flush(newWork); // Simuliere die Antwort
    });

    it('should update an existing work item', () => {
        const updatedWork = mockWork();
        updatedWork.information = 'Updated Information'; // Ändere eine Eigenschaft für den Test

        service.updateWork(updatedWork).subscribe((work) => {
            expect(work).toEqual(updatedWork); // Verifiziere die aktualisierten Daten
        });

        const req = httpTestingController.expectOne(`${environment.baseUrl}Works/`);
        expect(req.request.method).toEqual('PUT');
        req.flush(updatedWork); // Simuliere die Antwort
    });

    it('should delete a work item by id', () => {
        // Arrange
        const workId = 'work-123';
        const periodStart = '2026-01-01';
        const periodEnd = '2026-01-31';
        const deletedWork = mockWork();

        // Act
        service.deleteWork(workId, periodStart, periodEnd).subscribe((work) => {
            // Assert
            expect(work).toEqual(deletedWork);
        });

        const req = httpTestingController.expectOne(`${environment.baseUrl}Works/${workId}?periodStart=${periodStart}&periodEnd=${periodEnd}`);
        expect(req.request.method).toEqual('DELETE');
        req.flush(deletedWork);
    });

    it('should confirm a work item', () => {
        // Arrange
        const workId = 'work-123';
        const mockWorkInstance = mockWork();

        // Act
        service.confirmWork(workId).subscribe((work) => {
            // Assert
            expect(work).toEqual(mockWorkInstance);
        });

        const req = httpTestingController.expectOne(`${environment.baseUrl}Works/${workId}/Confirm`);
        expect(req.request.method).toEqual('POST');
        req.flush(mockWorkInstance);
    });

    it('should unconfirm a work item', () => {
        // Arrange
        const workId = 'work-123';
        const mockWorkInstance = mockWork();

        // Act
        service.unconfirmWork(workId).subscribe((work) => {
            // Assert
            expect(work).toEqual(mockWorkInstance);
        });

        const req = httpTestingController.expectOne(`${environment.baseUrl}Works/${workId}/Unconfirm`);
        expect(req.request.method).toEqual('POST');
        req.flush(mockWorkInstance);
    });

    it('should approve a day', () => {
        // Arrange
        const date = '2026-01-15';
        const groupId = 'group-123';

        // Act
        service.approveDay(date, groupId).subscribe((count) => {
            // Assert
            expect(count).toBe(5);
        });

        const req = httpTestingController.expectOne(`${environment.baseUrl}Works/ApproveDay`);
        expect(req.request.method).toEqual('POST');
        expect(req.request.body).toEqual({ date, groupId });
        req.flush(5);
    });

    it('should revoke day approval', () => {
        // Arrange
        const date = '2026-01-15';
        const groupId = 'group-123';

        // Act
        service.revokeDayApproval(date, groupId).subscribe((count) => {
            // Assert
            expect(count).toBe(3);
        });

        const req = httpTestingController.expectOne(`${environment.baseUrl}Works/RevokeDayApproval`);
        expect(req.request.method).toEqual('POST');
        expect(req.request.body).toEqual({ date, groupId });
        req.flush(3);
    });

    it('should close a period', () => {
        // Arrange
        const startDate = '2026-01-01';
        const endDate = '2026-01-31';

        // Act
        service.closePeriod(startDate, endDate).subscribe((count) => {
            // Assert
            expect(count).toBe(10);
        });

        const req = httpTestingController.expectOne(`${environment.baseUrl}Works/ClosePeriod`);
        expect(req.request.method).toEqual('POST');
        expect(req.request.body).toEqual({ startDate, endDate });
        req.flush(10);
    });

    it('should reopen a period', () => {
        // Arrange
        const startDate = '2026-01-01';
        const endDate = '2026-01-31';

        // Act
        service.reopenPeriod(startDate, endDate).subscribe((count) => {
            // Assert
            expect(count).toBe(8);
        });

        const req = httpTestingController.expectOne(`${environment.baseUrl}Works/ReopenPeriod`);
        expect(req.request.method).toEqual('POST');
        expect(req.request.body).toEqual({ startDate, endDate });
        req.flush(8);
    });

    const mockClient = (): Client => {
        const client = new Client();
        client.id = 'client-123';
        client.name = 'Test Name';
        client.addresses = [new Address()];
        client.communications = [new Communication()];
        client.annotations = [new Annotation()];
        return client;
    };

    const mockWork = (): Work => {
        const work = new Work();
        work.clientId = 'client-123';
        work.currentDate = new Date(2020, 0, 1);
        work.id = 'work-123';
        work.information = 'Test Information';
        work.shiftId = 'shift-123';
        work.workTime = 480;
        work.client = mockClient();
        return work;
    };
});

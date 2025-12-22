import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DataScheduleService } from './data-schedule.service';
import { Work } from 'src/app/domain/models/schedule-class';
import { environment } from 'src/environments/environment';
import { Client, Address, Communication, Annotation } from 'src/app/domain/models/client-class';
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
        const deletedWork = mockWork();

        // Act
        service.deleteWork(workId).subscribe((work) => {
            // Assert
            expect(work).toEqual(deletedWork);
        });

        const req = httpTestingController.expectOne(`${environment.baseUrl}Works/${workId}`);
        expect(req.request.method).toEqual('DELETE');
        req.flush(deletedWork);
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
        work.isSealed = false;
        work.shiftId = 'shift-123';
        work.workTime = 480;
        work.client = mockClient();
        return work;
    };
});

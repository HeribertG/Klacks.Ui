import { TestBed } from '@angular/core/testing';
import { ClientContractService } from './client-contract.service';
import { Client, ClientContract } from 'src/app/domain/models/client-class';

describe('ClientContractService', () => {
    let service: ClientContractService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ClientContractService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('setDateStructs', () => {
        it('should transform fromDate to internalFromDate NgbDateStruct', () => {
            const contract = new ClientContract();
            contract.fromDate = new Date(2025, 0, 15);
            contract.untilDate = undefined;

            service.setDateStructs([contract]);

            expect(contract.internalFromDate).toEqual({
                year: 2025,
                month: 1,
                day: 15
            });
            expect(contract.internalUntilDate).toBeUndefined();
        });

        it('should transform both fromDate and untilDate when untilDate is set', () => {
            const contract = new ClientContract();
            contract.fromDate = new Date(2025, 0, 15);
            contract.untilDate = new Date(2025, 11, 31);

            service.setDateStructs([contract]);

            expect(contract.internalFromDate).toEqual({
                year: 2025,
                month: 1,
                day: 15
            });
            expect(contract.internalUntilDate).toEqual({
                year: 2025,
                month: 12,
                day: 31
            });
        });

        it('should handle multiple contracts', () => {
            const contract1 = new ClientContract();
            contract1.fromDate = new Date(2025, 0, 1);

            const contract2 = new ClientContract();
            contract2.fromDate = new Date(2025, 5, 15);
            contract2.untilDate = new Date(2025, 11, 31);

            service.setDateStructs([contract1, contract2]);

            expect(contract1.internalFromDate).toEqual({
                year: 2025,
                month: 1,
                day: 1
            });
            expect(contract2.internalFromDate).toEqual({
                year: 2025,
                month: 6,
                day: 15
            });
            expect(contract2.internalUntilDate).toEqual({
                year: 2025,
                month: 12,
                day: 31
            });
        });

        it('should handle empty array', () => {
            expect(() => service.setDateStructs([])).not.toThrow();
        });
    });

    describe('addContract', () => {
        it('should add a new contract to client', () => {
            const client = new Client();
            client.id = 'test-client-id';
            client.clientContracts = [];

            const result = service.addContract(client);

            expect(result.clientContracts.length).toBe(1);
            expect(result.clientContracts[0].clientId).toBe('test-client-id');
        });

        it('should set fromDate to today', () => {
            const client = new Client();
            client.id = 'test-client-id';
            client.clientContracts = [];

            const today = new Date();
            const result = service.addContract(client);

            const contract = result.clientContracts[0];
            expect(contract.fromDate.getDate()).toBe(today.getDate());
            expect(contract.fromDate.getMonth()).toBe(today.getMonth());
            expect(contract.fromDate.getFullYear()).toBe(today.getFullYear());
        });

        it('should set internalFromDate to NgbDateStruct of today', () => {
            const client = new Client();
            client.id = 'test-client-id';
            client.clientContracts = [];

            const today = new Date();
            const result = service.addContract(client);

            const contract = result.clientContracts[0];
            expect(contract.internalFromDate).toEqual({
                year: today.getFullYear(),
                month: today.getMonth() + 1,
                day: today.getDate()
            });
        });

        it('should preserve existing contracts when adding new one', () => {
            const client = new Client();
            client.id = 'test-client-id';

            const existingContract = new ClientContract();
            existingContract.id = 'existing-contract';
            existingContract.clientId = 'test-client-id';
            client.clientContracts = [existingContract];

            const result = service.addContract(client);

            expect(result.clientContracts.length).toBe(2);
            expect(result.clientContracts[0].id).toBe('existing-contract');
            expect(result.clientContracts[1].clientId).toBe('test-client-id');
        });

        it('should handle client without id', () => {
            const client = new Client();
            client.clientContracts = [];

            const result = service.addContract(client);

            expect(result.clientContracts.length).toBe(1);
            expect(result.clientContracts[0].clientId).toBe('');
        });
    });

    describe('removeContract', () => {
        it('should remove contract at specified index', () => {
            const client = new Client();

            const contract1 = new ClientContract();
            contract1.id = 'contract-1';

            const contract2 = new ClientContract();
            contract2.id = 'contract-2';

            const contract3 = new ClientContract();
            contract3.id = 'contract-3';

            client.clientContracts = [contract1, contract2, contract3];

            const result = service.removeContract(client, 1);

            expect(result.clientContracts.length).toBe(2);
            expect(result.clientContracts[0].id).toBe('contract-1');
            expect(result.clientContracts[1].id).toBe('contract-3');
        });

        it('should remove first contract when index is 0', () => {
            const client = new Client();

            const contract1 = new ClientContract();
            contract1.id = 'contract-1';

            const contract2 = new ClientContract();
            contract2.id = 'contract-2';

            client.clientContracts = [contract1, contract2];

            const result = service.removeContract(client, 0);

            expect(result.clientContracts.length).toBe(1);
            expect(result.clientContracts[0].id).toBe('contract-2');
        });

        it('should remove last contract when index is last', () => {
            const client = new Client();

            const contract1 = new ClientContract();
            contract1.id = 'contract-1';

            const contract2 = new ClientContract();
            contract2.id = 'contract-2';

            client.clientContracts = [contract1, contract2];

            const result = service.removeContract(client, 1);

            expect(result.clientContracts.length).toBe(1);
            expect(result.clientContracts[0].id).toBe('contract-1');
        });

        it('should handle removing from single contract array', () => {
            const client = new Client();

            const contract = new ClientContract();
            contract.id = 'contract-1';

            client.clientContracts = [contract];

            const result = service.removeContract(client, 0);

            expect(result.clientContracts.length).toBe(0);
        });

        it('should not modify array when index is out of bounds', () => {
            const client = new Client();

            const contract1 = new ClientContract();
            contract1.id = 'contract-1';

            client.clientContracts = [contract1];

            const result = service.removeContract(client, 5);

            expect(result.clientContracts.length).toBe(1);
            expect(result.clientContracts[0].id).toBe('contract-1');
        });
    });
});

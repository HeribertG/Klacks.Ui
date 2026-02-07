import { TestBed } from '@angular/core/testing';
import { ClientContractService } from './client-contract.service';
import { Client, ClientContract } from 'src/app/domain/models/client/client-class';

describe('ClientContractService', () => {
    let service: ClientContractService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ClientContractService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('addContract', () => {
        it('should add a new contract to client', () => {
            // Arrange
            const client = new Client();
            client.id = 'test-client-id';
            client.clientContracts = [];

            // Act
            const result = service.addContract(client);

            // Assert
            expect(result.clientContracts.length).toBe(1);
            expect(result.clientContracts[0].clientId).toBe('test-client-id');
        });

        it('should set fromDate to today', () => {
            // Arrange
            const client = new Client();
            client.id = 'test-client-id';
            client.clientContracts = [];
            const today = new Date();

            // Act
            const result = service.addContract(client);

            // Assert
            const contract = result.clientContracts[0];
            expect(contract.fromDate.getDate()).toBe(today.getDate());
            expect(contract.fromDate.getMonth()).toBe(today.getMonth());
            expect(contract.fromDate.getFullYear()).toBe(today.getFullYear());
        });

        it('should preserve existing contracts when adding new one', () => {
            // Arrange
            const client = new Client();
            client.id = 'test-client-id';

            const existingContract = new ClientContract();
            existingContract.id = 'existing-contract';
            existingContract.clientId = 'test-client-id';
            client.clientContracts = [existingContract];

            // Act
            const result = service.addContract(client);

            // Assert
            expect(result.clientContracts.length).toBe(2);
            expect(result.clientContracts[0].id).toBe('existing-contract');
            expect(result.clientContracts[1].clientId).toBe('test-client-id');
        });

        it('should handle client without id', () => {
            // Arrange
            const client = new Client();
            client.clientContracts = [];

            // Act
            const result = service.addContract(client);

            // Assert
            expect(result.clientContracts.length).toBe(1);
            expect(result.clientContracts[0].clientId).toBe('');
        });
    });

    describe('removeContract', () => {
        it('should remove contract at specified index', () => {
            // Arrange
            const client = new Client();

            const contract1 = new ClientContract();
            contract1.id = 'contract-1';

            const contract2 = new ClientContract();
            contract2.id = 'contract-2';

            const contract3 = new ClientContract();
            contract3.id = 'contract-3';

            client.clientContracts = [contract1, contract2, contract3];

            // Act
            const result = service.removeContract(client, 1);

            // Assert
            expect(result.clientContracts.length).toBe(2);
            expect(result.clientContracts[0].id).toBe('contract-1');
            expect(result.clientContracts[1].id).toBe('contract-3');
        });

        it('should remove first contract when index is 0', () => {
            // Arrange
            const client = new Client();

            const contract1 = new ClientContract();
            contract1.id = 'contract-1';

            const contract2 = new ClientContract();
            contract2.id = 'contract-2';

            client.clientContracts = [contract1, contract2];

            // Act
            const result = service.removeContract(client, 0);

            // Assert
            expect(result.clientContracts.length).toBe(1);
            expect(result.clientContracts[0].id).toBe('contract-2');
        });

        it('should remove last contract when index is last', () => {
            // Arrange
            const client = new Client();

            const contract1 = new ClientContract();
            contract1.id = 'contract-1';

            const contract2 = new ClientContract();
            contract2.id = 'contract-2';

            client.clientContracts = [contract1, contract2];

            // Act
            const result = service.removeContract(client, 1);

            // Assert
            expect(result.clientContracts.length).toBe(1);
            expect(result.clientContracts[0].id).toBe('contract-1');
        });

        it('should handle removing from single contract array', () => {
            // Arrange
            const client = new Client();

            const contract = new ClientContract();
            contract.id = 'contract-1';

            client.clientContracts = [contract];

            // Act
            const result = service.removeContract(client, 0);

            // Assert
            expect(result.clientContracts.length).toBe(0);
        });

        it('should not modify array when index is out of bounds', () => {
            // Arrange
            const client = new Client();

            const contract1 = new ClientContract();
            contract1.id = 'contract-1';

            client.clientContracts = [contract1];

            // Act
            const result = service.removeContract(client, 5);

            // Assert
            expect(result.clientContracts.length).toBe(1);
            expect(result.clientContracts[0].id).toBe('contract-1');
        });
    });
});

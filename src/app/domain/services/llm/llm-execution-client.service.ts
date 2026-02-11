/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, from, timer } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { ILLMFunctionCall, ILLMFunctionResult } from '../../interfaces/llm-function-definitions.interface';
import { DataManagementClientService } from '../client/data-management-client.service';
import { DataManagementContractService } from '../contract/data-management-contract.service';
import { DataManagementGroupService } from '../group/data-management-group.service';
import { ClientContract } from '../../models/client/client-class';
import { ClientGroupItem } from '../../models/client/client-group-item-class';

@Injectable()
export class LlmExecutionClientService {
  private router = inject(Router);
  private dataManagementClientService = inject(DataManagementClientService);
  private dataManagementContractService = inject(DataManagementContractService);
  private dataManagementGroupService = inject(DataManagementGroupService);

  executeCreateClient(call: ILLMFunctionCall): Observable<ILLMFunctionResult> {
    const {
      firstName,
      lastName,
      gender,
      birthdate,
      street,
      postalCode,
      city,
      canton,
      country,
      contractType,
      groupPath,
    } = call.arguments;

    const clientEditService =
      this.dataManagementClientService.clientEditService;

    clientEditService.createClient();

    return from(this.ensureServicesInitialized()).pipe(
      switchMap(() => timer(500)),
      tap(() => {
        const editClient = clientEditService.editClient();
        if (editClient) {
          editClient.firstName = firstName || '';
          editClient.name = lastName || '';
          editClient.gender = this.parseGender(gender);

          if (birthdate) {
            const date = new Date(birthdate);
            if (!isNaN(date.getTime())) {
              editClient.birthdate = date;
            }
          }

          if (editClient.addresses && editClient.addresses.length > 0) {
            const address = editClient.addresses[0];
            address.street = street || '';
            address.zip = postalCode || '';
            address.city = city || '';
            address.state =
              canton || this.getCantonFromPostalCode(postalCode) || '';
            address.country = this.getCountryAbbreviation(country) || 'CH';
          }

          if (contractType) {
            this.assignContractToClient(editClient, contractType);
          }

          if (groupPath) {
            this.assignGroupToClient(editClient, groupPath);
          }

          clientEditService.editClient.set({ ...editClient });
        }
      }),
      switchMap(() => {
        return new Observable<ILLMFunctionResult>((observer) => {
          clientEditService.onSaveCompleted = () => {
            const savedClient = clientEditService.editClient();
            this.router.navigate(['/workplace/edit-address', savedClient?.id]);

            const assignedContract = savedClient?.clientContracts?.find((c) =>
              c.contract?.name?.includes(contractType)
            );
            const assignedGroup = savedClient?.groupItems?.find(
              (g) => g.groupName
            );

            let message = `Client ${firstName} ${lastName} created successfully.`;
            if (assignedContract) {
              message += ` Contract "${assignedContract.contract?.name}" assigned.`;
            } else if (contractType) {
              message += ` Contract "${contractType}" assigned.`;
            }
            if (assignedGroup) {
              message += ` Group "${assignedGroup.groupName}" assigned.`;
            } else if (groupPath) {
              message += ` Group from path "${groupPath}" assigned.`;
            }

            observer.next({
              id: call.id,
              success: true,
              result: {
                id: savedClient?.id,
                firstName: savedClient?.firstName,
                lastName: savedClient?.name,
                canton: canton || this.getCantonFromPostalCode(postalCode),
                country: country || 'Schweiz',
                contractAssigned: !!assignedContract || !!contractType,
                groupAssigned: !!assignedGroup || !!groupPath,
                message,
              },
            });
            observer.complete();
          };

          clientEditService.saveEditClient();

          setTimeout(() => {
            if (!clientEditService.lastSaveError()) {
              return;
            }
            observer.next({
              id: call.id,
              success: false,
              error:
                clientEditService.lastSaveErrorMessage() ||
                'Error saving client',
            });
            observer.complete();
          }, 5000);
        });
      }),
      catchError((error) =>
        of({
          id: call.id,
          success: false,
          error: error.message || 'Error creating client',
        })
      )
    );
  }

  private assignContractToClient(client: any, contractType: string): void {
    const contracts = this.dataManagementContractService.contracts;

    const matchingContract = contracts.find(
      (c) =>
        c.name?.toLowerCase().includes(contractType.toLowerCase()) ||
        contractType.toLowerCase().includes(c.name?.toLowerCase() || '')
    );

    if (matchingContract && matchingContract.id) {
      const newClientContract: any = new ClientContract();
      newClientContract.clientId = client.id || '';
      newClientContract.contractId = matchingContract.id;
      newClientContract.contract = matchingContract;
      newClientContract.fromDate = new Date();
      newClientContract.isActive = true;

      if (!client.clientContracts) {
        client.clientContracts = [];
      }
      client.clientContracts.push(newClientContract);
    }
  }

  private assignGroupToClient(client: any, groupPath: string): void {
    const flatNodeList = this.dataManagementGroupService.flatNodeList;

    const pathParts = groupPath.split('->').map((p) => p.trim().toLowerCase());
    const lastPart = pathParts[pathParts.length - 1];

    let matchingGroup = flatNodeList.find(
      (g) => g.name?.toLowerCase() === lastPart
    );

    if (!matchingGroup) {
      matchingGroup = flatNodeList.find(
        (g) =>
          g.name?.toLowerCase().includes(lastPart) ||
          lastPart.includes(g.name?.toLowerCase() || '')
      );
    }

    if (matchingGroup) {
      const newGroupItem = new ClientGroupItem();
      newGroupItem.clientId = client.id || '';
      newGroupItem.groupId = matchingGroup.id;
      newGroupItem.groupName = matchingGroup.name;
      newGroupItem.validFrom = new Date();

      if (!client.groupItems) {
        client.groupItems = [];
      }
      client.groupItems.push(newGroupItem);
    }
  }

  private getCantonFromPostalCode(postalCode: string): string {
    if (!postalCode) return '';
    const plz = parseInt(postalCode, 10);
    if (isNaN(plz)) return '';

    if (plz >= 1000 && plz < 2000) return 'VD';
    if (plz >= 2000 && plz < 3000) return 'NE';
    if (plz >= 3000 && plz < 4000) return 'BE';
    if (plz >= 4000 && plz < 5000) return 'BS';
    if (plz >= 5000 && plz < 6000) return 'AG';
    if (plz >= 6000 && plz < 7000) return 'LU';
    if (plz >= 7000 && plz < 8000) return 'GR';
    if (plz >= 8000 && plz < 9000) return 'ZH';
    if (plz >= 9000 && plz < 10000) return 'SG';

    return '';
  }

  private getCountryAbbreviation(country: string): string {
    if (!country) return 'CH';

    const countryLower = country.toLowerCase().trim();

    const countryMap: Record<string, string> = {
      schweiz: 'CH',
      switzerland: 'CH',
      suisse: 'CH',
      svizzera: 'CH',
      ch: 'CH',
      deutschland: 'DE',
      germany: 'DE',
      de: 'DE',
      österreich: 'AT',
      oesterreich: 'AT',
      austria: 'AT',
      at: 'AT',
      frankreich: 'FR',
      france: 'FR',
      fr: 'FR',
      italien: 'IT',
      italy: 'IT',
      italia: 'IT',
      it: 'IT',
      liechtenstein: 'LI',
      li: 'LI',
    };

    return countryMap[countryLower] || country.toUpperCase().substring(0, 2);
  }

  private parseGender(gender: string): number {
    switch (gender?.toLowerCase()) {
      case 'male':
        return 1;
      case 'female':
        return 0;
      case 'intersexuality':
        return 2;
      case 'legalentity':
        return 3;
      default:
        return 1;
    }
  }

  private async ensureServicesInitialized(): Promise<void> {
    if (this.dataManagementContractService.contracts.length === 0) {
      await this.dataManagementContractService.init();
    }
    if (this.dataManagementGroupService.flatNodeList.length === 0) {
      this.dataManagementGroupService.initTree();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

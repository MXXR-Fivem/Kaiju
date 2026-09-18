import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  District,
  DistrictAdjacency,
  ResourceType,
  DistrictResourceDetail,
  TransferRequestDetail,
  DisasterEvent
} from '../models/kaiju.models';

@Injectable({
  providedIn: 'root'
})
export class KaijuApiService {
  private http = inject(HttpClient);
  private baseUrl = this.resolveBaseUrl();

  private resolveBaseUrl(): string {
    if (typeof window !== 'undefined' && window.location.port === '4200') {
      return 'http://localhost:8080/api';
    }
    return '/api';
  }

  getDistricts(): Observable<District[]> {
    return this.http.get<District[]>(`${this.baseUrl}/districts`);
  }

  getDistrict(codeOrId: string): Observable<District> {
    return this.http.get<District>(`${this.baseUrl}/districts/${codeOrId}`);
  }

  getDistrictAdjacencies(codeOrId: string): Observable<DistrictAdjacency[]> {
    return this.http.get<DistrictAdjacency[]>(`${this.baseUrl}/districts/${codeOrId}/adjacencies`);
  }

  getResourceTypes(): Observable<ResourceType[]> {
    return this.http.get<ResourceType[]>(`${this.baseUrl}/resources/types`);
  }

  getInventory(districtCode?: string): Observable<DistrictResourceDetail[]> {
    const url = districtCode
      ? `${this.baseUrl}/resources/inventory/${districtCode}`
      : `${this.baseUrl}/resources/inventory`;
    return this.http.get<DistrictResourceDetail[]>(url);
  }

  reserveResource(data: {
    district_id_or_code: string;
    resource_code: string;
    user_id: string;
    team_name: string;
    quantity: number;
  }): Observable<{ status: string; reservation_id: string; message: string }> {
    return this.http.post<{ status: string; reservation_id: string; message: string }>(
      `${this.baseUrl}/resources/reserve`,
      data
    );
  }

  releaseReservation(id: string): Observable<{ status: string; reservation_id: string }> {
    return this.http.post<{ status: string; reservation_id: string }>(
      `${this.baseUrl}/resources/reserve/${id}/release`,
      {}
    );
  }

  getTransfers(): Observable<TransferRequestDetail[]> {
    return this.http.get<TransferRequestDetail[]>(`${this.baseUrl}/transfers`);
  }

  createTransfer(data: {
    requester_id: string;
    source_district: string;
    target_district: string;
    resource_code: string;
    quantity: number;
    route_type: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/transfers`, data);
  }

  reviewTransit(id: string, approver_role: string, approved: boolean): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/transfers/${id}/transit`, {
      approver_role,
      approved
    });
  }

  completeDelivery(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/transfers/${id}/deliver`, {});
  }

  getActiveDisaster(): Observable<{ active_disaster: DisasterEvent | null }> {
    return this.http.get<{ active_disaster: DisasterEvent | null }>(`${this.baseUrl}/disaster/active`);
  }

  resolveDisaster(): Observable<{ status: string; disaster: DisasterEvent | null }> {
    return this.http.post<{ status: string; disaster: DisasterEvent | null }>(`${this.baseUrl}/disaster/resolve`, {});
  }

  verifyGodMode(secret_password: string): Observable<{ authenticated: boolean; role: string }> {
    return this.http.post<{ authenticated: boolean; role: string }>(`${this.baseUrl}/god-mode/verify`, {
      secret_password
    });
  }

  triggerGodMode(data: {
    secret_password: string;
    district_target: string;
    disaster_type: string;
    intensity: number;
  }): Observable<DisasterEvent> {
    return this.http.post<DisasterEvent>(`${this.baseUrl}/god-mode/trigger`, data);
  }

  overrideRetention(data: {
    secret_password: string;
    district_target: string;
    user_role: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/god-mode/retention-override`, data);
  }
}

import { Injectable, computed, inject, signal } from '@angular/core';
import { KaijuApiService } from './kaiju-api.service';
import { KaijuWsService } from './kaiju-ws.service';
import { Disaster, District, Reservation, Stock, TacticalLayer, Transfer } from '../models/kaiju.models';

@Injectable({ providedIn: 'root' })
export class CrisisContextService {
  private api = inject(KaijuApiService);

  readonly districts = signal<District[]>([]);
  readonly disasters = signal<Disaster[]>([]);
  readonly stocks = signal<Stock[]>([]);
  readonly transfers = signal<Transfer[]>([]);
  readonly reservations = signal<Reservation[]>([]);
  readonly selectedDistrictCode = signal<string | null>(null);
  readonly activeTacticalLayer = signal<TacticalLayer>('GLOBAL');

  readonly sidebarCollapsed = signal<boolean>(false);

  readonly cityLevel = computed(() => Math.max(1, ...this.districts().map((d) => d.disaster_level)));
  readonly resourceTypes = computed(() => {
    const names = new Map(this.stocks().map((s) => [s.resource_code, s.resource_name]));
    return [...names].map(([code, name]) => ({ code, name }));
  });

  constructor() {
    inject(KaijuWsService).events$.subscribe((event) => {
      switch (event.type) {
        case 'RESOURCE_UPDATED':
          this.refreshStocks();
          this.refreshReservations();
          break;
        case 'RETENTION_CHANGED':
          this.refreshStocks();
          break;
        case 'TRANSFER_UPDATED':
          this.refreshTransfers();
          break;
        case 'LEVEL_CHANGED':
          this.refreshDistricts();
          break;
        case 'RESET':
          this.loadAll();
          break;
      }
    });
  }

  loadAll(): void {
    this.refreshDistricts();
    this.refreshStocks();
    this.refreshTransfers();
    this.refreshReservations();
  }

  stock(district: string, resource: string): Stock | undefined {
    return this.stocks().find((s) => s.district_code === district && s.resource_code === resource);
  }

  refreshDistricts(): void {
    this.api.getDistricts().subscribe((districts) => this.districts.set(districts));
    this.api.getDisasters().subscribe((disasters) => this.disasters.set(disasters));
  }

  refreshStocks(): void {
    this.api.getStocks().subscribe((stocks) => this.stocks.set(stocks));
  }

  refreshTransfers(): void {
    this.api.getTransfers().subscribe((transfers) => this.transfers.set(transfers));
  }

  refreshReservations(): void {
    this.api.getReservations().subscribe((reservations) => this.reservations.set(reservations));
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((collapsed) => !collapsed);
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsed.set(collapsed);
  }
}

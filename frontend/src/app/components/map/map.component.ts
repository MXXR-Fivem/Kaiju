import { Component, ElementRef, OnInit, OnDestroy, ViewChild, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { KaijuApiService } from '../../services/kaiju-api.service';
import { KaijuWsService } from '../../services/kaiju-ws.service';
import { CrisisContextService } from '../../services/crisis-context.service';
import { District, DisasterEvent, TacticalLayer, TACTICAL_LAYERS, DistrictResourceDetail, TransferRequestDetail } from '../../models/kaiju.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-full bg-[#07090e] overflow-hidden select-none">
      <div #mapContainer class="w-full h-full z-0"></div>

      <div *ngIf="activeDisaster" 
           class="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-6 py-2 rounded-full border border-red-500 bg-red-950/90 backdrop-blur-md shadow-2xl flex items-center gap-3 animate-pulse">
        <span class="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
        <span class="font-mono font-bold tracking-wider text-red-300 text-sm">
          ALERTE CATASTROPHE : {{ activeDisaster.disaster_type }} DANS {{ getDistrictName(activeDisaster.district_id) }} (NIVEAU {{ activeDisaster.calculated_level }})
        </span>
        <span class="text-xs px-2 py-0.5 rounded bg-red-800 text-red-100 font-mono">
          Intensite : {{ activeDisaster.intensity }}%
        </span>
      </div>

      <div class="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2 p-2 rounded-xl bg-slate-950/90 border border-slate-800/80 backdrop-blur-md shadow-2xl">
        <div class="text-[9px] font-mono uppercase tracking-widest text-slate-400 text-center pb-1 border-b border-slate-800">
          CALQUES
        </div>

        <button *ngFor="let layer of tacticalLayers"
                (click)="setLayer(layer.id)"
                class="group relative flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-xs transition border"
                [ngClass]="context.activeTacticalLayer() === layer.id 
                  ? 'bg-slate-900 border-sky-400 text-white shadow-lg shadow-sky-950/50' 
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-900/80'">
          <span class="px-1.5 py-0.5 rounded bg-slate-800 font-bold text-[10px]" [style.color]="layer.color">{{ layer.tag }}</span>

          <div class="text-left">
            <div class="font-bold text-[11px] leading-tight" 
                 [style.color]="context.activeTacticalLayer() === layer.id ? layer.color : ''">
              {{ layer.label }}
            </div>
            <div class="text-[9px] text-slate-400 leading-none">
              {{ layer.sublabel }}
            </div>
          </div>

          <span *ngIf="context.activeTacticalLayer() === layer.id" 
                class="w-1.5 h-1.5 rounded-full animate-ping ml-1"
                [style.background-color]="layer.color"></span>
        </button>
      </div>

      <div class="absolute top-4 left-4 z-20 px-4 py-2.5 rounded-lg bg-slate-950/90 border border-slate-800/80 backdrop-blur text-xs font-mono text-slate-200 shadow-xl space-y-1">
        <div class="flex items-center gap-2">
          <span class="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-sky-400 font-bold">{{ getCurrentLayerConfig().tag }}</span>
          <span class="font-bold uppercase tracking-wider text-sky-400 text-[11px]">
            Mode : {{ getCurrentLayerConfig().label }}
          </span>
        </div>
        <div class="text-[10px] text-slate-400">
          {{ getLayerLiveMetrics() }}
        </div>
      </div>

      <div class="absolute bottom-6 left-6 z-10 p-3 rounded-lg bg-slate-900/90 border border-slate-800 backdrop-blur text-xs font-mono text-slate-300 shadow-xl space-y-1.5">
        <div class="font-semibold text-sky-400 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-800 flex items-center justify-between">
          <span>Reseau Operationnel</span>
          <span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{{ context.activeTacticalLayer() }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-1 bg-amber-500 rounded"></span>
          <span>Corridor Terrestre (Direct / Transit Xeno)</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-1 border-b border-dashed border-sky-400"></span>
          <span>Corridor Maritime Baie (Echo, Xeno, Zion - Temps x2)</span>
        </div>
        <div *ngIf="context.activeTacticalLayer() === 'POWER'" class="flex items-center gap-2 text-amber-300 text-[10px]">
          <span class="w-3 h-1 bg-sky-400 rounded animate-pulse"></span>
          <span>Lignes H.T. Actives / Coupees en rouge</span>
        </div>
        <div *ngIf="context.activeTacticalLayer() === 'WATER'" class="flex items-center gap-2 text-sky-300 text-[10px]">
          <span class="w-3 h-1 bg-blue-500 rounded"></span>
          <span>Aqueducs de liaison & Stations cotieres</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class MapComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  api = inject(KaijuApiService);
  ws = inject(KaijuWsService);
  context = inject(CrisisContextService);

  tacticalLayers = TACTICAL_LAYERS;

  private map!: L.Map;
  private districtLayers: Map<string, L.Polygon> = new Map();
  private markerLayers: Map<string, L.Marker> = new Map();
  private routeLayers: L.LayerGroup = L.layerGroup();
  private infrastructureLayers: L.LayerGroup = L.layerGroup();
  private convoyLayers: L.LayerGroup = L.layerGroup();
  private subs: Subscription = new Subscription();

  districts: District[] = [];
  inventory: DistrictResourceDetail[] = [];
  transfers: TransferRequestDetail[] = [];
  activeDisaster: DisasterEvent | null = null;

  constructor() {
    effect(() => {
      const layer = this.context.activeTacticalLayer();
      if (this.map && this.districts.length > 0) {
        this.renderAllMapLayers();
      }
    });
  }

  ngOnInit(): void {
    this.initMap();
    this.loadData();
    this.listenToEvents();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    if (this.map) {
      this.map.remove();
    }
  }

  setLayer(layerId: TacticalLayer): void {
    this.context.setTacticalLayer(layerId);
  }

  getCurrentLayerConfig() {
    return this.tacticalLayers.find((l) => l.id === this.context.activeTacticalLayer()) || this.tacticalLayers[0];
  }

  getLayerLiveMetrics(): string {
    const layer = this.context.activeTacticalLayer();
    switch (layer) {
      case 'POWER': {
        const totalGen = this.getCityTotal('GENERATOR');
        const totalFuel = this.getCityTotal('FUEL');
        const inTransit = this.countTransfersInTransit(['GENERATOR', 'FUEL']);
        return `Reseau H.T. : ${totalGen} generateurs | ${totalFuel.toLocaleString()} L carburant | ${inTransit} convois energie`;
      }
      case 'WATER': {
        const totalWater = this.getCityTotal('WATER');
        const totalPurifiers = this.getCityTotal('WATER_PURIFIER');
        const inTransit = this.countTransfersInTransit(['WATER', 'WATER_PURIFIER']);
        return `Reseau Eau : ${totalWater.toLocaleString()} L potable | ${totalPurifiers} purificateurs | ${inTransit} convois citernes`;
      }
      case 'FOOD': {
        const totalFood = this.getCityTotal('FOOD');
        const inTransit = this.countTransfersInTransit(['FOOD']);
        return `Subsistance : ${totalFood.toLocaleString()} rations | ${inTransit} convois alimentaires`;
      }
      case 'MEDICAL': {
        const totalMed = this.getCityTotal('MED_KIT');
        const totalStaff = this.getCityTotal('MEDIC');
        const inTransit = this.countTransfersInTransit(['MED_KIT', 'MEDIC']);
        return `Urgences : ${totalMed} kits chirurgicaux | ${totalStaff} brigades | ${inTransit} convois sanitaires`;
      }
      case 'HEAVY_GEAR': {
        const shelters = this.getCityTotal('SHELTER');
        const atv = this.getCityTotal('ATV');
        const inTransit = this.countTransfersInTransit(['SHELTER', 'ATV', 'CLEARING_GEAR']);
        return `Abris : ${shelters} modules | 4x4 : ${atv} vehicules | ${inTransit} convois lourds`;
      }
      default:
        return `Vue globale 5 secteurs de Tokyork | ${this.transfers.filter(t => t.status === 'IN_TRANSIT').length} convois logistiques actifs`;
    }
  }

  private getCityTotal(resourceCode: string): number {
    return this.inventory
      .filter((i) => i.resource_code === resourceCode)
      .reduce((sum, item) => sum + item.current_quantity, 0);
  }

  private countTransfersInTransit(resourceCodes: string[]): number {
    return this.transfers.filter(
      (t) => t.status === 'IN_TRANSIT' && resourceCodes.includes(t.resource_code)
    ).length;
  }

  private initMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [35.6760, 139.7550],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(this.map);

    this.routeLayers.addTo(this.map);
    this.infrastructureLayers.addTo(this.map);
    this.convoyLayers.addTo(this.map);
  }

  private loadData(): void {
    this.api.getDistricts().subscribe({
      next: (districts) => {
        this.districts = districts;
        this.api.getInventory().subscribe({
          next: (inv) => {
            this.inventory = inv;
            this.api.getTransfers().subscribe({
              next: (transfers) => {
                this.transfers = transfers;
                this.renderAllMapLayers();
              }
            });
          }
        });
      },
      error: () => {}
    });

    this.api.getActiveDisaster().subscribe({
      next: (res) => {
        this.activeDisaster = res.active_disaster;
        if (this.activeDisaster) {
          this.context.setDisasterLevel(this.activeDisaster.calculated_level);
        }
      }
    });
  }

  private listenToEvents(): void {
    this.subs.add(
      this.ws.disasterChanges$.subscribe((payload) => {
        if (payload && payload.level) {
          this.activeDisaster = {
            id: payload.disaster_id,
            district_id: payload.district_id,
            disaster_type: payload.disaster_type,
            intensity: payload.intensity,
            calculated_level: payload.level,
            is_active: true,
            triggered_by: 'WS',
            triggered_at: new Date().toISOString()
          };
          this.context.setDisasterLevel(payload.level);
        } else {
          this.activeDisaster = null;
          this.context.setDisasterLevel(1);
        }
        this.reloadAndRerender();
      })
    );

    this.subs.add(
      this.ws.resourceUpdates$.subscribe(() => {
        this.api.getInventory().subscribe((inv) => {
          this.inventory = inv;
          this.renderAllMapLayers();
        });
      })
    );

    this.subs.add(
      this.ws.transferUpdates$.subscribe(() => {
        this.api.getTransfers().subscribe((t) => {
          this.transfers = t;
          this.renderAllMapLayers();
        });
      })
    );
  }

  private reloadAndRerender(): void {
    this.api.getDistricts().subscribe((d) => {
      this.districts = d;
      this.renderAllMapLayers();
    });
  }

  private renderAllMapLayers(): void {
    this.renderDistricts();
    this.renderRoutes();
    this.renderInfrastructure();
    this.renderConvoys();
  }

  private renderDistricts(): void {
    const currentLayer = this.context.activeTacticalLayer();

    this.districts.forEach((d) => {
      try {
        const bounds: [number, number][] = JSON.parse(d.polygon_bounds_json);
        
        let polygon = this.districtLayers.get(d.id);
        if (!polygon) {
          polygon = L.polygon(bounds, this.getDistrictStyle(d));
          polygon.on('click', () => {
            this.context.selectDistrict(d.code);
            this.context.isInventoryModalOpen.set(true);
          });
          polygon.addTo(this.map);
          this.districtLayers.set(d.id, polygon);
        } else {
          polygon.setStyle(this.getDistrictStyle(d));
        }

        const markerHtml = this.buildDistrictMarkerHtml(d, currentLayer);
        const customIcon = L.divIcon({
          className: 'kaiju-radar-marker',
          html: markerHtml,
          iconSize: [80, 50],
          iconAnchor: [40, 25],
        });

        let marker = this.markerLayers.get(d.id);
        if (!marker) {
          marker = L.marker([d.latitude, d.longitude], { icon: customIcon });
          marker.on('click', () => {
            this.context.selectDistrict(d.code);
            this.context.isInventoryModalOpen.set(true);
          });
          marker.addTo(this.map);
          this.markerLayers.set(d.id, marker);
        } else {
          marker.setIcon(customIcon);
        }
      } catch {}
    });
  }

  private buildDistrictMarkerHtml(d: District, layer: TacticalLayer): string {
    const isSinistre = this.activeDisaster?.district_id === d.id || d.current_disaster_level > 1;
    const badgeColor = isSinistre ? 'border-red-500 text-red-300' : 'border-slate-700 text-white';

    let layerBadge = '';
    switch (layer) {
      case 'POWER': {
        const gen = this.getDistrictStock(d.id, 'GENERATOR');
        const fuel = this.getDistrictStock(d.id, 'FUEL');
        const isBlackout = d.current_disaster_level >= 3 && gen < 30;
        layerBadge = `
          <div class="px-1.5 py-0.5 rounded text-[9px] font-mono border ${isBlackout ? 'bg-red-950/90 border-red-500 text-red-300 animate-pulse' : 'bg-amber-950/80 border-amber-600 text-amber-300'}">
            GEN: ${gen} | FUEL: ${fuel} L
            <div class="text-[8px] opacity-80">${isBlackout ? '[COUPURE]' : '[20kV ACTIF]'}</div>
          </div>
        `;
        break;
      }
      case 'WATER': {
        const water = this.getDistrictStock(d.id, 'WATER');
        const purifiers = this.getDistrictStock(d.id, 'WATER_PURIFIER');
        layerBadge = `
          <div class="px-1.5 py-0.5 rounded text-[9px] font-mono border bg-sky-950/80 border-sky-600 text-sky-300">
            H2O: ${water.toLocaleString()} L | PURIF: ${purifiers}
            <div class="text-[8px] opacity-80">${d.is_coastal ? '[STATION BAIE]' : '[RESERVE ENCLAVEE]'}</div>
          </div>
        `;
        break;
      }
      case 'FOOD': {
        const food = this.getDistrictStock(d.id, 'FOOD');
        layerBadge = `
          <div class="px-1.5 py-0.5 rounded text-[9px] font-mono border bg-amber-950/80 border-amber-600 text-amber-300">
            FOOD: ${food.toLocaleString()} Rations
          </div>
        `;
        break;
      }
      case 'MEDICAL': {
        const med = this.getDistrictStock(d.id, 'MED_KIT');
        const staff = this.getDistrictStock(d.id, 'MEDIC');
        layerBadge = `
          <div class="px-1.5 py-0.5 rounded text-[9px] font-mono border bg-red-950/80 border-red-600 text-red-300">
            KITS: ${med} | SECOURS: ${staff}
          </div>
        `;
        break;
      }
      case 'HEAVY_GEAR': {
        const shelter = this.getDistrictStock(d.id, 'SHELTER');
        const atv = this.getDistrictStock(d.id, 'ATV');
        layerBadge = `
          <div class="px-1.5 py-0.5 rounded text-[9px] font-mono border bg-purple-950/80 border-purple-600 text-purple-300">
            ABRIS: ${shelter} | 4x4: ${atv}
          </div>
        `;
        break;
      }
      default:
        layerBadge = `
          <div class="px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-[9px] font-mono text-slate-300 whitespace-nowrap">
            ${d.name.split(' ')[0]} ${d.is_coastal ? '[LITTORAL]' : '[ENCLAVE]'}
          </div>
        `;
    }

    return `
      <div class="relative flex flex-col items-center gap-1">
        <div class="w-7 h-7 rounded-full bg-slate-900/90 border-2 ${badgeColor} flex items-center justify-center shadow-lg font-mono font-bold text-xs">
          ${d.code}
        </div>
        ${layerBadge}
      </div>
    `;
  }

  private getDistrictStock(districtId: string, resourceCode: string): number {
    const item = this.inventory.find(
      (i) => i.district_id === districtId && i.resource_code === resourceCode
    );
    return item ? item.current_quantity : 0;
  }

  private renderRoutes(): void {
    this.routeLayers.clearLayers();

    const landRoutes: [string, string][] = [
      ['dist_apex', 'dist_xeno'],
      ['dist_warden', 'dist_xeno'],
      ['dist_echo', 'dist_xeno'],
      ['dist_zion', 'dist_xeno'],
      ['dist_apex', 'dist_warden']
    ];

    landRoutes.forEach(([fromId, toId]) => {
      const d1 = this.districts.find((x) => x.id === fromId);
      const d2 = this.districts.find((x) => x.id === toId);
      if (d1 && d2) {
        L.polyline([[d1.latitude, d1.longitude], [d2.latitude, d2.longitude]], {
          color: '#334155',
          weight: 1.5,
          opacity: 0.4
        }).addTo(this.routeLayers);
      }
    });

    const seaRoutes: [string, string][] = [
      ['dist_echo', 'dist_xeno'],
      ['dist_xeno', 'dist_zion'],
      ['dist_echo', 'dist_zion']
    ];

    seaRoutes.forEach(([fromId, toId]) => {
      const d1 = this.districts.find((x) => x.id === fromId);
      const d2 = this.districts.find((x) => x.id === toId);
      if (d1 && d2) {
        const midLat = (d1.latitude + d2.latitude) / 2 + 0.01;
        const midLng = (d1.longitude + d2.longitude) / 2 + 0.02;

        L.polyline([[d1.latitude, d1.longitude], [midLat, midLng], [d2.latitude, d2.longitude]], {
          color: '#0369a1',
          weight: 2,
          opacity: 0.5,
          dashArray: '4, 8'
        }).addTo(this.routeLayers);
      }
    });
  }

  private renderInfrastructure(): void {
    this.infrastructureLayers.clearLayers();
    const layer = this.context.activeTacticalLayer();

    if (layer === 'POWER') {
      const powerLines: [string, string][] = [
        ['dist_apex', 'dist_xeno'],
        ['dist_warden', 'dist_xeno'],
        ['dist_echo', 'dist_xeno'],
        ['dist_zion', 'dist_xeno']
      ];

      powerLines.forEach(([fromId, toId]) => {
        const d1 = this.districts.find((x) => x.id === fromId);
        const d2 = this.districts.find((x) => x.id === toId);
        if (d1 && d2) {
          const isSevered = d1.current_disaster_level >= 3 || d2.current_disaster_level >= 3;

          const cable = L.polyline([[d1.latitude, d1.longitude], [d2.latitude, d2.longitude]], {
            color: isSevered ? '#ef4444' : '#38bdf8',
            weight: 3.5,
            opacity: isSevered ? 0.9 : 0.85,
            className: isSevered ? 'electric-cable-off' : 'electric-cable-on'
          });

          const midLat = (d1.latitude + d2.latitude) / 2;
          const midLng = (d1.longitude + d2.longitude) / 2;
          const labelIcon = L.divIcon({
            className: '',
            html: `
              <div class="px-1.5 py-0.5 rounded text-[8px] font-mono border whitespace-nowrap shadow-lg ${isSevered ? 'bg-red-950 border-red-600 text-red-300 animate-pulse' : 'bg-sky-950/90 border-sky-500 text-sky-200'}">
                ${isSevered ? '[RUPTURE RESEAU]' : '[20kV ACTIF]'}
              </div>
            `,
            iconSize: [80, 20],
            iconAnchor: [40, 10]
          });

          L.marker([midLat, midLng], { icon: labelIcon }).addTo(this.infrastructureLayers);
          cable.addTo(this.infrastructureLayers);
        }
      });
    } else if (layer === 'WATER') {
      const waterLines: [string, string][] = [
        ['dist_echo', 'dist_xeno'],
        ['dist_xeno', 'dist_apex'],
        ['dist_xeno', 'dist_warden'],
        ['dist_xeno', 'dist_zion']
      ];

      waterLines.forEach(([fromId, toId]) => {
        const d1 = this.districts.find((x) => x.id === fromId);
        const d2 = this.districts.find((x) => x.id === toId);
        if (d1 && d2) {
          const pipe = L.polyline([[d1.latitude, d1.longitude], [d2.latitude, d2.longitude]], {
            color: '#0284c7',
            weight: 3,
            opacity: 0.8,
            className: 'water-pipe-flow'
          });

          const midLat = (d1.latitude + d2.latitude) / 2;
          const midLng = (d1.longitude + d2.longitude) / 2;
          const labelIcon = L.divIcon({
            className: '',
            html: `
              <div class="px-1.5 py-0.5 rounded text-[8px] font-mono border bg-sky-950/90 border-sky-600 text-sky-200 whitespace-nowrap shadow">
                [CONDUITE EAU POTABLE]
              </div>
            `,
            iconSize: [100, 20],
            iconAnchor: [50, 10]
          });

          L.marker([midLat, midLng], { icon: labelIcon }).addTo(this.infrastructureLayers);
          pipe.addTo(this.infrastructureLayers);
        }
      });
    }
  }

  private renderConvoys(): void {
    this.convoyLayers.clearLayers();
    const currentLayer = this.context.activeTacticalLayer();
    const config = this.getCurrentLayerConfig();

    const relevantTransfers = this.transfers.filter((t) => {
      if (t.status !== 'IN_TRANSIT') return false;
      if (currentLayer === 'GLOBAL') return true;
      return config.resourceCodes.includes(t.resource_code);
    });

    relevantTransfers.forEach((t) => {
      const d1 = this.districts.find((x) => x.id === t.source_district_id);
      const d2 = this.districts.find((x) => x.id === t.target_district_id);
      if (d1 && d2) {
        const isSea = t.route_type === 'SEA';
        const midLat = (d1.latitude + d2.latitude) / 2 + (isSea ? 0.015 : 0.003);
        const midLng = (d1.longitude + d2.longitude) / 2 + (isSea ? 0.015 : -0.003);

        const convoyIcon = L.divIcon({
          className: '',
          html: `
            <div class="convoi-marker border ${isSea ? 'border-sky-400' : 'border-amber-400'} animate-bounce">
              <span class="text-[9px] font-bold text-sky-300">[${t.route_type}]</span>
              <span class="font-bold text-white">${t.quantity} ${t.unit}</span>
              <span class="text-slate-300">(${t.resource_name})</span>
              <span class="text-[9px] px-1 rounded bg-slate-800 text-sky-300">${t.estimated_duration_minutes}m</span>
            </div>
          `,
          iconSize: [140, 28],
          iconAnchor: [70, 14]
        });

        L.polyline([[d1.latitude, d1.longitude], [d2.latitude, d2.longitude]], {
          color: isSea ? '#38bdf8' : '#f59e0b',
          weight: 3,
          opacity: 0.9,
          dashArray: isSea ? '6, 8' : '4, 4'
        }).addTo(this.convoyLayers);

        L.marker([midLat, midLng], { icon: convoyIcon }).addTo(this.convoyLayers);
      }
    });
  }

  private getDistrictStyle(d: District): L.PathOptions {
    const isSinistre = this.activeDisaster?.district_id === d.id || d.current_disaster_level > 1;
    let fillColor = '#10b981';
    let borderColor = '#34d399';

    if (isSinistre) {
      const lvl = this.activeDisaster?.calculated_level || d.current_disaster_level;
      if (lvl >= 5) {
        fillColor = '#ef4444';
        borderColor = '#f87171';
      } else if (lvl >= 4) {
        fillColor = '#ea580c';
        borderColor = '#fb923c';
      } else if (lvl >= 3) {
        fillColor = '#f59e0b';
        borderColor = '#fbbf24';
      } else {
        fillColor = '#0284c7';
        borderColor = '#38bdf8';
      }
    }

    return {
      fillColor,
      fillOpacity: isSinistre ? 0.35 : 0.15,
      color: borderColor,
      weight: isSinistre ? 2.5 : 1.5,
    };
  }

  getDistrictName(id: string): string {
    return this.districts.find((d) => d.id === id)?.name || id;
  }
}

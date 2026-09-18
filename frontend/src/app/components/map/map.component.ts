import { Component, ElementRef, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { KaijuApiService } from '../../services/kaiju-api.service';
import { KaijuWsService } from '../../services/kaiju-ws.service';
import { CrisisContextService } from '../../services/crisis-context.service';
import { HudWindowService } from '../../services/hud-window.service';
import { District, DisasterEvent, TacticalLayer, TACTICAL_LAYERS, DistrictResourceDetail, TransferRequestDetail } from '../../models/kaiju.models';
import { Subscription } from 'rxjs';

const TOKYORK_POLYGONS: Record<string, [number, number][]> = {
  A: [[35.79069, 139.60334], [35.78952, 139.64845], [35.77509, 139.65085], [35.77158, 139.67965], [35.75247, 139.719], [35.73219, 139.71517], [35.73024, 139.68685], [35.7162, 139.65853], [35.70333, 139.65613], [35.66511, 139.69213], [35.68305, 139.67629], [35.6772, 139.66957], [35.68812, 139.63118], [35.69046, 139.56783], [35.68617, 139.55343], [35.66511, 139.55295], [35.70177, 139.55631], [35.72634, 139.51503], [35.74857, 139.51695], [35.77041, 139.54143], [35.78211, 139.57406], [35.77704, 139.5923], [35.7903, 139.60286]],
  E: [[35.82618, 139.81019], [35.81253, 139.82507], [35.8137, 139.86347], [35.79966, 139.8697], [35.79225, 139.90954], [35.78016, 139.90234], [35.75442, 139.91626], [35.74896, 139.91098], [35.74233, 139.93018], [35.73414, 139.92346], [35.71503, 139.9321], [35.70957, 139.94889], [35.69007, 139.95897], [35.67057, 139.95897], [35.66511, 139.93642], [35.6538, 139.95849], [35.62884, 139.90954], [35.63742, 139.88506], [35.65068, 139.87642], [35.64483, 139.87498], [35.65029, 139.85963], [35.6538, 139.87354], [35.66316, 139.87642], [35.66394, 139.86155], [35.65731, 139.85723], [35.69319, 139.84283], [35.68929, 139.85819], [35.70294, 139.85243], [35.72166, 139.8913], [35.73492, 139.88938], [35.74545, 139.9033], [35.73531, 139.88362], [35.72283, 139.88602], [35.70372, 139.84715], [35.69475, 139.84955], [35.72634, 139.78956], [35.7435, 139.72764], [35.76066, 139.71373], [35.7708, 139.69117], [35.77782, 139.65277], [35.7903, 139.65181], [35.79498, 139.68205], [35.78952, 139.77852], [35.81916, 139.7742], [35.82579, 139.80971]],
  W: [[35.68812, 139.55775], [35.68578, 139.62974], [35.67447, 139.67005], [35.68266, 139.67725], [35.64405, 139.70557], [35.62455, 139.68781], [35.61831, 139.69597], [35.60271, 139.69405], [35.59998, 139.66525], [35.58906, 139.64749], [35.5641, 139.6403], [35.56488, 139.6235], [35.58633, 139.5947], [35.59686, 139.55583], [35.61792, 139.54767], [35.63508, 139.55631], [35.68773, 139.55727]],
  X: [[35.74116, 139.7262], [35.70879, 139.80395], [35.6967, 139.78524], [35.68578, 139.78284], [35.69709, 139.80539], [35.70606, 139.80683], [35.69982, 139.82363], [35.66277, 139.84955], [35.64327, 139.84715], [35.6421, 139.77612], [35.64834, 139.77132], [35.65887, 139.78716], [35.6772, 139.791], [35.68578, 139.7814], [35.67135, 139.779], [35.6655, 139.75548], [35.63664, 139.73964], [35.65146, 139.69837], [35.66199, 139.70125], [35.69982, 139.66237], [35.71542, 139.66141], [35.73219, 139.70413], [35.72946, 139.71565], [35.74077, 139.72572]],
  Z: [[35.64483, 139.74636], [35.62416, 139.743], [35.5836, 139.77132], [35.57931, 139.76268], [35.57658, 139.78188], [35.56059, 139.74972], [35.55591, 139.78908], [35.5173, 139.82075], [35.50287, 139.80395], [35.49702, 139.7766], [35.50365, 139.72236], [35.49507, 139.69501], [35.5017, 139.68301], [35.49273, 139.67965], [35.49897, 139.66909], [35.52042, 139.67005], [35.55786, 139.62734], [35.56683, 139.64941], [35.58438, 139.64749], [35.59452, 139.66333], [35.60232, 139.69837], [35.63352, 139.69645], [35.6421, 139.70941], [35.63352, 139.73436], [35.63937, 139.74828], [35.64444, 139.74588]]
};

const DISTRICT_COLORS: Record<string, string> = {
  A: '#ef4444',
  E: '#22c55e',
  W: '#f97316',
  X: '#eab308',
  Z: '#38bdf8'
};

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-full bg-black overflow-hidden select-none font-mono">
      <div #mapContainer class="w-full h-full z-0"></div>

      <div *ngIf="activeDisaster"
           class="fixed top-12 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5 bg-black/95 border border-red-600 border-t-2 border-t-red-500 text-red-400 font-mono text-xs flex items-center gap-3 shadow-2xl animate-pulse">
        <span class="w-2 h-2 bg-red-500 animate-ping"></span>
        <span class="font-bold tracking-widest uppercase">
          ALERTE CATASTROPHE : {{ activeDisaster.disaster_type }} // {{ getDistrictName(activeDisaster.district_id) }} [NIVEAU {{ activeDisaster.calculated_level }}]
        </span>
        <span class="px-1.5 py-0.2 bg-red-950 border border-red-800 text-red-300 text-[10px]">
          INTENSITE {{ activeDisaster.intensity }}/100
        </span>
      </div>

      <div class="fixed right-3 top-14 z-40 flex flex-col gap-1.5 p-1 bg-black/90 border border-zinc-800 select-none">
        <div class="text-[8px] uppercase tracking-widest text-zinc-500 text-center pb-0.5 border-b border-zinc-800">
          CALQ
        </div>

        <button *ngFor="let layer of tacticalLayers"
                (click)="setLayer(layer.id)"
                [title]="layer.label + ' - ' + layer.sublabel"
                class="w-8 h-8 flex items-center justify-center border transition-all text-xs"
                [ngClass]="context.activeTacticalLayer() === layer.id 
                  ? 'border-green-500 bg-green-500 text-black' 
                  : 'border-zinc-800 bg-black text-zinc-400 hover:border-zinc-600 hover:text-white'">
          <svg *ngIf="layer.id === 'GLOBAL'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 3v18M3 12h18"/>
          </svg>
          <svg *ngIf="layer.id === 'POWER'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          <svg *ngIf="layer.id === 'WATER'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
          </svg>
          <svg *ngIf="layer.id === 'FOOD'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          <svg *ngIf="layer.id === 'MEDICAL'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="0"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          <svg *ngIf="layer.id === 'HEAVY_GEAR'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
        </button>
      </div>

      <div class="fixed bottom-3 left-3 z-30 px-3 py-1.5 bg-black/90 border border-zinc-800 text-[10px] text-zinc-400 flex items-center gap-2">
        <span class="text-green-500 font-bold">[CALQUE: {{ getCurrentLayerConfig().tag }}]</span>
        <span class="uppercase tracking-wider text-zinc-300">{{ getCurrentLayerConfig().label }}</span>
        <span class="text-zinc-600">//</span>
        <span>{{ getLayerLiveMetrics() }}</span>
      </div>
    </div>
  `
})
export class MapComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  context = inject(CrisisContextService);
  hud = inject(HudWindowService);
  private api = inject(KaijuApiService);
  private ws = inject(KaijuWsService);

  tacticalLayers = TACTICAL_LAYERS;
  private map!: L.Map;
  private districtLayers = new Map<string, L.Polygon>();
  private markerLayers = new Map<string, L.Marker>();

  private routeLayers = L.layerGroup();
  private infrastructureLayers = L.layerGroup();
  private convoyLayers = L.layerGroup();

  districts: District[] = [];
  inventory: DistrictResourceDetail[] = [];
  transfers: TransferRequestDetail[] = [];
  activeDisaster: DisasterEvent | null = null;

  private subs = new Subscription();

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

  setLayer(layer: TacticalLayer): void {
    this.context.setTacticalLayer(layer);
    this.renderAllMapLayers();
  }

  getCurrentLayerConfig() {
    return this.tacticalLayers.find((l) => l.id === this.context.activeTacticalLayer()) || this.tacticalLayers[0];
  }

  getDistrictName(id: string): string {
    const d = this.districts.find((dist) => dist.id === id);
    return d ? d.name.toUpperCase() : id.toUpperCase();
  }

  getLayerLiveMetrics(): string {
    const layer = this.context.activeTacticalLayer();
    const activeLevel = this.context.activeDisasterLevel();

    switch (layer) {
      case 'POWER':
        const genCount = this.getTotalStock('GENERATOR');
        const fuelL = this.getTotalStock('FUEL');
        const gridStatus = activeLevel >= 4 ? 'RESEAU COMPROMIS (20kV COUPE)' : 'RESEAU SOUS-TERRAIN NOMINAL';
        return `${gridStatus} | ${genCount} GENERATEURS | ${fuelL}L CARBURANT`;

      case 'WATER':
        const waterL = this.getTotalStock('WATER');
        const purifiers = this.getTotalStock('WATER_PURIFIER');
        return `AQUEDUCS ACTIFS | ${waterL}L EAU POTABLE | ${purifiers} STATIONS DE FILTRATION`;

      case 'FOOD':
        const foodRations = this.getTotalStock('FOOD');
        const convoysFood = this.getConvoysForResource(['FOOD']);
        return `${foodRations} RATIONS EN RESERVE | ${convoysFood} CONVOIS ALIMENTAIRES ACTIFS`;

      case 'MEDICAL':
        const medkits = this.getTotalStock('MED_KIT');
        const medics = this.getTotalStock('MEDIC');
        return `${medkits} KITS DE SECOURS | ${medics} BRIGADES DE MEDECINS`;

      case 'HEAVY_GEAR':
        const atvs = this.getTotalStock('ATV');
        const clearing = this.getTotalStock('CLEARING_GEAR');
        return `${atvs} VEHICULES TOUT-TERRAIN | ${clearing} ENGINS DE DEBLAIEMENT`;

      default:
        const totalConvoys = this.transfers.filter((t) => t.status === 'IN_TRANSIT').length;
        return `RADAR ACTIF // ${totalConvoys} CONVOIS TACTIQUES EN TRANSIT DANS TOKYORK`;
    }
  }

  private getTotalStock(resourceCode: string): number {
    return this.inventory
      .filter((i) => i.resource_code === resourceCode)
      .reduce((sum, item) => sum + item.current_quantity, 0);
  }

  private getConvoysForResource(resourceCodes: string[]): number {
    return this.transfers.filter(
      (t) => t.status === 'IN_TRANSIT' && resourceCodes.includes(t.resource_code)
    ).length;
  }

  private initMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [35.6720, 139.7450],
      zoom: 11,
      minZoom: 10,
      maxZoom: 15,
      maxBounds: [
        [35.35, 139.35],
        [35.95, 140.15]
      ],
      maxBoundsViscosity: 1.0,
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
            intensity: payload.intensity || 50,
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
    this.districts.forEach((d) => {
      let bounds: [number, number][] = TOKYORK_POLYGONS[d.code] || [];
      try {
        const parsed = JSON.parse(d.polygon_bounds_json);
        if (Array.isArray(parsed) && parsed.length >= 10) {
          bounds = parsed;
        }
      } catch {}

      if (bounds.length === 0) return;

      let polygon = this.districtLayers.get(d.id);
      if (!polygon) {
        polygon = L.polygon(bounds, this.getDistrictStyle(d));
        polygon.on('click', () => {
          this.context.selectDistrict(d.code);
          this.hud.open('inventory');
        });
        polygon.addTo(this.map);
        this.districtLayers.set(d.id, polygon);
      } else {
        polygon.setLatLngs(bounds);
        polygon.setStyle(this.getDistrictStyle(d));
      }

      const markerHtml = this.buildDistrictMarkerHtml(d);
      const customIcon = L.divIcon({
        className: 'military-reticle',
        html: markerHtml,
        iconSize: [90, 36],
        iconAnchor: [45, 18],
      });

      let marker = this.markerLayers.get(d.id);
      if (!marker) {
        marker = L.marker([d.latitude, d.longitude], { icon: customIcon });
        marker.on('click', () => {
          this.context.selectDistrict(d.code);
          this.hud.open('inventory');
        });
        marker.addTo(this.map);
        this.markerLayers.set(d.id, marker);
      } else {
        marker.setLatLng([d.latitude, d.longitude]);
        marker.setIcon(customIcon);
      }
    });
  }

  private buildDistrictMarkerHtml(d: District): string {
    const isTarget = this.activeDisaster?.district_id === d.id;
    const baseColor = DISTRICT_COLORS[d.code] || '#22c55e';
    const borderColor = isTarget ? '#ef4444' : baseColor;

    return `
      <div class="flex flex-col items-center justify-center font-mono">
        <div class="border bg-black/90 px-2 py-0.5 text-center shadow-lg" style="border-color: ${borderColor}">
          <div class="flex items-center gap-1">
            <span class="w-1.5 h-1.5 ${isTarget ? 'bg-red-500 animate-ping' : ''}" style="background-color: ${baseColor}"></span>
            <span class="text-[11px] font-bold tracking-widest uppercase text-white">[ ${d.code} ]</span>
            <span class="text-[9px] text-zinc-400 uppercase">${d.is_coastal ? 'BAIE' : 'ENCL'}</span>
          </div>
        </div>
      </div>
    `;
  }

  private getDistrictStyle(d: District): L.PathOptions {
    const isAffected = this.activeDisaster?.district_id === d.id;
    const color = DISTRICT_COLORS[d.code] || '#22c55e';

    if (isAffected) {
      return {
        color: '#ef4444',
        weight: 3,
        opacity: 1,
        fillColor: '#ef4444',
        fillOpacity: 0.35,
        dashArray: '4, 4'
      };
    }

    return {
      color: color,
      weight: 2,
      opacity: 0.9,
      fillColor: color,
      fillOpacity: 0.18,
      dashArray: '2, 2'
    };
  }

  private renderRoutes(): void {
    this.routeLayers.clearLayers();
    const connections: [string, string, 'LAND' | 'SEA'][] = [
      ['A', 'X', 'LAND'],
      ['W', 'X', 'LAND'],
      ['E', 'X', 'LAND'],
      ['Z', 'X', 'LAND'],
      ['A', 'W', 'LAND'],
      ['A', 'E', 'LAND'],
      ['W', 'Z', 'LAND'],
      ['E', 'X', 'SEA'],
      ['X', 'Z', 'SEA'],
      ['E', 'Z', 'SEA'],
    ];

    connections.forEach(([c1, c2, mode]) => {
      const d1 = this.districts.find((d) => d.code === c1);
      const d2 = this.districts.find((d) => d.code === c2);
      if (!d1 || !d2) return;

      const p1: [number, number] = [d1.latitude, d1.longitude];
      const p2: [number, number] = [d2.latitude, d2.longitude];

      if (mode === 'SEA') {
        const seaLine = L.polyline([p1, p2], {
          color: '#38bdf8',
          weight: 1.5,
          opacity: 0.5,
          dashArray: '6, 6'
        });
        seaLine.addTo(this.routeLayers);
      } else {
        const landLine = L.polyline([p1, p2], {
          color: '#52525b',
          weight: 1.5,
          opacity: 0.6,
          dashArray: '4, 4'
        });
        landLine.addTo(this.routeLayers);
      }
    });
  }

  private renderInfrastructure(): void {
    this.infrastructureLayers.clearLayers();
    const layer = this.context.activeTacticalLayer();
    const isLevelHigh = this.context.activeDisasterLevel() >= 4;

    if (layer === 'POWER' || layer === 'GLOBAL') {
      const powerGrid = [
        ['W', 'X'],
        ['X', 'E'],
        ['X', 'A'],
        ['X', 'Z']
      ];

      powerGrid.forEach(([from, to]) => {
        const d1 = this.districts.find((d) => d.code === from);
        const d2 = this.districts.find((d) => d.code === to);
        if (!d1 || !d2) return;

        const isCableCut = isLevelHigh && (this.activeDisaster?.district_id === d1.id || this.activeDisaster?.district_id === d2.id);

        const cable = L.polyline([[d1.latitude, d1.longitude], [d2.latitude, d2.longitude]], {
          color: isCableCut ? '#ef4444' : '#22c55e',
          weight: isCableCut ? 2 : 2.5,
          className: isCableCut ? 'electric-cable-off' : 'electric-cable-on'
        });

        const statusTag = isCableCut ? '[COUPE / 0kV]' : '[ACTIF / 20kV]';
        cable.bindTooltip(`// LIGNE HT 20kV ${from}-${to} : ${statusTag}`, {
          permanent: false,
          className: 'convoi-marker'
        });

        cable.addTo(this.infrastructureLayers);
      });
    }

    if (layer === 'WATER' || layer === 'GLOBAL') {
      const aqueducts = [
        ['E', 'X'],
        ['X', 'A'],
        ['Z', 'W']
      ];

      aqueducts.forEach(([from, to]) => {
        const d1 = this.districts.find((d) => d.code === from);
        const d2 = this.districts.find((d) => d.code === to);
        if (!d1 || !d2) return;

        const pipe = L.polyline([[d1.latitude, d1.longitude], [d2.latitude, d2.longitude]], {
          color: '#0284c7',
          weight: 2,
          className: 'water-pipe-flow'
        });

        pipe.bindTooltip(`// AQUEDUC MAJEUR ${from}-${to} : PRESSION NOMINALE`, {
          permanent: false,
          className: 'convoi-marker'
        });

        pipe.addTo(this.infrastructureLayers);
      });
    }
  }

  private renderConvoys(): void {
    this.convoyLayers.clearLayers();
    const activeConvoys = this.transfers.filter((t) => t.status === 'IN_TRANSIT');

    activeConvoys.forEach((t) => {
      const d1 = this.districts.find((d) => d.id === t.source_district_id);
      const d2 = this.districts.find((d) => d.id === t.target_district_id);
      if (!d1 || !d2) return;

      const midLat = (d1.latitude + d2.latitude) / 2;
      const midLng = (d1.longitude + d2.longitude) / 2;

      const convoyIcon = L.divIcon({
        className: 'convoi-marker',
        html: `
          <div class="flex items-center gap-1.5 border border-green-500 bg-black px-1.5 py-0.5 text-[9px] font-mono uppercase">
            <span class="w-1.5 h-1.5 bg-green-500 animate-ping"></span>
            <span class="text-white font-bold">${t.quantity} ${t.resource_code}</span>
            <span class="text-zinc-400">[${d1.code}->${d2.code}]</span>
          </div>
        `,
        iconSize: [120, 24],
        iconAnchor: [60, 12]
      });

      const marker = L.marker([midLat, midLng], { icon: convoyIcon });
      marker.bindTooltip(`CONVOI : ${t.quantity} ${t.resource_code} | ETAT : EN ROUTE`, {
        className: 'convoi-marker'
      });
      marker.addTo(this.convoyLayers);
    });
  }
}

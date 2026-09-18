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
  A: [[35.69956, 139.55574], [35.712, 139.55574], [35.71978, 139.54811], [35.73378, 139.51953], [35.76178, 139.52143], [35.78044, 139.5443], [35.78822, 139.56527], [35.78667, 139.59195], [35.79756, 139.60148], [35.796, 139.6434], [35.79444, 139.64531], [35.78356, 139.65102], [35.78044, 139.66436], [35.78044, 139.67008], [35.78044, 139.67389], [35.77889, 139.6777], [35.76644, 139.7101], [35.75867, 139.71773], [35.75244, 139.71963], [35.74467, 139.71201], [35.74, 139.68533], [35.72756, 139.66055], [35.71511, 139.65484], [35.71044, 139.65674], [35.69333, 139.67008], [35.68556, 139.66818], [35.68711, 139.65865], [35.68711, 139.65674], [35.68711, 139.65484], [35.68711, 139.65102], [35.68711, 139.64912], [35.68867, 139.64721], [35.69022, 139.64531], [35.69644, 139.63006], [35.69489, 139.58051], [35.69956, 139.55574], [35.712, 139.55574], [35.71978, 139.54811], [35.73378, 139.51953], [35.76178, 139.52143], [35.78044, 139.5443], [35.78822, 139.56527], [35.78667, 139.59195], [35.79756, 139.60148], [35.796, 139.6434]],
  E: [[35.75867, 139.71773], [35.768, 139.71582], [35.77267, 139.69676], [35.782, 139.68342], [35.77889, 139.6777], [35.78044, 139.67389], [35.78044, 139.67008], [35.78044, 139.66436], [35.79444, 139.64531], [35.796, 139.6434], [35.80533, 139.67961], [35.80533, 139.72535], [35.796, 139.73678], [35.79756, 139.77299], [35.80222, 139.77871], [35.81467, 139.77871], [35.82867, 139.77109], [35.83644, 139.80539], [35.83178, 139.82064], [35.82089, 139.82254], [35.824, 139.86256], [35.81778, 139.86066], [35.80844, 139.87018], [35.81156, 139.87781], [35.80533, 139.88924], [35.80689, 139.91211], [35.79289, 139.90068], [35.78356, 139.90258], [35.77422, 139.91592], [35.76022, 139.91592], [35.75244, 139.92926], [35.74311, 139.92164], [35.73844, 139.92926], [35.72289, 139.93117], [35.71667, 139.94641], [35.70889, 139.94641], [35.69956, 139.95785], [35.67778, 139.95594], [35.67933, 139.9407], [35.67311, 139.93498], [35.66844, 139.9426], [35.67, 139.95213], [35.66222, 139.94832], [35.66222, 139.95594], [35.63733, 139.9102], [35.63889, 139.89686], [35.64667, 139.88543], [35.64667, 139.87971], [35.65289, 139.88162], [35.656, 139.8759], [35.65289, 139.86066], [35.65756, 139.85684], [35.66533, 139.87209], [35.67311, 139.87209], [35.67467, 139.86447], [35.67, 139.86447], [35.67156, 139.85875], [35.66533, 139.85303], [35.67467, 139.85303], [35.68244, 139.84541], [35.69022, 139.8416], [35.69489, 139.84541], [35.70422, 139.83969], [35.69644, 139.85303], [35.712, 139.84922], [35.71822, 139.87018], [35.726, 139.87018], [35.72911, 139.88734], [35.73222, 139.88543], [35.73067, 139.86828], [35.72133, 139.86828], [35.71511, 139.84541], [35.70422, 139.84732], [35.70733, 139.83588], [35.71978, 139.82445], [35.712, 139.82064], [35.71822, 139.80348], [35.726, 139.80158], [35.73378, 139.76918], [35.74622, 139.75012], [35.74933, 139.72916], [35.75867, 139.71773], [35.768, 139.71582], [35.77267, 139.69676], [35.782, 139.68342], [35.77889, 139.6777]],
  W: [[35.57356, 139.62816], [35.572, 139.62434], [35.59222, 139.59766], [35.60311, 139.55193], [35.62489, 139.5424], [35.63889, 139.55193], [35.68089, 139.55193], [35.69644, 139.55383], [35.69956, 139.55574], [35.69489, 139.58051], [35.69644, 139.63006], [35.69022, 139.64531], [35.68867, 139.64721], [35.68711, 139.64912], [35.68711, 139.65102], [35.68711, 139.65484], [35.68711, 139.65674], [35.68711, 139.65865], [35.68556, 139.66818], [35.69333, 139.67008], [35.69333, 139.67199], [35.68089, 139.68533], [35.67, 139.69486], [35.65911, 139.69486], [35.65289, 139.70629], [35.64822, 139.70248], [35.64511, 139.70057], [35.642, 139.69295], [35.64044, 139.69486], [35.63889, 139.69486], [35.63733, 139.69295], [35.63578, 139.69105], [35.63422, 139.68914], [35.63267, 139.68914], [35.63111, 139.69295], [35.62956, 139.69486], [35.628, 139.69676], [35.62644, 139.69676], [35.62333, 139.69295], [35.61867, 139.69295], [35.60933, 139.69105], [35.60933, 139.68914], [35.60933, 139.68342], [35.60778, 139.68152], [35.60622, 139.67961], [35.60622, 139.6777], [35.60467, 139.6758], [35.60467, 139.67008], [35.60622, 139.66246], [35.60467, 139.66055], [35.60311, 139.66055], [35.59844, 139.65674], [35.59844, 139.65484], [35.59689, 139.65102], [35.59222, 139.6434], [35.59067, 139.6434], [35.58911, 139.64531], [35.58756, 139.64721], [35.58444, 139.64912], [35.58289, 139.64721], [35.57978, 139.64721], [35.57667, 139.64721], [35.57511, 139.64531], [35.57356, 139.6415], [35.572, 139.6415], [35.572, 139.63768], [35.57356, 139.63578], [35.57356, 139.63387], [35.57356, 139.63197], [35.57356, 139.63006], [35.57356, 139.62816], [35.572, 139.62434]],
  X: [[35.71044, 139.65674], [35.71511, 139.65484], [35.72756, 139.66055], [35.74, 139.68533], [35.74467, 139.71201], [35.75244, 139.71963], [35.74933, 139.72916], [35.74622, 139.75012], [35.73378, 139.76918], [35.726, 139.80158], [35.71822, 139.80348], [35.712, 139.82064], [35.69022, 139.8416], [35.68244, 139.84541], [35.65133, 139.84541], [35.65444, 139.79967], [35.656, 139.79777], [35.64978, 139.77871], [35.656, 139.76918], [35.66844, 139.78443], [35.69022, 139.78443], [35.69022, 139.77871], [35.68244, 139.78061], [35.67311, 139.76156], [35.67622, 139.75584], [35.64667, 139.7425], [35.64511, 139.73297], [35.64667, 139.71582], [35.65289, 139.70629], [35.65911, 139.69486], [35.67, 139.69486], [35.68089, 139.68533], [35.68867, 139.68533], [35.69333, 139.67199], [35.69333, 139.67008], [35.71044, 139.65674], [35.71511, 139.65484]],
  Z: [[35.58289, 139.76727], [35.57822, 139.75203], [35.56889, 139.74631], [35.56578, 139.78633], [35.52689, 139.81682], [35.50978, 139.79586], [35.50356, 139.7749], [35.51289, 139.74631], [35.51289, 139.71391], [35.50356, 139.69295], [35.50978, 139.67961], [35.502, 139.67961], [35.50356, 139.67199], [35.50822, 139.66627], [35.53, 139.66818], [35.56578, 139.62434], [35.572, 139.62434], [35.57356, 139.62816], [35.57356, 139.63006], [35.57356, 139.63197], [35.57356, 139.63387], [35.57356, 139.63578], [35.572, 139.63768], [35.572, 139.6415], [35.57356, 139.6415], [35.57511, 139.64531], [35.57667, 139.64721], [35.57978, 139.64721], [35.58289, 139.64721], [35.58444, 139.64912], [35.58756, 139.64721], [35.58911, 139.64531], [35.59067, 139.6434], [35.59222, 139.6434], [35.59689, 139.65102], [35.59844, 139.65484], [35.59844, 139.65674], [35.60311, 139.66055], [35.60467, 139.66246], [35.60467, 139.66055], [35.60622, 139.66246], [35.60467, 139.66246], [35.60467, 139.67008], [35.60467, 139.6758], [35.60622, 139.6777], [35.60622, 139.67961], [35.60778, 139.68152], [35.60933, 139.68342], [35.60933, 139.68914], [35.60933, 139.69105], [35.61867, 139.69295], [35.62333, 139.69295], [35.62644, 139.69676], [35.628, 139.69676], [35.62956, 139.69486], [35.63111, 139.69295], [35.63267, 139.68914], [35.63422, 139.68914], [35.63578, 139.69105], [35.63733, 139.69295], [35.63889, 139.69486], [35.64044, 139.69486], [35.642, 139.69295], [35.64511, 139.70057], [35.64822, 139.70248], [35.65289, 139.70629], [35.64667, 139.71582], [35.64511, 139.73297], [35.63422, 139.73488], [35.64044, 139.7425], [35.63267, 139.7425], [35.62956, 139.73297], [35.628, 139.75012], [35.61556, 139.75203], [35.59378, 139.76727], [35.58289, 139.76156], [35.58289, 139.76727], [35.57822, 139.75203], [35.56889, 139.74631], [35.56578, 139.78633], [35.52689, 139.81682], [35.50978, 139.79586], [35.50356, 139.7749], [35.51289, 139.74631], [35.51289, 139.71391], [35.50356, 139.69295], [35.50978, 139.67961], [35.502, 139.67961], [35.50356, 139.67199], [35.50822, 139.66627], [35.53, 139.66818], [35.56578, 139.62434], [35.572, 139.62434]],
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
      zoom: 12,
      minZoom: 11,
      maxZoom: 15,
      maxBounds: [
        [35.45, 139.45],
        [35.88, 140.05]
      ],
      maxBoundsViscosity: 1.0,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16,
    }).addTo(this.map);

    this.routeLayers.addTo(this.map);
    this.infrastructureLayers.addTo(this.map);
    this.convoyLayers.addTo(this.map);
  }

  private loadData(): void {
    this.api.getDistricts().subscribe({
      next: (districts) => {
        this.districts = districts;
        this.renderDistricts();
        this.renderRoutes();
        this.renderInfrastructure();
      },
      error: () => {}
    });

    this.api.getInventory().subscribe({
      next: (inv) => {
        this.inventory = inv;
        this.renderDistricts();
      },
      error: () => {}
    });

    this.api.getTransfers().subscribe({
      next: (transfers) => {
        this.transfers = transfers;
        this.renderConvoys();
      },
      error: () => {}
    });

    this.api.getActiveDisaster().subscribe({
      next: (res) => {
        this.activeDisaster = res.active_disaster;
        if (this.activeDisaster) {
          this.context.setDisasterLevel(this.activeDisaster.calculated_level);
        }
        this.renderDistricts();
      },
      error: () => {}
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
        iconSize: [130, 42],
        iconAnchor: [65, 21],
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
      <div class="flex flex-col items-center justify-center font-mono cursor-pointer select-none">
        <div class="border bg-black/95 px-2.5 py-1 text-center shadow-2xl backdrop-blur-sm" style="border-color: ${borderColor}">
          <div class="flex items-center justify-center gap-1.5">
            <span class="w-2 h-2 ${isTarget ? 'bg-red-500 animate-ping' : ''}" style="background-color: ${baseColor}"></span>
            <span class="text-xs font-black tracking-widest text-white">[ ${d.code} ]</span>
            <span class="text-[9px] text-zinc-400 font-bold uppercase">${d.is_coastal ? 'COAST' : 'INLAND'}</span>
          </div>
          <div class="text-[9px] text-zinc-300 font-bold tracking-tight uppercase truncate max-w-[115px] border-t border-zinc-800 mt-0.5 pt-0.5">${d.name.split(' (')[0]}</div>
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
      opacity: 0.95,
      fillColor: color,
      fillOpacity: 0.22,
      dashArray: '4, 4'
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

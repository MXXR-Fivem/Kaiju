import { Component, ElementRef, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { KaijuApiService } from '../../services/kaiju-api.service';
import { KaijuWsService } from '../../services/kaiju-ws.service';
import { CrisisContextService } from '../../services/crisis-context.service';
import { District, DisasterEvent } from '../../models/kaiju.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-full bg-[#07090e] overflow-hidden select-none">
      <!-- Conteneur Carte Leaflet -->
      <div #mapContainer class="w-full h-full z-0"></div>

      <!-- Superposition : Banderole d'urgence active -->
      <div *ngIf="activeDisaster" 
           class="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-6 py-2 rounded-full border border-red-500 bg-red-950/80 backdrop-blur-md shadow-2xl flex items-center gap-3 animate-pulse">
        <span class="inline-block w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
        <span class="font-mono font-bold tracking-wider text-red-300 text-sm">
          ALERTE CATASTROPHE : {{ activeDisaster.disaster_type }} DANS {{ getDistrictName(activeDisaster.district_id) }} (NIVEAU {{ activeDisaster.calculated_level }})
        </span>
        <span class="text-xs px-2 py-0.5 rounded bg-red-800 text-red-100 font-mono">
          Intensité : {{ activeDisaster.intensity }}%
        </span>
      </div>

      <!-- Superposition : Mini-légende tactique -->
      <div class="absolute bottom-6 left-6 z-10 p-3 rounded-lg bg-slate-900/90 border border-slate-800 backdrop-blur text-xs font-mono text-slate-300 shadow-xl space-y-2">
        <div class="font-semibold text-sky-400 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-800 flex items-center justify-between">
          <span>Topologie de Tokyork</span>
          <span class="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">5 Secteurs</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-1 bg-amber-500 rounded"></span>
          <span>Route Terrestre (30-45 min)</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-1 border-b border-dashed border-sky-400"></span>
          <span>Route Maritime Baie (Temps x2 : 60-80 min)</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Quartier Stable (Lv 1)</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span>Secteur Sinistré (Lv 3-5)</span>
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

  private api = inject(KaijuApiService);
  private ws = inject(KaijuWsService);
  private context = inject(CrisisContextService);

  private map!: L.Map;
  private districtLayers: Map<string, L.Polygon> = new Map();
  private markerLayers: Map<string, L.Marker> = new Map();
  private routeLayers: L.LayerGroup = L.layerGroup();
  private subs: Subscription = new Subscription();

  districts: District[] = [];
  activeDisaster: DisasterEvent | null = null;

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

  private initMap(): void {
    // Centre de Tokyork (Xeno Central Nexus)
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [35.6760, 139.7550],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    // Fond de carte sombre tactique
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(this.map);

    this.routeLayers.addTo(this.map);
  }

  private loadData(): void {
    this.api.getDistricts().subscribe({
      next: (districts) => {
        this.districts = districts;
        this.renderDistricts();
        this.renderRoutes();
      },
      error: (err) => console.error('Erreur chargement quartiers :', err)
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
        this.refreshDistrictStyles();
      })
    );
  }

  private renderDistricts(): void {
    this.districts.forEach((d) => {
      try {
        const bounds: [number, number][] = JSON.parse(d.polygon_bounds_json);
        const polygon = L.polygon(bounds, this.getDistrictStyle(d));

        polygon.on('click', () => {
          this.context.selectDistrict(d.code);
          this.context.isInventoryModalOpen.set(true);
        });

        polygon.addTo(this.map);
        this.districtLayers.set(d.id, polygon);

        // Marqueur de quartier personnalisé
        const customIcon = L.divIcon({
          className: 'kaiju-radar-marker',
          html: `
            <div class="relative flex flex-col items-center">
              <div class="w-7 h-7 rounded-full bg-slate-900/90 border-2 ${this.getBorderColor(d.current_disaster_level)} flex items-center justify-center shadow-lg font-mono font-bold text-xs text-white">
                ${d.code}
              </div>
              <div class="mt-1 px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-slate-200 shadow whitespace-nowrap">
                ${d.name.split(' ')[0]} ${d.is_coastal ? '🌊' : '⛰️'}
              </div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const marker = L.marker([d.latitude, d.longitude], { icon: customIcon });
        marker.on('click', () => {
          this.context.selectDistrict(d.code);
          this.context.isInventoryModalOpen.set(true);
        });

        marker.addTo(this.map);
        this.markerLayers.set(d.id, marker);
      } catch (e) {
        console.error('Erreur parsing bounds quartier :', d.code, e);
      }
    });
  }

  private renderRoutes(): void {
    this.routeLayers.clearLayers();

    // Adjacences terrestres de Tokyork
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
        const line = L.polyline([[d1.latitude, d1.longitude], [d2.latitude, d2.longitude]], {
          color: '#f59e0b',
          weight: 2,
          opacity: 0.6,
          dashArray: undefined
        });
        line.addTo(this.routeLayers);
      }
    });

    // Liaisons maritimes (Baie de Tokyork : Echo, Xeno, Zion)
    const seaRoutes: [string, string][] = [
      ['dist_echo', 'dist_xeno'],
      ['dist_xeno', 'dist_zion'],
      ['dist_echo', 'dist_zion']
    ];

    seaRoutes.forEach(([fromId, toId]) => {
      const d1 = this.districts.find((x) => x.id === fromId);
      const d2 = this.districts.find((x) => x.id === toId);
      if (d1 && d2) {
        // Courbe maritime légèrement décalée vers la baie
        const midLat = (d1.latitude + d2.latitude) / 2 + 0.01;
        const midLng = (d1.longitude + d2.longitude) / 2 + 0.02;

        const line = L.polyline([[d1.latitude, d1.longitude], [midLat, midLng], [d2.latitude, d2.longitude]], {
          color: '#38bdf8',
          weight: 2.5,
          opacity: 0.8,
          dashArray: '6, 8'
        });
        line.addTo(this.routeLayers);
      }
    });
  }

  private refreshDistrictStyles(): void {
    this.api.getDistricts().subscribe((districts) => {
      this.districts = districts;
      districts.forEach((d) => {
        const poly = this.districtLayers.get(d.id);
        if (poly) {
          poly.setStyle(this.getDistrictStyle(d));
        }
      });
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
      fillOpacity: isSinistre ? 0.45 : 0.18,
      color: borderColor,
      weight: isSinistre ? 3 : 1.5,
    };
  }

  private getBorderColor(level: number): string {
    if (level >= 5) return 'border-red-500';
    if (level >= 4) return 'border-orange-500';
    if (level >= 3) return 'border-amber-500';
    if (level >= 2) return 'border-sky-500';
    return 'border-emerald-500';
  }

  getDistrictName(id: string): string {
    return this.districts.find((d) => d.id === id)?.name || id;
  }
}

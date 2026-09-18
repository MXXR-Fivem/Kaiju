import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CrisisContextService, PRESET_OPERATORS, TacticalUser } from '../../services/crisis-context.service';
import { KaijuWsService } from '../../services/kaiju-ws.service';

@Component({
  selector: 'app-navbar-left',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <aside class="w-80 h-full bg-slate-950/90 border-r border-slate-800/80 backdrop-blur-md flex flex-col justify-between p-4 text-slate-200 z-30 select-none shadow-2xl">
      <!-- En-tête : Titre KAIJU & Réseau -->
      <div class="space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-sm bg-red-600 animate-pulse"></span>
            <h1 class="font-mono font-black text-lg tracking-wider text-white">KAIJU <span class="text-xs text-sky-400 font-normal">v1.0</span></h1>
          </div>
          <div class="flex items-center gap-1.5 text-xs font-mono">
            <span class="w-2 h-2 rounded-full" [ngClass]="ws.isConnected() ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'"></span>
            <span class="text-[11px] text-slate-400">{{ ws.isConnected() ? 'TACTICAL LINK' : 'OFFLINE' }}</span>
          </div>
        </div>

        <!-- Sélecteur d'Officier Opérationnel (POV QC / LC / CD) -->
        <div class="space-y-1.5 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <div class="text-[10px] font-mono uppercase tracking-widest text-slate-400">Poste de Commandement</div>
          <select [value]="context.currentUser().id"
                  (change)="onOperatorChange($event)"
                  class="w-full bg-slate-950 border border-slate-700 text-xs font-mono text-sky-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-sky-500">
            <option *ngFor="let op of operators" [value]="op.id">
              [{{ op.role }}] {{ op.name }} {{ op.districtCode ? '(' + op.districtCode + ')' : '(Global)' }}
            </option>
          </select>
          <div class="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Rôle : <strong class="text-white">{{ context.currentUser().role }}</strong></span>
            <span *ngIf="context.currentUser().districtCode" class="text-amber-400 font-mono text-[10px]">
              Secteur {{ context.currentUser().districtCode }}
            </span>
          </div>
        </div>

        <!-- Indicateur de Niveau d'Alerte Ville (Disaster Level 1 à 5) -->
        <div class="space-y-2 p-3 rounded-lg border" [ngClass]="getLevelCardClass()">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-mono uppercase tracking-wider text-slate-300">Niveau de Désastre</span>
            <span class="px-2 py-0.5 rounded font-mono font-bold text-xs" [ngClass]="getLevelBadgeClass()">
              NIVEAU {{ context.activeDisasterLevel() }} / 5
            </span>
          </div>
          <p class="text-xs font-mono text-slate-300">
            {{ getLevelDescription() }}
          </p>
          <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div class="h-full transition-all duration-500"
                 [ngClass]="getLevelBarClass()"
                 [style.width.%]="(context.activeDisasterLevel() / 5) * 100"></div>
          </div>
        </div>

        <!-- Raccourcis Modales Tactiques -->
        <div class="space-y-2 pt-2">
          <button (click)="context.isInventoryModalOpen.set(true)"
                  class="w-full flex items-center justify-between px-3 py-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-200 transition">
            <span class="flex items-center gap-2">
              <span>📦</span>
              <span>Réserves Stratégiques (10)</span>
            </span>
            <span class="text-[10px] text-sky-400">Voir →</span>
          </button>

          <button (click)="context.isCalendarModalOpen.set(true)"
                  class="w-full flex items-center justify-between px-3 py-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-200 transition">
            <span class="flex items-center gap-2">
              <span>📅</span>
              <span>Calendrier des Convois</span>
            </span>
            <span class="text-[10px] text-sky-400">Voir →</span>
          </button>
        </div>
      </div>

      <!-- Bas de Navbar : Lien Secret God Mode & Tokyork Info -->
      <div class="pt-4 border-t border-slate-900 space-y-2">
        <a routerLink="/god-mode-secret"
           class="flex items-center justify-center gap-2 w-full py-1.5 px-3 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-900/60 text-[11px] font-mono text-red-300 transition">
          <span>⚠️</span>
          <span>Protocole God Mode (Jury)</span>
        </a>
        <div class="text-[10px] font-mono text-slate-400 text-center">
          Tokyork Crisis Operations Command
        </div>
      </div>
    </aside>
  `
})
export class NavbarLeftComponent {
  context = inject(CrisisContextService);
  ws = inject(KaijuWsService);
  operators = PRESET_OPERATORS;

  onOperatorChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const found = this.operators.find((op) => op.id === select.value);
    if (found) {
      this.context.setUser(found);
    }
  }

  getLevelCardClass(): string {
    const lvl = this.context.activeDisasterLevel();
    if (lvl >= 5) return 'bg-red-950/40 border-red-800/80';
    if (lvl >= 4) return 'bg-orange-950/40 border-orange-800/80';
    if (lvl >= 3) return 'bg-amber-950/40 border-amber-800/80';
    if (lvl >= 2) return 'bg-sky-950/40 border-sky-800/80';
    return 'bg-emerald-950/40 border-emerald-800/80';
  }

  getLevelBadgeClass(): string {
    const lvl = this.context.activeDisasterLevel();
    if (lvl >= 5) return 'bg-red-600 text-white';
    if (lvl >= 4) return 'bg-orange-600 text-white';
    if (lvl >= 3) return 'bg-amber-500 text-black';
    if (lvl >= 2) return 'bg-sky-500 text-white';
    return 'bg-emerald-600 text-white';
  }

  getLevelBarClass(): string {
    const lvl = this.context.activeDisasterLevel();
    if (lvl >= 5) return 'bg-red-500';
    if (lvl >= 4) return 'bg-orange-500';
    if (lvl >= 3) return 'bg-amber-400';
    if (lvl >= 2) return 'bg-sky-400';
    return 'bg-emerald-400';
  }

  getLevelDescription(): string {
    const lvl = this.context.activeDisasterLevel();
    switch (lvl) {
      case 1: return 'Surveillance passive. Aucune réquisition.';
      case 2: return 'Vigilance. Réservations locales intra-quartier.';
      case 3: return 'Alerte. Transferts adjacents directs débloqués (QC).';
      case 4: return 'Crise sévère. Transferts étendus (LC) & Réquisitions (CD).';
      case 5: return 'Urgence Absolue. Dérogation rétention 15% (CD) & Voies maritimes prioritaires.';
      default: return 'Surveillance standard.';
    }
  }
}

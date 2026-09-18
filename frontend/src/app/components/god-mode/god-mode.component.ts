import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { KaijuApiService } from '../../services/kaiju-api.service';
import { DisasterEvent } from '../../models/kaiju.models';

@Component({
  selector: 'app-god-mode',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="w-full h-screen bg-[#07090e] text-slate-200 font-mono flex flex-col select-none overflow-hidden">
      <!-- En-tête God Mode -->
      <header class="px-6 py-4 bg-slate-950 border-b border-red-900/60 flex items-center justify-between shadow-xl">
        <div class="flex items-center gap-3">
          <span class="text-xl">☣️</span>
          <div>
            <h1 class="font-black text-base text-red-500 tracking-wider">POV GOD :: PROTOCOLE OMEGA (PANNEAU ADMIN / JURY)</h1>
            <p class="text-[11px] text-slate-400">Simulation de Catastrophes & Vérification du Moteur de Règles Rust</p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <span *ngIf="isAuthenticated" class="px-2.5 py-1 rounded bg-red-950 border border-red-700 text-red-300 text-xs font-bold animate-pulse">
            ACCÈS SUPER-ADMIN ACTIF
          </span>
          <a routerLink="/" class="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition">
            ← Retour au POV QG
          </a>
        </div>
      </header>

      <!-- Écran de Connexion Secret si non authentifié -->
      <div *ngIf="!isAuthenticated" class="flex-1 flex items-center justify-center p-4">
        <div class="w-full max-w-md p-6 bg-slate-900 border border-red-900/80 rounded-xl shadow-2xl space-y-4">
          <div class="text-center space-y-1">
            <span class="text-3xl">🔒</span>
            <h2 class="text-sm font-bold text-white uppercase tracking-wider">Identification Maître de Crise</h2>
            <p class="text-xs text-slate-400">Mot de passe global défini dans la configuration d'urgence (.env)</p>
          </div>

          <form (ngSubmit)="loginGodMode()" class="space-y-3">
            <div>
              <label class="block text-xs text-slate-400 mb-1">Mot de Passe Secret :</label>
              <input type="password" [(ngModel)]="secretPassword" name="pwd" required
                     placeholder="kaiju-omega-protocol-2026"
                     class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-xs focus:outline-none focus:border-red-500" />
            </div>

            <div *ngIf="authError" class="p-2 rounded bg-red-950/80 border border-red-600 text-red-200 text-xs">
              {{ authError }}
            </div>

            <button type="submit" [disabled]="isAuthenticating"
                    class="w-full py-2.5 rounded bg-red-700 hover:bg-red-600 text-white font-bold text-xs shadow-lg transition">
              {{ isAuthenticating ? 'Vérification en cours...' : 'Déverrouiller le Protocole Omega' }}
            </button>
          </form>
        </div>
      </div>

      <!-- Panneau de Contrôle GOD MODE -->
      <div *ngIf="isAuthenticated" class="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-6">
        <!-- Colonne Gauche : Déclencheur de Catastrophe -->
        <div class="space-y-4 bg-slate-900/80 p-5 rounded-xl border border-slate-800 shadow-xl">
          <div class="flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 class="font-bold text-sm text-white flex items-center gap-2">
              <span class="text-amber-400">⚡</span>
              <span>Déclencheur de Catastrophe Unique</span>
            </h2>
            <span class="text-[10px] text-slate-400">1 seule catastrophe à la fois</span>
          </div>

          <!-- Choix du sinistre -->
          <div class="space-y-3">
            <div>
              <label class="block text-slate-400 text-xs mb-1">Quartier Cible de Tokyork :</label>
              <div class="grid grid-cols-5 gap-2 text-xs">
                <button *ngFor="let d of districts" type="button"
                        (click)="targetDistrict = d.code"
                        class="p-2 rounded border font-bold text-center transition"
                        [ngClass]="targetDistrict === d.code ? 'bg-red-700 border-red-500 text-white shadow' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'">
                  <div>{{ d.code }}</div>
                  <div class="text-[9px] font-normal opacity-80">{{ d.coastal ? '🌊 Côtier' : '⛰️ Enclavé' }}</div>
                </button>
              </div>
            </div>

            <div>
              <label class="block text-slate-400 text-xs mb-1">Type de Catastrophe :</label>
              <div class="grid grid-cols-3 gap-2 text-xs">
                <button *ngFor="let t of ['EARTHQUAKE', 'TSUNAMI', 'TORNADO']" type="button"
                        (click)="disasterType = t"
                        class="p-2.5 rounded border font-bold text-center transition"
                        [ngClass]="disasterType === t ? 'bg-amber-600 border-amber-400 text-black shadow' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'">
                  {{ t === 'EARTHQUAKE' ? '🌋 Séisme' : (t === 'TSUNAMI' ? '🌊 Tsunami' : '🌪️ Tornade') }}
                </button>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-xs text-slate-300 mb-1">
                <span>Intensité : <strong>{{ intensity }} / 100</strong></span>
                <span class="text-amber-400 font-bold">Niveau de Crise Généré : NIVEAU {{ getExpectedLevel() }}</span>
              </div>
              <input type="range" [(ngModel)]="intensity" min="1" max="100" class="w-full accent-red-500" />
            </div>

            <div class="pt-2 flex gap-3">
              <button (click)="triggerDisaster()" [disabled]="isActionRunning"
                      class="flex-1 py-2.5 rounded bg-red-700 hover:bg-red-600 text-white font-bold text-xs shadow-lg transition">
                💥 Déclencher la Catastrophe
              </button>
              <button (click)="resolveDisaster()" [disabled]="isActionRunning"
                      class="py-2.5 px-4 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg transition">
                ✓ Retour à la Normale
              </button>
            </div>
          </div>

          <!-- Raccourcis de Test pour le Jury -->
          <div class="pt-3 border-t border-slate-800 space-y-2">
            <h3 class="text-xs font-bold text-sky-400 uppercase tracking-wider">Tests de Conformité pour le Jury</h3>
            
            <button (click)="testTsunamiInlandReject()"
                    class="w-full text-left p-2.5 rounded bg-slate-950 hover:bg-red-950/40 border border-slate-800 hover:border-red-600 text-xs transition">
              <div class="font-bold text-red-400 flex items-center justify-between">
                <span>Test Refus Tsunami sur Enclavé (Apex / Warden)</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-red-900 text-red-200">Attendu : HTTP 422</span>
              </div>
              <p class="text-[10px] text-slate-400 mt-0.5">Vérifie le rejet immédiat avec le code explicite INVALID_COASTAL_TARGET.</p>
            </button>

            <button (click)="testRetentionOverride()"
                    class="w-full text-left p-2.5 rounded bg-slate-950 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-600 text-xs transition">
              <div class="font-bold text-amber-400 flex items-center justify-between">
                <span>Test Dérogation Rétention 15% par City Director</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-900 text-amber-200">Condition : Niveau 5</span>
              </div>
              <p class="text-[10px] text-slate-400 mt-0.5">Vérifie l'abaissement exceptionnel du seuil légal de 30% à 15% par le CD.</p>
            </button>
          </div>
        </div>

        <!-- Colonne Droite : Console d'Audit & Résultats HTTP -->
        <div class="flex flex-col bg-slate-900/80 p-5 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
          <div class="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <h2 class="font-bold text-sm text-white flex items-center gap-2">
              <span class="text-emerald-400">💻</span>
              <span>Console d'Exécution & Preuves du Moteur de Règles</span>
            </h2>
            <button (click)="logs = []" class="text-[10px] text-slate-400 hover:text-white">Effacer</button>
          </div>

          <div class="flex-1 overflow-y-auto bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs space-y-2">
            <div *ngIf="logs.length === 0" class="text-slate-400 text-center pt-8">
              En attente d'ordres opérationnels. Lancez une action pour observer la réponse du moteur Rust.
            </div>

            <div *ngFor="let log of logs" class="p-2 rounded border"
                 [ngClass]="log.status >= 400 ? 'bg-red-950/40 border-red-800 text-red-200' : 'bg-emerald-950/40 border-emerald-800 text-emerald-200'">
              <div class="flex items-center justify-between font-bold text-[11px]">
                <span>{{ log.action }}</span>
                <span class="px-1.5 py-0.2 rounded" [ngClass]="log.status >= 400 ? 'bg-red-900 text-white' : 'bg-emerald-900 text-white'">
                  HTTP {{ log.status }}
                </span>
              </div>
              <div class="text-[10px] opacity-90 mt-1 font-sans">{{ log.message }}</div>
              <pre *ngIf="log.raw" class="mt-1 text-[9px] text-slate-300 overflow-x-auto bg-black/50 p-1.5 rounded">{{ log.raw | json }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class GodModeComponent {
  api = inject(KaijuApiService);

  isAuthenticated = false;
  secretPassword = 'kaiju-omega-protocol-2026';
  authError: string | null = null;
  isAuthenticating = false;
  isActionRunning = false;

  districts = [
    { code: 'A', name: 'Apex', coastal: false },
    { code: 'E', name: 'Echo', coastal: true },
    { code: 'W', name: 'Warden', coastal: false },
    { code: 'X', name: 'Xeno', coastal: true },
    { code: 'Z', name: 'Zion', coastal: true },
  ];

  targetDistrict = 'E';
  disasterType = 'EARTHQUAKE';
  intensity = 75;

  logs: Array<{ action: string; status: number; message: string; raw?: any }> = [];

  loginGodMode(): void {
    this.isAuthenticating = true;
    this.authError = null;

    this.api.verifyGodMode(this.secretPassword).subscribe({
      next: () => {
        this.isAuthenticated = true;
        this.isAuthenticating = false;
        this.addLog('AUTH_SUCCESS', 200, 'Connexion accordée au Protocole God Mode Omega.');
      },
      error: (err) => {
        this.isAuthenticating = false;
        this.authError = 'Mot de passe invalide. Accès refusé.';
      }
    });
  }

  getExpectedLevel(): number {
    if (this.intensity <= 20) return 1;
    if (this.intensity <= 40) return 2;
    if (this.intensity <= 60) return 3;
    if (this.intensity <= 80) return 4;
    return 5;
  }

  triggerDisaster(): void {
    this.isActionRunning = true;
    this.api.triggerGodMode({
      secret_password: this.secretPassword,
      district_target: this.targetDistrict,
      disaster_type: this.disasterType,
      intensity: this.intensity
    }).subscribe({
      next: (event) => {
        this.isActionRunning = false;
        this.addLog(
          `DISASTER_TRIGGERED: ${this.disasterType} sur ${this.targetDistrict}`,
          201,
          `Catastrophe activée avec succès. Niveau calculé : ${event.calculated_level}. Notification WebSocket diffusée à tous les QG.`,
          event
        );
      },
      error: (err) => {
        this.isActionRunning = false;
        this.addLog(
          `DISASTER_REJECTED: ${this.disasterType} sur ${this.targetDistrict}`,
          err.status || 500,
          err.error?.message || 'Erreur inconnue',
          err.error
        );
      }
    });
  }

  resolveDisaster(): void {
    this.isActionRunning = true;
    this.api.resolveDisaster().subscribe({
      next: (res) => {
        this.isActionRunning = false;
        this.addLog('DISASTER_RESOLVED', 200, 'Toute catastrophe a été levée. Tokyork est revenue au niveau 1 nominal.');
      },
      error: (err) => {
        this.isActionRunning = false;
        this.addLog('RESOLVE_ERROR', err.status || 500, err.error?.message || 'Erreur');
      }
    });
  }

  testTsunamiInlandReject(): void {
    this.targetDistrict = 'A'; // Apex (enclavé)
    this.disasterType = 'TSUNAMI';
    this.intensity = 80;

    this.api.triggerGodMode({
      secret_password: this.secretPassword,
      district_target: 'A',
      disaster_type: 'TSUNAMI',
      intensity: 80
    }).subscribe({
      next: () => {
        this.addLog('TEST_FAILED', 200, 'Erreur : Le tsunami n\'aurait pas dû être accepté sur Apex !');
      },
      error: (err) => {
        this.addLog(
          'TEST_CONFORMITE_TSUNAMI_ENCLAVE',
          err.status,
          `Validation réussie : ${err.error?.message} [Code: ${err.error?.error_code}]`,
          err.error
        );
      }
    });
  }

  testRetentionOverride(): void {
    this.api.overrideRetention({
      secret_password: this.secretPassword,
      district_target: this.targetDistrict,
      user_role: 'CD'
    }).subscribe({
      next: (res) => {
        this.addLog('RETENTION_OVERRIDE_SUCCESS', 200, res.message, res);
      },
      error: (err) => {
        this.addLog('RETENTION_OVERRIDE_DENIED', err.status, err.error?.message, err.error);
      }
    });
  }

  private addLog(action: string, status: number, message: string, raw?: any): void {
    this.logs.unshift({ action, status, message, raw });
  }
}

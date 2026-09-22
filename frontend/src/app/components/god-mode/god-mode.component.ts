import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KaijuApiService } from '../../services/kaiju-api.service';
import { EARTHQUAKE_FRAMES } from './ascii/earthquake.ascii';
import { TSUNAMI_FRAMES } from './ascii/tsunami.ascii';
import { TORNADO_FRAMES } from './ascii/tornado.ascii';

@Component({
  selector: 'app-god-mode',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full h-screen bg-black text-zinc-200 font-mono flex flex-col select-none overflow-hidden">
      <header class="px-5 py-3 bg-black border-b border-zinc-800 border-t-4 border-t-red-600 flex items-center justify-between shadow-2xl">
        <div class="flex items-center gap-3">
          <span class="px-2 py-0.5 border border-red-700 bg-red-950/80 text-red-400 font-bold text-xs uppercase tracking-widest">
            [PROT-OMEGA]
          </span>
          <div>
            <h1 class="font-black text-sm text-red-500 tracking-widest uppercase">
              POSTE CENTRAL DE CRISE // PROTOCOLE OMEGA (POV GOD)
            </h1>
            <p class="text-[10px] text-zinc-500 uppercase tracking-wider">
              INJECTION DE CATASTROPHES & CONTROLE DES REGLES METIER DU MOTEUR RUST
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <span *ngIf="isAuthenticated" class="px-2 py-0.5 border border-red-600 bg-red-950 text-red-300 text-[10px] font-bold tracking-widest uppercase animate-pulse">
            [SUPER-ADMIN ACTIF]
          </span>
        </div>
      </header>

      <div *ngIf="!isAuthenticated" class="flex-1 flex items-center justify-center p-4 bg-black">
        <div class="w-full max-w-md p-6 bg-black border border-red-900 border-t-4 border-t-red-600 shadow-2xl space-y-4">
          <div class="text-left space-y-1 border-b border-zinc-900 pb-3">
            <span class="font-bold text-red-500 text-xs tracking-widest uppercase">[VERROU CRITIQUE]</span>
            <h2 class="text-sm font-bold text-white uppercase tracking-widest">AUTHENTIFICATION PROTOCOLE OMEGA</h2>
            <p class="text-[10px] text-zinc-500 uppercase">MOT DE PASSE MAITRE REQUIS POUR SIMULER LES CATASTROPHES</p>
          </div>

          <form (ngSubmit)="loginGodMode()" class="space-y-4">
            <div>
              <label class="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">CLE SECRETE :</label>
              <input type="password" [(ngModel)]="secretPassword" name="pwd" required
                     placeholder="kaiju-omega-protocol-2026"
                     class="w-full bg-black border border-zinc-700 p-2 text-white text-xs focus:outline-none focus:border-red-500 tracking-widest" />
            </div>

            <div *ngIf="authError" class="p-2 bg-red-950/80 border border-red-600 text-red-200 text-xs">
              {{ authError }}
            </div>

            <button type="submit" [disabled]="isAuthenticating"
                    class="w-full py-2 border border-red-500 text-red-400 hover:bg-red-500 hover:text-black font-bold text-xs uppercase tracking-widest transition-colors">
              {{ isAuthenticating ? 'VERIFICATION EN COURS...' : 'DEVERROUILLER LE TERMINAL' }}
            </button>
          </form>
        </div>
      </div>

      <div *ngIf="isAuthenticated" class="flex-1 overflow-y-auto bg-black">

        <div class="px-5 pt-5">
          <label class="block text-zinc-400 text-[10px] uppercase tracking-wider mb-2">SCAN TACTIQUE DES FLEAUX :</label>
          <div class="grid grid-cols-3 gap-4">
            <button *ngFor="let a of asciiPanels" type="button"
                 (click)="disasterType = a.type"
                 class="p-3 border transition-colors text-left"
                 [ngClass]="disasterType === a.type ? a.activeClass : 'bg-black border-zinc-800 hover:border-zinc-700'">
              <pre class="text-[11px] leading-[12px] font-mono text-center overflow-hidden"
                   [ngClass]="disasterType === a.type ? a.textClass : 'text-zinc-700'">{{ a.frames[frameIndex % a.frames.length] }}</pre>
              <div class="text-center text-xs font-bold uppercase tracking-widest mt-2"
                   [ngClass]="disasterType === a.type ? a.textClass : 'text-zinc-600'">{{ a.label }}</div>
            </button>
          </div>
        </div>

        <div class="p-5 grid grid-cols-2 gap-5">
        <div class="space-y-4 bg-black p-4 border border-zinc-800 border-t-2 border-t-amber-500">
          <div class="flex items-center justify-between border-b border-zinc-900 pb-2">
            <div class="flex items-center gap-2">
              <span class="text-amber-500 font-bold text-xs">[INJECTEUR]</span>
              <h2 class="font-bold text-xs text-white uppercase tracking-widest">DECLENCHEUR DE CATASTROPHE UNIQUE</h2>
            </div>
            <span class="text-[10px] text-zinc-500 uppercase">1 SEULE CATASTROPHE ACTIVE</span>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-zinc-400 text-[10px] uppercase tracking-wider mb-1">CIBLE DE TOKYORK :</label>
              <div class="grid grid-cols-5 gap-1.5 text-xs">
                <button *ngFor="let d of districts" type="button"
                        (click)="targetDistrict = d.code"
                        class="p-2 border text-center transition-colors font-bold"
                        [ngClass]="targetDistrict === d.code ? 'bg-red-600 text-black border-red-500' : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'">
                  <div>[{{ d.code }}]</div>
                  <div class="text-[8px] font-normal uppercase">{{ d.coastal ? 'LITTORAL' : 'ENCLAVE' }}</div>
                </button>
              </div>
            </div>

            <div>
              <label class="block text-zinc-400 text-[10px] uppercase tracking-wider mb-1">TYPE DE FLEAU :</label>
              <div class="grid grid-cols-3 gap-2 text-xs">
                <button *ngFor="let t of ['EARTHQUAKE', 'TSUNAMI', 'TORNADO']" type="button"
                        (click)="disasterType = t"
                        class="py-2 border text-center font-bold uppercase transition-colors"
                        [ngClass]="disasterType === t ? 'bg-amber-500 text-black border-amber-500' : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'">
                  {{ t === 'EARTHQUAKE' ? 'SEISME' : (t === 'TSUNAMI' ? 'TSUNAMI' : 'TORNADE') }}
                </button>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-[11px] text-zinc-300 mb-1">
                <span>INTENSITE : <strong>{{ intensity }} / 100</strong></span>
                <span class="text-amber-400 font-bold uppercase">NIVEAU CALCULE : NIVEAU {{ getExpectedLevel() }}</span>
              </div>
              <input type="range" [(ngModel)]="intensity" min="1" max="100" class="w-full accent-red-500" />
            </div>

            <div class="pt-2 flex gap-2">
              <button (click)="triggerDisaster()" [disabled]="isActionRunning"
                      class="flex-1 py-2 border border-red-500 text-red-400 hover:bg-red-500 hover:text-black font-bold text-xs uppercase tracking-widest transition-colors">
                DECLENCHER CATASTROPHE
              </button>
              <button (click)="resolveDisaster()" [disabled]="isActionRunning"
                      class="py-2 px-4 border border-green-500 text-green-400 hover:bg-green-500 hover:text-black font-bold text-xs uppercase tracking-widest transition-colors">
                RETOUR AU NOMINAL
              </button>
            </div>
          </div>

          <div class="pt-3 border-t border-zinc-900 space-y-2">
            <h3 class="text-[10px] font-bold text-green-500 uppercase tracking-widest">TESTS DE CONFORMITE REGLEMENTAIRE</h3>

            <button (click)="testTsunamiInlandReject()"
                    class="w-full text-left p-2 bg-black border border-zinc-800 hover:border-red-600 transition-colors">
              <div class="font-bold text-red-400 text-xs flex items-center justify-between">
                <span>[TEST 1] REFUS TSUNAMI SUR ENCLAVE (APEX)</span>
                <span class="text-[9px] px-1 border border-red-700 bg-red-950 text-red-300 uppercase">ATTENDU : HTTP 422</span>
              </div>
              <p class="text-[10px] text-zinc-500 mt-0.5 uppercase">VERIFIE LE CODE D'ERREUR INVALID_COASTAL_TARGET DU MOTEUR DE REGLES.</p>
            </button>

            <button (click)="testRetentionOverride()"
                    class="w-full text-left p-2 bg-black border border-zinc-800 hover:border-amber-600 transition-colors">
              <div class="font-bold text-amber-400 text-xs flex items-center justify-between">
                <span>[TEST 2] DEROGATION RETENTION A 15% (CITY DIRECTOR)</span>
                <span class="text-[9px] px-1 border border-amber-700 bg-amber-950 text-amber-300 uppercase">CONDITION : NIVEAU 5</span>
              </div>
              <p class="text-[10px] text-zinc-500 mt-0.5 uppercase">VERIFIE L'ABAISSEMENT EXCEPTIONNEL DU SEUIL LEGAL DE 30% A 15% SOUS NIVEAU 5.</p>
            </button>
          </div>
        </div>

        <div class="flex flex-col bg-black p-4 border border-zinc-800 border-t-2 border-t-green-500 overflow-hidden">
          <div class="flex items-center justify-between border-b border-zinc-900 pb-2 mb-2">
            <div class="flex items-center gap-2">
              <span class="text-green-500 font-bold text-xs">[CONSOLE]</span>
              <h2 class="font-bold text-xs text-white uppercase tracking-widest">LOGS D'EXECUTION DU SERVEUR RUST</h2>
            </div>
            <button (click)="logs = []" class="text-[10px] text-zinc-500 hover:text-white uppercase">
              EFFACER
            </button>
          </div>

          <div class="flex-1 overflow-y-auto bg-black p-2 border border-zinc-900 font-mono text-xs space-y-2">
            <div *ngIf="logs.length === 0" class="text-zinc-600 text-center pt-8 text-[11px] uppercase">
              EN ATTENTE D'INSTRUCTIONS. DECLENCHEZ UN TEST POUR OBSERVER LA REPONSE RUST.
            </div>

            <div *ngFor="let log of logs" class="p-2 border"
                 [ngClass]="log.status >= 400 ? 'bg-red-950/20 border-red-800 text-red-300' : 'bg-green-950/20 border-green-800 text-green-300'">
              <div class="flex items-center justify-between font-bold text-[11px]">
                <span class="uppercase">{{ log.action }}</span>
                <span class="px-1 border text-[9px] uppercase"
                      [ngClass]="log.status >= 400 ? 'border-red-700 bg-red-900 text-white' : 'border-green-700 bg-green-900 text-white'">
                  HTTP {{ log.status }}
                </span>
              </div>
              <div class="text-[10px] opacity-90 mt-1 uppercase leading-snug">{{ log.message }}</div>
              <pre *ngIf="log.raw" class="mt-1 text-[9px] text-zinc-400 overflow-x-auto bg-black p-1 border border-zinc-800">{{ log.raw | json }}</pre>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  `
})
export class GodModeComponent implements OnInit, OnDestroy {
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

  asciiPanels = [
    {
      type: 'EARTHQUAKE',
      label: 'SEISME',
      frames: EARTHQUAKE_FRAMES,
      activeClass: 'bg-red-950/40 border-red-500',
      textClass: 'text-red-400'
    },
    {
      type: 'TSUNAMI',
      label: 'TSUNAMI',
      frames: TSUNAMI_FRAMES,
      activeClass: 'bg-sky-950/40 border-sky-500',
      textClass: 'text-sky-400'
    },
    {
      type: 'TORNADO',
      label: 'TORNADE',
      frames: TORNADO_FRAMES,
      activeClass: 'bg-amber-950/40 border-amber-500',
      textClass: 'text-amber-400'
    }
  ];

  frameIndex = 0;
  private frameTimer?: ReturnType<typeof setInterval>;

  logs: Array<{ action: string; status: number; message: string; raw?: any }> = [];

  ngOnInit(): void {
    this.frameTimer = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % 4;
    }, 450);
  }

  ngOnDestroy(): void {
    if (this.frameTimer) {
      clearInterval(this.frameTimer);
    }
  }

  loginGodMode(): void {
    this.isAuthenticating = true;
    this.authError = null;

    this.api.verifyGodMode(this.secretPassword).subscribe({
      next: () => {
        this.isAuthenticated = true;
        this.isAuthenticating = false;
        this.addLog('AUTH_SUCCESS', 200, 'Connexion accordee au Protocole God Mode Omega.');
      },
      error: () => {
        this.isAuthenticating = false;
        this.authError = 'Cle secrete invalide. Acces refuse.';
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
          `Catastrophe activee avec succes. Niveau calcule : ${event.calculated_level}. Notification WebSocket diffusee a tous les QG.`,
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
      next: () => {
        this.isActionRunning = false;
        this.addLog('DISASTER_RESOLVED', 200, 'Toute catastrophe a ete levee. Tokyork est revenue au niveau 1 nominal.');
      },
      error: (err) => {
        this.isActionRunning = false;
        this.addLog('RESOLVE_ERROR', err.status || 500, err.error?.message || 'Erreur');
      }
    });
  }

  testTsunamiInlandReject(): void {
    this.targetDistrict = 'A';
    this.disasterType = 'TSUNAMI';
    this.intensity = 80;

    this.api.triggerGodMode({
      secret_password: this.secretPassword,
      district_target: 'A',
      disaster_type: 'TSUNAMI',
      intensity: 80
    }).subscribe({
      next: () => {
        this.addLog('TEST_FAILED', 200, 'Erreur : Le tsunami n aurait pas du etre accepte sur Apex !');
      },
      error: (err) => {
        this.addLog(
          'TEST_CONFORMITE_TSUNAMI_ENCLAVE',
          err.status,
          `Validation reussie : ${err.error?.message} [Code: ${err.error?.error_code}]`,
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

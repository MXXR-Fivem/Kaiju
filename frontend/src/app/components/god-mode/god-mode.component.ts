import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KaijuApiService, describeError } from '../../services/kaiju-api.service';
import { DisasterType } from '../../models/kaiju.models';
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
              POSTE CENTRAL DE CRISE — PROTOCOLE OMEGA
            </h1>
            <p class="text-[10px] text-zinc-500 uppercase tracking-wider">
              INJECTION DE CATASTROPHES & CONTROLE DES REGLES METIER
            </p>
          </div>
        </div>

        <span *ngIf="authenticated" class="px-2 py-0.5 border border-red-600 bg-red-950 text-red-300 text-[10px] font-bold tracking-widest uppercase animate-pulse">
          [SUPER-ADMIN ACTIF]
        </span>
      </header>

      <div *ngIf="!authenticated" class="flex-1 flex items-center justify-center p-4 bg-black">
        <div class="w-full max-w-md p-6 bg-black border border-red-900 border-t-4 border-t-red-600 shadow-2xl space-y-4">
          <div class="text-left space-y-1 border-b border-zinc-900 pb-3">
            <span class="font-bold text-red-500 text-xs tracking-widest uppercase">[VERROU CRITIQUE]</span>
            <h2 class="text-sm font-bold text-white uppercase tracking-widest">AUTHENTIFICATION PROTOCOLE OMEGA</h2>
            <p class="text-[10px] text-zinc-500 uppercase">MOT DE PASSE MAITRE REQUIS POUR SIMULER LES CATASTROPHES</p>
          </div>

          <form (ngSubmit)="unlock()" class="space-y-4">
            <div>
              <label class="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">CLE SECRETE :</label>
              <input type="password" [(ngModel)]="password" name="pwd" required
                     class="w-full bg-black border border-zinc-700 p-2 text-white text-xs focus:outline-none focus:border-red-500 tracking-widest" />
            </div>

            <div *ngIf="error" class="p-2 bg-red-950/80 border border-red-600 text-red-200 text-xs">
              {{ error }}
            </div>

            <button type="submit" class="w-full py-2 border border-red-500 text-red-400 hover:bg-red-500 hover:text-black font-bold text-xs uppercase tracking-widest transition-colors">
              DEVERROUILLER LE TERMINAL
            </button>
          </form>
        </div>
      </div>

      <div *ngIf="authenticated" class="flex-1 overflow-y-auto bg-black">
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
              <span class="text-amber-500 font-bold text-xs">[INJECTEUR]</span>
              <h2 class="font-bold text-xs text-white uppercase tracking-widest">DECLENCHEUR DE CATASTROPHE</h2>
            </div>

            <div class="space-y-3">
              <div>
                <label class="block text-zinc-400 text-[10px] uppercase tracking-wider mb-1">CIBLE DE TOKYORK :</label>
                <div class="grid grid-cols-5 gap-1.5 text-xs">
                  <button *ngFor="let d of districts" type="button"
                          (click)="district = d.code"
                          class="p-2 border text-center transition-colors font-bold"
                          [ngClass]="district === d.code ? 'bg-red-600 text-black border-red-500' : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'">
                    <div>[{{ d.code }}]</div>
                    <div class="text-[8px] font-normal uppercase">{{ d.coastal ? 'LITTORAL' : 'ENCLAVE' }}</div>
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-zinc-400 text-[10px] uppercase tracking-wider mb-1">TYPE DE FLEAU :</label>
                <div class="grid grid-cols-3 gap-2 text-xs">
                  <button *ngFor="let a of asciiPanels" type="button"
                          (click)="disasterType = a.type"
                          class="py-2 border text-center font-bold uppercase transition-colors"
                          [ngClass]="disasterType === a.type ? a.activeClass : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'">
                    {{ a.label }}
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-zinc-400 text-[10px] uppercase tracking-wider mb-1">NIVEAU DE CRISE :</label>
                <div class="grid grid-cols-5 gap-1.5 text-xs">
                  <button *ngFor="let l of [1, 2, 3, 4, 5]" type="button"
                          (click)="level = l"
                          class="py-2 border text-center font-bold uppercase transition-colors"
                          [ngClass]="level === l ? 'bg-amber-500 text-black border-amber-500' : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'">
                    NIV {{ l }}
                  </button>
                </div>
              </div>

              <div class="pt-2 grid grid-cols-3 gap-2">
                <button (click)="trigger()" type="button"
                        class="py-2 border border-red-500 text-red-400 hover:bg-red-500 hover:text-black font-bold text-xs uppercase tracking-widest transition-colors">
                  DECLENCHER
                </button>
                <button (click)="resolve()" type="button"
                        class="py-2 border border-green-500 text-green-400 hover:bg-green-500 hover:text-black font-bold text-xs uppercase tracking-widest transition-colors">
                  RESOUDRE
                </button>
                <button (click)="reset()" type="button"
                        class="py-2 border border-zinc-600 text-zinc-400 hover:bg-zinc-700 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors">
                  RESET VILLE
                </button>
              </div>
            </div>

            <div class="pt-3 border-t border-zinc-900 space-y-2">
              <h3 class="text-[10px] font-bold text-green-500 uppercase tracking-widest">TESTS DE CONFORMITE REGLEMENTAIRE</h3>

              <button (click)="testTsunamiInlandReject()" type="button"
                      class="w-full text-left p-2 bg-black border border-zinc-800 hover:border-red-600 transition-colors">
                <div class="font-bold text-red-400 text-xs flex items-center justify-between">
                  <span>[TEST] REFUS TSUNAMI SUR ENCLAVE (APEX)</span>
                  <span class="text-[9px] px-1 border border-red-700 bg-red-950 text-red-300 uppercase">ATTENDU : ERREUR</span>
                </div>
                <p class="text-[10px] text-zinc-500 mt-0.5 uppercase">VERIFIE LE CODE D'ERREUR VALIDATION_ERROR DU MOTEUR DE REGLES.</p>
              </button>
            </div>
          </div>

          <div class="flex flex-col bg-black p-4 border border-zinc-800 border-t-2 border-t-green-500 overflow-hidden">
            <div class="flex items-center justify-between border-b border-zinc-900 pb-2 mb-2">
              <span class="text-green-500 font-bold text-xs">[CONSOLE]</span>
              <button (click)="logs = []" type="button" class="text-[10px] text-zinc-500 hover:text-white uppercase">EFFACER</button>
            </div>

            <div class="flex-1 overflow-y-auto bg-black p-2 border border-zinc-900 font-mono text-xs space-y-2">
              <div *ngIf="logs.length === 0" class="text-zinc-600 text-center pt-8 text-[11px] uppercase">
                EN ATTENTE D'ORDRES.
              </div>

              <div *ngFor="let log of logs" class="p-2 border" [ngClass]="log.error ? 'bg-red-950/20 border-red-800 text-red-300' : 'bg-green-950/20 border-green-800 text-green-300'">
                <div class="font-bold uppercase text-[11px]">{{ log.action }}</div>
                <pre class="mt-1 text-[10px] text-zinc-400 whitespace-pre-wrap overflow-x-auto">{{ log.detail | json }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class GodModeComponent implements OnInit, OnDestroy {
  private api = inject(KaijuApiService);

  authenticated = false;
  password = '';
  error = '';

  districts = [
    { code: 'A', coastal: false },
    { code: 'E', coastal: true },
    { code: 'W', coastal: false },
    { code: 'X', coastal: true },
    { code: 'Z', coastal: true }
  ];

  district = 'X';
  disasterType: DisasterType = 'EARTHQUAKE';
  level = 3;

  asciiPanels = [
    { type: 'EARTHQUAKE' as DisasterType, label: 'SEISME', frames: EARTHQUAKE_FRAMES, activeClass: 'bg-red-950/40 border-red-500', textClass: 'text-red-400' },
    { type: 'TSUNAMI' as DisasterType, label: 'TSUNAMI', frames: TSUNAMI_FRAMES, activeClass: 'bg-sky-950/40 border-sky-500', textClass: 'text-sky-400' },
    { type: 'TORNADO' as DisasterType, label: 'TORNADE', frames: TORNADO_FRAMES, activeClass: 'bg-amber-950/40 border-amber-500', textClass: 'text-amber-400' }
  ];

  frameIndex = 0;
  private frameTimer?: ReturnType<typeof setInterval>;

  logs: { action: string; detail: unknown; error: boolean }[] = [];

  ngOnInit(): void {
    this.frameTimer = setInterval(() => (this.frameIndex = (this.frameIndex + 1) % 4), 450);
  }

  ngOnDestroy(): void {
    clearInterval(this.frameTimer);
  }

  unlock(): void {
    this.api.verifyGodMode(this.password).subscribe({
      next: () => (this.authenticated = true),
      error: (err: HttpErrorResponse) => (this.error = describeError(err))
    });
  }

  trigger(): void {
    this.run(`${this.disasterType} ${this.district} niveau ${this.level}`, this.api.triggerDisaster(this.password, this.district, this.disasterType, this.level));
  }

  resolve(): void {
    this.run(`Résolution ${this.district}`, this.api.resolveDisaster(this.password, this.district));
  }

  reset(): void {
    this.run('Réinitialisation', this.api.resetCity(this.password));
  }

  testTsunamiInlandReject(): void {
    this.district = 'A';
    this.disasterType = 'TSUNAMI';
    this.level = 3;
    this.api.triggerDisaster(this.password, 'A', 'TSUNAMI', 3).subscribe({
      next: () => this.logs.unshift({ action: 'TEST_ECHOUE', detail: 'Le tsunami n\'aurait pas dû être accepté sur Apex.', error: true }),
      error: (err: HttpErrorResponse) => this.logs.unshift({ action: 'TEST_CONFORME', detail: describeError(err), error: false })
    });
  }

  private run(action: string, request: Observable<unknown>): void {
    request.subscribe({
      next: (detail) => this.logs.unshift({ action, detail: detail ?? 'OK', error: false }),
      error: (err: HttpErrorResponse) => this.logs.unshift({ action, detail: describeError(err), error: true })
    });
  }
}

# KAIJU - Crisis Manager (Tokyork Emergency Response System)

Plateforme web full-stack de gestion de crise pour la metropole de Tokyork, developpee pour repondre aux situations d'urgence majeure (seismes, tsunamis, tornades, alertes Kaiju).

---

## 1. Architecture Globale

Le systeme repose sur une architecture robuste, decoupled et resilient :

- **Backend** : Rust 1.80+ (Actix-web, SQLx, SQLite, WebSockets temps reel, Architecture Hexagonale / Clean Architecture).
  - Couche Domaine : Moteur de regles metier strict (`RulesEngine`).
  - Couche Repository : Requetes SQL pures optimisees (sans ORM lourd).
  - Couche Service : Orchestration de crise, gestion des stocks, approbations logistiques.
  - Couche Handlers : Endpoints REST types et passerelle WebSocket.
- **Frontend** : Angular 18 (Standalone Components, Leaflet 2D, Tailwind CSS, Signals reactifs).
  - Vue QG (`HqView`) : Cartographie tactique, flux d'alertes, surveillance des stocks et modalites d'action d'urgence.
  - Vue GOD Mode (`GodMode` sur `/god-mode-secret`) : Injection de catastrophes, tests de conformite, modification de la retention.
  - Superposition Tactique : Selecteur vertical de calques (Global, Electricite, Reseau Hydraulique, Vivres, Secours Medical, Equipement Lourd).
- **Deploiement** : Docker Compose multi-stage avec reverse-proxy Nginx haute performance.

---

## 2. Regles Metier et Protocoles de Tokyork

### Topologie Urbaine (5 Quartiers)
- **Apex (A)** : Quartier enclave nord. Specialisation abris et filtration.
- **Echo (E)** : Port et baie est. Reserves massives d'eau et vivres.
- **Warden (W)** : Zone industrielle ouest enclavee. Generateurs, carburant, engins lourds.
- **Xeno (X)** : Hub central interconnecte et baie maritime. Noeud logistique critique.
- **Zion (Z)** : Complexe hospitalier cotier sud. Urgences medicales et hopital de campagne.

### Contraintes Operationnelles
1. **Incompatibilite Littorale (Tsunami)** :
   - Un Tsunami ne peut frapper que les quartiers cotiers (`E`, `X`, `Z`).
   - Tout ciblage d'un quartier enclave (`A`, `W`) est strictement rejete avec un code HTTP 422 (`INVALID_COASTAL_TARGET`).
2. **Regle Legale de Retention (30% / 15%)** :
   - Seuil standard : Chaque quartier doit conserver au minimum 30% de son stock initial de chaque ressource.
   - Prerogative City Director (CD) : Seul le CD peut abaisser le seuil a 15%, et uniquement sous le Niveau de Crise 5.
3. **Logistique et Transit** :
   - Transferts directs autorises entre quartiers adjacents.
   - Tout transfert non-adjacent doit transiter par le Hub Xeno (`PENDING` pour approbation du Coordinateur Logistique ou du City Director).
   - Transit maritime (entre `Echo`, `Xeno` et `Zion`) : La duree de voyage est doublee conformement aux conditions marines d'urgence.
4. **Calques Tactiques sur la Carte** :
   - Calque Electricite : Lignes d'alimentation sous-terraines avec etat dynamique [ACTIF / 20kV] ou [COUPE / 0kV].
   - Calque Hydraulique : Aqueducs principaux reliant les reserves d'Echo et de Zion aux enclaves.
   - Calques Vivres, Medical, Engins : Convois en transit avec quantite transportee et unite metier (L, Rations, Unites, Equipes).

---

## 3. Demarrage Rapide

### Prerequis
- Docker et Docker Compose
- Make (optionnel mais recommande)
- Ports 4200 et 8080 disponibles

### Lancement avec Docker Compose
```bash
make up
# ou directement
docker compose up -d --build
```

L'application est disponible sur :
- Interface QG Opérationnelle : [http://localhost:4200](http://localhost:4200)
- Module Secret GOD Mode : [http://localhost:4200/god-mode-secret](http://localhost:4200/god-mode-secret)
- API REST Backend : [http://localhost:8080/api/health](http://localhost:8080/api/health)

### Commandes Principales (Makefile)
- `make help` : Affiche l'ensemble des commandes disponibles.
- `make build` : Recompile les images Docker backend et frontend.
- `make up` : Demarre les services en arriere-plan.
- `make down` : Stoppe et supprime les conteneurs.
- `make logs` : Suit les logs en temps reel de tous les services.
- `make test` : Execute l'ensemble des tests unitaires (Rust + Angular).
- `make seed` : Reinitialise la base SQLite avec le referentiel de Tokyork.
- `make check` : Verifie le statut des conteneurs et la reponse de l'API.

---

## 4. Comptes Operationnels et Prerogatives

| Identifiant | Mot de passe | Nom & Role | Perimetre |
|-------------|--------------|------------|-----------|
| `director` | `kaiju_director_secure` | Cmdt. Vance (City Director - CD) | Ville entiere, override 15%, approbation finale |
| `logistics` | `kaiju_logistics_secure` | Maj. Thorne (Logistics Coordinator - LC) | Gestion des transits inter-quartiers et flottes |
| `coord_apex` | `coord_apex_secure` | Capt. Reyes (Quartier Apex - QC) | Gestion locale du quartier Apex |
| `coord_echo` | `coord_echo_secure` | Lt. Chen (Quartier Echo - QC) | Gestion locale du port Echo |
| `coord_warden` | `coord_warden_secure` | Sgt. Kowalski (Quartier Warden - QC) | Gestion locale de la zone industrielle Warden |
| `coord_xeno` | `coord_xeno_secure` | Capt. Mori (Quartier Xeno - QC) | Gestion locale du Nexus central Xeno |
| `coord_zion` | `coord_zion_secure` | Dr. Al-Mansoor (Quartier Zion - QC) | Gestion locale de l'hopital cotier Zion |

Mot de passe GOD MODE : `kaiju-omega-protocol-2026`

---

## 5. Endpoints de l'API REST

- `GET /api/health` : Bilan de sante du systeme.
- `GET /api/districts` : Liste des 5 quartiers avec coordonnees GPS et niveau de crise.
- `GET /api/districts/:id/adjacencies` : Liaisons terrestres et maritimes du quartier.
- `GET /api/resources/types` : Referentiel des 10 ressources critiques et unites.
- `GET /api/resources/inventory` : Inventaire complet de la ville.
- `GET /api/resources/inventory/:code` : Inventaire filtre par quartier.
- `POST /api/resources/reserve` : Reservation locale de ressource (intra-quartier).
- `POST /api/resources/reserve/:id/release` : Liberation d'une reservation.
- `GET /api/transfers` : Liste des transferts inter-quartiers et statuts.
- `POST /api/transfers` : Creation d'un transfert soumis aux regles de crise.
- `POST /api/transfers/:id/transit` : Validation ou refus du transit par le Hub Xeno.
- `POST /api/transfers/:id/deliver` : Confirmation de reception et integration au stock cible.
- `GET /api/disaster/active` : Catastrophe actuellement active.
- `POST /api/disaster/resolve` : Retour au niveau nominal.
- `POST /api/god-mode/verify` : Authentification au protocole Omega.
- `POST /api/god-mode/trigger` : Injection d'une catastrophe par le maitre de crise.
- `POST /api/god-mode/retention-override` : Application de la prerogative 15% par le CD.
- `GET /ws` : Passerelle WebSocket temps reel pour les mises a jour et alertes tactiques.

# KAIJU — Crisis Manager

> 🎓 **Projet Epitech** (B-SPE-331)

Plateforme de coordination des ressources d'urgence de Tokyork : réservations, transferts entre quartiers, niveaux de catastrophe et alertes en temps réel.

**Application déployée :** https://kaiju.busiristheo.com

**Démo :** inscription libre sur `/login` (choix du rôle QC/LC/CD) ; simulateur de catastrophes sur `/god-mode-secret`, mot de passe `HQLVu6SmiRwJzThEBB8Wdnoh`.

## Stack

- Backend : Rust (Actix Web, SQLx, SQLite), JWT + bcrypt, WebSocket
- Frontend : Angular 18, Leaflet, Tailwind
- Tests : unitaires Rust (règles métier), end-to-end Playwright
- Diagramme entité-association : [docs/database/ERD.md](docs/database/ERD.md)

## Lancer

```bash
cp .env.example .env   # renseigner JWT_SECRET et GOD_MODE_PASSWORD
make up                # http://localhost:4200
```

En développement : `cd backend && cargo run` puis `cd frontend && npm start`.

| Variable | Rôle |
|---|---|
| `PORT` | Port d'écoute du backend (obligatoire) |
| `DATABASE_URL` | Base SQLite (obligatoire) |
| `JWT_SECRET` | Signature des sessions (obligatoire) |
| `GOD_MODE_PASSWORD` | Active le simulateur de catastrophes `/god-mode-secret` |
| `FRONTEND_PORT` | Port publié par Docker Compose |

## Tests

```bash
make test   # règles métier
make e2e    # parcours critiques, sur la stack démarrée
```

## Règles appliquées par le serveur

- Rôles QC, LC et CD, et matrice niveaux × rôles de l'annexe. Le niveau de la ville est le niveau maximal des quartiers.
- Rétention : `ceil(30 %)` du stock initial. Le CD peut l'abaisser à 15 % au niveau 5 ; elle revient à 30 % sous le niveau 5.
- Un transfert part après l'accord du QC source et, pour un transit, du QC du quartier intermédiaire.
- La route maritime relie E, X et Z en double durée ; elle est choisie par défaut au niveau 5.
- Un quartier non adjacent ne fournit que si aucun quartier adjacent n'a le surplus.
- Un transit par Xeno attend que les demandes de Xeno soient traitées.
- La réquisition du CD part sans approbation.

| HTTP | `error_code` | Règle violée |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Requête invalide |
| 401 | `UNAUTHORIZED` | Session absente ou invalide |
| 403 | `PERMISSION_DENIED` | Rôle non autorisé |
| 404 | `NOT_FOUND` | Élément inconnu |
| 409 | `RESOURCE_CONFLICT` | Stock disponible insuffisant |
| 412 | `ADJACENCY_VIOLATION` | Route impossible |
| 422 | `RETENTION_VIOLATION` | Seuil de rétention franchi |
| 423 | `DISASTER_LEVEL_RESTRICTED` | Action verrouillée à ce niveau |
| 424 | `ADJACENCY_PRIORITY` | Un quartier adjacent doit fournir d'abord |
| 425 | `XENO_PRIORITY` | Xeno sert d'abord ses propres besoins |

## API

| Méthode | Route | Accès |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Public |
| GET | `/api/districts`, `/api/disasters`, `/api/stocks`, `/api/transfers`, `/api/reservations` | Officier |
| POST | `/api/reservations`, `/api/reservations/{id}/return` | QC |
| POST | `/api/transfers`, `/api/transfers/{id}/review`, `/api/transfers/{id}/deliver` | Selon la matrice |
| POST | `/api/retention/lower` | CD, niveau 5 |
| POST | `/api/god-mode/verify`, `/disasters`, `/resolve`, `/reset` | Mot de passe god mode |
| GET | `/ws?token=` | Officier, événements temps réel |

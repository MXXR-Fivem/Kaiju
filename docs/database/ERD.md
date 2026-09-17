# KAIJU - Crisis Manager : Spécifications et Diagramme Entité-Association (ERD)

## 1. Contexte Opérationnel de Tokyork

En situation de crise imminente, la ville de **Tokyork** est découpée en **5 quartiers stratégiques** aux caractéristiques géographiques et logistiques précises :
- **Apex (Code: A)** : Quartier enclavé (Nord). Aucune façade maritime.
- **Echo (Code: E)** : Quartier portuaire situé sur la baie (Est). Accès maritime direct.
- **Warden (Code: W)** : Quartier enclavé industriel/militaire (Ouest). Aucune façade maritime.
- **Xeno (Code: X)** : Carrefour central névralgique et maritime (Centre & Baie). Relié à tous les quartiers par voie terrestre et à la baie par son port. Priorité absolue à ses besoins internes avant d'autoriser les transits tiers.
- **Zion (Code: Z)** : Quartier côtier résidentiel sur la baie (Sud). Accès maritime direct.

### Topologie et Réseau d'Adjacence
```
            [ Apex (A) ] (Enclavé)
                 | (terre)
[ Warden (W) ] - [ Xeno (X) ] === (mer) === [ Echo (E) ] (Baie)
 (Enclavé)       | (terre)  \                  #
                 |           \ (mer)           # (mer)
                 |            \                #
            [ Zion (Z) ] =======#===============#
             (Baie)
```

- **Voies Terrestres directes** :
  - A <-> X
  - W <-> X
  - E <-> X
  - Z <-> X
  - A <-> W (contournement terrestre nord)
- **Voies Maritimes directes** (temps de transit doublé) :
  - E <-> X
  - X <-> Z
  - E <-> Z
- **Catastrophes incompatibles** :
  - **Tsunami** interdit sur Apex et Warden (refus strict du moteur de règles).

---

## 2. Référentiel des 10 Ressources Stratégiques

| ID | Code | Nom | Description | Unité |
|---|---|---|---|---|
| 1 | `WATER` | Eau Potable | Réserves d'eau potable d'urgence | Litres |
| 2 | `FOOD` | Rations Alimentaires | Packs de rations alimentaires de survie | Rations |
| 3 | `MED_KIT` | Kits Médicaux | Kits complets de premiers soins et traumatologie | Unités |
| 4 | `GENERATOR` | Générateurs Mobiles | Groupes électrogènes autonomes d'urgence | Unités |
| 5 | `FUEL` | Carburant | Réserves d'essence et gazole opérationnel | Litres |
| 6 | `SHELTER` | Modules d'Abris | Tentes d'urgence et modules d'hébergement temporaire | Unités |
| 7 | `MEDIC` | Équipes Médicales | Unités d'intervention médicale et secouristes | Équipes |
| 8 | `ATV` | Véhicules Tout-Terrain | Véhicules tout-terrain d'évacuation et de patrouille | Véhicules |
| 9 | `CLEARING_GEAR` | Équipements de Déblaiement | Engins lourds, tronçonneuses et matériel de déblaiement | Unités |
| 10 | `WATER_PURIFIER` | Purificateurs d'Eau | Unités mobiles de purification et filtration d'eau | Unités |

---

## 3. Diagramme Entité-Association (Mermaid ERD)

```mermaid
erDiagram
    DISTRICT ||--o{ DISTRICT_ADJACENCY : "connecte_depart"
    DISTRICT ||--o{ DISTRICT_ADJACENCY : "connecte_arrivee"
    DISTRICT ||--o{ DISTRICT_RESOURCE : "stocke"
    DISTRICT ||--o{ USER_ACCOUNT : "administre_par"
    DISTRICT ||--o{ DISASTER_EVENT : "subit"
    DISTRICT ||--o{ TRANSFER_REQUEST : "source_de"
    DISTRICT ||--o{ TRANSFER_REQUEST : "cible_de"
    DISTRICT ||--o{ TRANSFER_REQUEST : "transit_par"
    DISTRICT ||--o{ RESOURCE_RESERVATION : "localise_dans"

    RESOURCE_TYPE ||--o{ DISTRICT_RESOURCE : "quantifie"
    RESOURCE_TYPE ||--o{ TRANSFER_REQUEST : "concerne"
    RESOURCE_TYPE ||--o{ RESOURCE_RESERVATION : "reserve"

    USER_ACCOUNT ||--o{ TRANSFER_REQUEST : "demande_par"
    USER_ACCOUNT ||--o{ TRANSFER_REQUEST : "approuve_par"
    USER_ACCOUNT ||--o{ RESOURCE_RESERVATION : "effectue_par"
    USER_ACCOUNT ||--o{ AUDIT_LOG : "declenche_par"

    DISTRICT {
        string id PK "UUID"
        string code UK "A, E, W, X, Z"
        string name "Nom officiel du quartier"
        boolean is_coastal "Accessible par voie maritime"
        real latitude "Coordonnée latitude du centre"
        real longitude "Coordonnée longitude du centre"
        string polygon_bounds_json "Découpage géographique GeoJSON"
        integer current_disaster_level "Niveau d'alerte (1 à 5)"
        datetime created_at
        datetime updated_at
    }

    DISTRICT_ADJACENCY {
        string id PK "UUID"
        string from_district_id FK
        string to_district_id FK
        string route_type "LAND ou SEA"
        integer base_transit_minutes "Délai de transit de base"
        boolean is_blocked "Blocage opérationnel"
    }

    RESOURCE_TYPE {
        string id PK "UUID"
        string code UK "WATER, FOOD, etc."
        string name "Libellé de la ressource"
        string description "Description opérationnelle"
        string unit "Unité de mesure"
        boolean is_critical "Indicateur de ressource critique"
    }

    DISTRICT_RESOURCE {
        string id PK "UUID"
        string district_id FK
        string resource_type_id FK
        integer initial_quantity "Quantité de référence"
        integer current_quantity "Stock physique disponible"
        integer reserved_quantity "Stock bloqué en réservation"
        real min_retention_pct "Seuil légal (0.30 standard, 0.15 dérogation CD)"
        datetime updated_at
    }

    USER_ACCOUNT {
        string id PK "UUID"
        string username UK "Identifiant"
        string password_hash "Hash sécurisé"
        string role "QC (Quarter Coord), LC (Logistics), CD (City Director)"
        string assigned_district_id FK "Null pour LC et CD"
        datetime created_at
    }

    DISASTER_EVENT {
        string id PK "UUID"
        string district_id FK
        string disaster_type "EARTHQUAKE, TSUNAMI, TORNADO"
        integer intensity "Intensité (1 à 100)"
        integer calculated_level "Niveau généré (1 à 5)"
        boolean is_active "Catastrophe en cours"
        string triggered_by "GOD_MODE ou SYSTEM"
        datetime triggered_at
        datetime resolved_at
    }

    TRANSFER_REQUEST {
        string id PK "UUID"
        string requester_id FK
        string source_district_id FK
        string target_district_id FK
        string resource_type_id FK
        integer quantity "Nombre d'unités demandées"
        string route_type "LAND ou SEA"
        string transit_district_id FK "Ex: Xeno pour transit intermédiaire"
        string status "PENDING, IN_TRANSIT, DELIVERED, REJECTED, CANCELLED"
        string transit_approval_status "NONE, PENDING, APPROVED, REJECTED"
        integer estimated_duration_minutes "Durée estimée"
        datetime departed_at
        datetime estimated_arrival_at
        datetime delivered_at
        string rejection_reason
        datetime created_at
        datetime updated_at
    }

    RESOURCE_RESERVATION {
        string id PK "UUID"
        string district_id FK
        string resource_type_id FK
        string user_id FK
        string team_name "Nom de l'unité opérationnelle"
        integer quantity "Quantité réservée"
        string status "ACTIVE, RELEASED, CONSUMED"
        datetime expires_at
        datetime created_at
    }

    AUDIT_LOG {
        string id PK "UUID"
        string user_id FK "Nullable pour actions système"
        string action "TYPE_ACTION"
        string district_id FK "Nullable"
        string payload_json "Détails au format JSON"
        string ip_address
        datetime created_at
    }
```

---

## 4. Règles d'Intégrité et Contraintes Clés

1. **Règle de Rétention Obligatoire** :
   $$\text{Stock Disponible} - \text{Transfert} \ge \lceil \text{Stock Initial} \times \text{min\_retention\_pct} \rceil$$
   - Par défaut, $\text{min\_retention\_pct} = 0.30$.
   - Si $\text{disaster\_level} = 5$ et l'action est validée par le **City Director (CD)**, $\text{min\_retention\_pct}$ peut être abaissé à $0.15$.

2. **Validation Géographique des Catastrophes** :
   - Un sinistre de type `TSUNAMI` exige impérativement que le quartier cible possède `is_coastal = TRUE`.
   - Tout ordre de `TSUNAMI` ciblant Apex (`A`) ou Warden (`W`) est rejeté avec l'erreur `INVALID_COASTAL_TARGET (HTTP 422)`.

3. **Validation Logistique des Transferts** :
   - Transfert direct autorisé uniquement si une ligne existe dans `DISTRICT_ADJACENCY` entre les deux quartiers avec `is_blocked = FALSE`.
   - Si les quartiers ne sont pas adjacents, un quartier de transit (obligatoirement `Xeno`) doit être désigné et la demande passe en statut `transit_approval_status = 'PENDING'`.
   - Si la route est `SEA`, le temps estimé de transit est doublé par rapport à la liaison terrestre équivalente.

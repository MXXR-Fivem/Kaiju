# Diagramme entité-association

```mermaid
erDiagram
    districts ||--o{ adjacencies : "a pour voisin"
    districts ||--o{ stocks : détient
    resource_types ||--o{ stocks : "est stockée"
    districts |o--o{ users : "rattache (QC)"
    districts ||--o{ disasters : subit
    users ||--o{ transfers : demande
    districts ||--o{ transfers : "source, cible, transit"
    resource_types ||--o{ transfers : concerne
    stocks ||--o{ reservations : bloque
    users ||--o{ reservations : crée

    districts {
        TEXT code PK
        TEXT name
        BOOLEAN is_coastal
        REAL latitude
        REAL longitude
        INTEGER disaster_level
    }
    adjacencies {
        TEXT district_code PK, FK
        TEXT neighbor_code PK, FK
    }
    resource_types {
        TEXT code PK
        TEXT name
    }
    stocks {
        TEXT district_code PK, FK
        TEXT resource_code PK, FK
        INTEGER initial_quantity
        INTEGER current_quantity
        INTEGER reserved_quantity
        INTEGER retention_pct
    }
    users {
        TEXT id PK
        TEXT username UK
        TEXT password_hash
        TEXT role
        TEXT district_code FK
        DATETIME created_at
    }
    disasters {
        TEXT id PK
        TEXT district_code FK
        TEXT disaster_type
        INTEGER level
        BOOLEAN active
        DATETIME triggered_at
        DATETIME resolved_at
    }
    transfers {
        TEXT id PK
        TEXT requester_id FK
        TEXT source_code FK
        TEXT target_code FK
        TEXT transit_code FK
        TEXT resource_code FK
        INTEGER quantity
        TEXT route
        BOOLEAN is_requisition
        BOOLEAN source_approved
        BOOLEAN transit_approved
        TEXT status
        INTEGER duration_minutes
        DATETIME created_at
        DATETIME departed_at
        DATETIME arrival_at
        DATETIME delivered_at
    }
    reservations {
        TEXT id PK
        TEXT district_code FK
        TEXT resource_code FK
        TEXT user_id FK
        TEXT team_name
        INTEGER quantity
        DATETIME starts_at
        DATETIME ends_at
        TEXT status
        DATETIME created_at
    }
```

- `adjacencies` reprend la matrice d'adjacence terrestre (deux lignes par liaison) ; l'accès maritime vient de `districts.is_coastal`.
- Seuil de rétention d'un stock : `ceil(initial_quantity × retention_pct / 100)`.
- Schéma et données initiales : [`backend/migrations`](../../backend/migrations).

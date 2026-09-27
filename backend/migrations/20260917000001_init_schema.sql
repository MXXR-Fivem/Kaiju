PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS districts (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_coastal BOOLEAN NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    disaster_level INTEGER NOT NULL DEFAULT 1 CHECK (disaster_level BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS adjacencies (
    district_code TEXT NOT NULL REFERENCES districts(code),
    neighbor_code TEXT NOT NULL REFERENCES districts(code),
    PRIMARY KEY (district_code, neighbor_code)
);

CREATE TABLE IF NOT EXISTS resource_types (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stocks (
    district_code TEXT NOT NULL REFERENCES districts(code),
    resource_code TEXT NOT NULL REFERENCES resource_types(code),
    initial_quantity INTEGER NOT NULL CHECK (initial_quantity >= 0),
    current_quantity INTEGER NOT NULL CHECK (current_quantity >= 0),
    reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    retention_pct INTEGER NOT NULL DEFAULT 30 CHECK (retention_pct IN (15, 30)),
    PRIMARY KEY (district_code, resource_code)
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('QC', 'LC', 'CD')),
    district_code TEXT REFERENCES districts(code),
    created_at DATETIME NOT NULL,
    CHECK ((role = 'QC') = (district_code IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS disasters (
    id TEXT PRIMARY KEY,
    district_code TEXT NOT NULL REFERENCES districts(code),
    disaster_type TEXT NOT NULL CHECK (disaster_type IN ('EARTHQUAKE', 'TSUNAMI', 'TORNADO')),
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
    active BOOLEAN NOT NULL,
    triggered_at DATETIME NOT NULL,
    resolved_at DATETIME
);

CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY,
    requester_id TEXT NOT NULL REFERENCES users(id),
    source_code TEXT NOT NULL REFERENCES districts(code),
    target_code TEXT NOT NULL REFERENCES districts(code),
    transit_code TEXT REFERENCES districts(code),
    resource_code TEXT NOT NULL REFERENCES resource_types(code),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    route TEXT NOT NULL CHECK (route IN ('LAND', 'SEA')),
    is_requisition BOOLEAN NOT NULL,
    source_approved BOOLEAN NOT NULL,
    transit_approved BOOLEAN,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'IN_TRANSIT', 'DELIVERED', 'REJECTED')),
    duration_minutes INTEGER NOT NULL,
    created_at DATETIME NOT NULL,
    departed_at DATETIME,
    arrival_at DATETIME,
    delivered_at DATETIME
);

CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    district_code TEXT NOT NULL,
    resource_code TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id),
    team_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    starts_at DATETIME NOT NULL,
    ends_at DATETIME NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'RETURNED')),
    created_at DATETIME NOT NULL,
    FOREIGN KEY (district_code, resource_code) REFERENCES stocks(district_code, resource_code)
);

INSERT OR IGNORE INTO districts (code, name, is_coastal, latitude, longitude) VALUES
('A', 'Apex', 0, 35.75451, 139.59934),
('E', 'Echo', 1, 35.74488, 139.85016),
('W', 'Warden', 0, 35.64377, 139.6141),
('X', 'Xeno', 1, 35.69111, 139.76262),
('Z', 'Zion', 1, 35.5579, 139.71246);

INSERT OR IGNORE INTO adjacencies (district_code, neighbor_code) VALUES
('A', 'E'), ('E', 'A'),
('A', 'W'), ('W', 'A'),
('A', 'X'), ('X', 'A'),
('E', 'X'), ('X', 'E'),
('W', 'X'), ('X', 'W'),
('W', 'Z'), ('Z', 'W'),
('X', 'Z'), ('Z', 'X');

INSERT OR IGNORE INTO resource_types (code, name) VALUES
('MEDICAL', 'Personnel médical'),
('RESCUE', 'Équipes de secours'),
('TRANSPORT', 'Véhicules de transport'),
('SHELTERS', 'Abris d''urgence'),
('FOOD_WATER', 'Vivres et eau'),
('COMMUNICATION', 'Équipement de communication'),
('POWER', 'Générateurs électriques'),
('ENGINEERING', 'Équipes du génie'),
('SECURITY', 'Unités de sécurité'),
('HAZMAT', 'Équipement NRBC');

INSERT OR IGNORE INTO stocks (district_code, resource_code, initial_quantity, current_quantity)
SELECT column1, column2, column3, column3 FROM (VALUES
('A', 'MEDICAL', 12), ('E', 'MEDICAL', 5), ('W', 'MEDICAL', 8), ('X', 'MEDICAL', 3), ('Z', 'MEDICAL', 7),
('A', 'RESCUE', 4), ('E', 'RESCUE', 9), ('W', 'RESCUE', 3), ('X', 'RESCUE', 6), ('Z', 'RESCUE', 5),
('A', 'TRANSPORT', 6), ('E', 'TRANSPORT', 3), ('W', 'TRANSPORT', 10), ('X', 'TRANSPORT', 4), ('Z', 'TRANSPORT', 7),
('A', 'SHELTERS', 8), ('E', 'SHELTERS', 6), ('W', 'SHELTERS', 4), ('X', 'SHELTERS', 10), ('Z', 'SHELTERS', 2),
('A', 'FOOD_WATER', 5), ('E', 'FOOD_WATER', 8), ('W', 'FOOD_WATER', 6), ('X', 'FOOD_WATER', 7), ('Z', 'FOOD_WATER', 9),
('A', 'COMMUNICATION', 3), ('E', 'COMMUNICATION', 7), ('W', 'COMMUNICATION', 5), ('X', 'COMMUNICATION', 8), ('Z', 'COMMUNICATION', 4),
('A', 'POWER', 7), ('E', 'POWER', 2), ('W', 'POWER', 9), ('X', 'POWER', 5), ('Z', 'POWER', 6),
('A', 'ENGINEERING', 2), ('E', 'ENGINEERING', 6), ('W', 'ENGINEERING', 7), ('X', 'ENGINEERING', 4), ('Z', 'ENGINEERING', 8),
('A', 'SECURITY', 9), ('E', 'SECURITY', 4), ('W', 'SECURITY', 2), ('X', 'SECURITY', 6), ('Z', 'SECURITY', 3),
('A', 'HAZMAT', 3), ('E', 'HAZMAT', 5), ('W', 'HAZMAT', 4), ('X', 'HAZMAT', 2), ('Z', 'HAZMAT', 10)
);

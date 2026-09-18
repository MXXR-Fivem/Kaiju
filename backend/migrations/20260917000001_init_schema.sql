-- =============================================================================
-- KAIJU - Crisis Manager : Schéma Initial SQLite & Seed Data
-- =============================================================================

PRAGMA foreign_keys = ON;

-- 1. Table des Quartiers de Tokyork
CREATE TABLE IF NOT EXISTS districts (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_coastal BOOLEAN NOT NULL DEFAULT 0,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    polygon_bounds_json TEXT NOT NULL,
    current_disaster_level INTEGER NOT NULL DEFAULT 1 CHECK (current_disaster_level BETWEEN 1 AND 5),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Adjacences et Routes entre Quartiers (Terrestre / Maritime)
CREATE TABLE IF NOT EXISTS district_adjacencies (
    id TEXT PRIMARY KEY,
    from_district_id TEXT NOT NULL,
    to_district_id TEXT NOT NULL,
    route_type TEXT NOT NULL CHECK (route_type IN ('LAND', 'SEA')),
    base_transit_minutes INTEGER NOT NULL DEFAULT 30,
    is_blocked BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (from_district_id) REFERENCES districts(id) ON DELETE CASCADE,
    FOREIGN KEY (to_district_id) REFERENCES districts(id) ON DELETE CASCADE,
    UNIQUE(from_district_id, to_district_id, route_type)
);

-- 3. Référentiel des 10 Ressources Critiques
CREATE TABLE IF NOT EXISTS resource_types (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    unit TEXT NOT NULL,
    is_critical BOOLEAN NOT NULL DEFAULT 1
);

-- 4. Stocks et Règles de Rétention par Quartier
CREATE TABLE IF NOT EXISTS district_resources (
    id TEXT PRIMARY KEY,
    district_id TEXT NOT NULL,
    resource_type_id TEXT NOT NULL,
    initial_quantity INTEGER NOT NULL CHECK (initial_quantity >= 0),
    current_quantity INTEGER NOT NULL CHECK (current_quantity >= 0),
    reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    min_retention_pct REAL NOT NULL DEFAULT 0.30 CHECK (min_retention_pct >= 0.15 AND min_retention_pct <= 1.0),
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE CASCADE,
    FOREIGN KEY (resource_type_id) REFERENCES resource_types(id) ON DELETE CASCADE,
    UNIQUE(district_id, resource_type_id)
);

-- 5. Utilisateurs Opérationnels et Rôles
CREATE TABLE IF NOT EXISTS user_accounts (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('QC', 'LC', 'CD')),
    assigned_district_id TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_district_id) REFERENCES districts(id) ON DELETE SET NULL
);

-- 6. Événements et Déclenchements de Catastrophes
CREATE TABLE IF NOT EXISTS disaster_events (
    id TEXT PRIMARY KEY,
    district_id TEXT NOT NULL,
    disaster_type TEXT NOT NULL CHECK (disaster_type IN ('EARTHQUAKE', 'TSUNAMI', 'TORNADO')),
    intensity INTEGER NOT NULL CHECK (intensity BETWEEN 1 AND 100),
    calculated_level INTEGER NOT NULL CHECK (calculated_level BETWEEN 1 AND 5),
    is_active BOOLEAN NOT NULL DEFAULT 1,
    triggered_by TEXT NOT NULL DEFAULT 'SYSTEM',
    triggered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE CASCADE
);

-- 7. Demandes de Transfert de Ressources
CREATE TABLE IF NOT EXISTS transfer_requests (
    id TEXT PRIMARY KEY,
    requester_id TEXT NOT NULL,
    source_district_id TEXT NOT NULL,
    target_district_id TEXT NOT NULL,
    resource_type_id TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    route_type TEXT NOT NULL CHECK (route_type IN ('LAND', 'SEA')),
    transit_district_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'IN_TRANSIT', 'DELIVERED', 'REJECTED', 'CANCELLED')),
    transit_approval_status TEXT NOT NULL DEFAULT 'NONE' CHECK (transit_approval_status IN ('NONE', 'PENDING', 'APPROVED', 'REJECTED')),
    estimated_duration_minutes INTEGER NOT NULL,
    departed_at DATETIME,
    estimated_arrival_at DATETIME,
    delivered_at DATETIME,
    rejection_reason TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES user_accounts(id),
    FOREIGN KEY (source_district_id) REFERENCES districts(id),
    FOREIGN KEY (target_district_id) REFERENCES districts(id),
    FOREIGN KEY (transit_district_id) REFERENCES districts(id),
    FOREIGN KEY (resource_type_id) REFERENCES resource_types(id)
);

-- 8. Réservations Locales de Ressources (Intra-quartier)
CREATE TABLE IF NOT EXISTS resource_reservations (
    id TEXT PRIMARY KEY,
    district_id TEXT NOT NULL,
    resource_type_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    team_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RELEASED', 'CONSUMED')),
    expires_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (district_id) REFERENCES districts(id),
    FOREIGN KEY (resource_type_id) REFERENCES resource_types(id),
    FOREIGN KEY (user_id) REFERENCES user_accounts(id)
);

-- 9. Journal d'Audit et Historique des Événements
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    district_id TEXT,
    payload_json TEXT NOT NULL DEFAULT '{}',
    ip_address TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SEED DATA : 5 Quartiers de Tokyork
-- =============================================================================

INSERT OR IGNORE INTO districts (id, code, name, is_coastal, latitude, longitude, polygon_bounds_json, current_disaster_level) VALUES
('dist_apex', 'A', 'Apex Sector (North Enclave)', 0, 35.7367, 139.6124, '[[35.79069, 139.60334], [35.78952, 139.64845], [35.77509, 139.65085], [35.77158, 139.67965], [35.75247, 139.719], [35.73219, 139.71517], [35.73024, 139.68685], [35.7162, 139.65853], [35.70333, 139.65613], [35.66511, 139.69213], [35.68305, 139.67629], [35.6772, 139.66957], [35.68812, 139.63118], [35.69046, 139.56783], [35.68617, 139.55343], [35.66511, 139.55295], [35.70177, 139.55631], [35.72634, 139.51503], [35.74857, 139.51695], [35.77041, 139.54143], [35.78211, 139.57406], [35.77704, 139.5923], [35.7903, 139.60286]]', 1),
('dist_echo', 'E', 'Echo Harbor (Eastern Bay)', 1, 35.7390, 139.8396, '[[35.82618, 139.81019], [35.81253, 139.82507], [35.8137, 139.86347], [35.79966, 139.8697], [35.79225, 139.90954], [35.78016, 139.90234], [35.75442, 139.91626], [35.74896, 139.91098], [35.74233, 139.93018], [35.73414, 139.92346], [35.71503, 139.9321], [35.70957, 139.94889], [35.69007, 139.95897], [35.67057, 139.95897], [35.66511, 139.93642], [35.6538, 139.95849], [35.62884, 139.90954], [35.63742, 139.88506], [35.65068, 139.87642], [35.64483, 139.87498], [35.65029, 139.85963], [35.6538, 139.87354], [35.66316, 139.87642], [35.66394, 139.86155], [35.65731, 139.85723], [35.69319, 139.84283], [35.68929, 139.85819], [35.70294, 139.85243], [35.72166, 139.8913], [35.73492, 139.88938], [35.74545, 139.9033], [35.73531, 139.88362], [35.72283, 139.88602], [35.70372, 139.84715], [35.69475, 139.84955], [35.72634, 139.78956], [35.7435, 139.72764], [35.76066, 139.71373], [35.7708, 139.69117], [35.77782, 139.65277], [35.7903, 139.65181], [35.79498, 139.68205], [35.78952, 139.77852], [35.81916, 139.7742], [35.82579, 139.80971]]', 1),
('dist_warden', 'W', 'Warden Fort (West Industrial)', 0, 35.6334, 139.6213, '[[35.68812, 139.55775], [35.68578, 139.62974], [35.67447, 139.67005], [35.68266, 139.67725], [35.64405, 139.70557], [35.62455, 139.68781], [35.61831, 139.69597], [35.60271, 139.69405], [35.59998, 139.66525], [35.58906, 139.64749], [35.5641, 139.6403], [35.56488, 139.6235], [35.58633, 139.5947], [35.59686, 139.55583], [35.61792, 139.54767], [35.63508, 139.55631], [35.68773, 139.55727]]', 1),
('dist_xeno', 'X', 'Xeno Central Nexus (Hub & Bay)', 1, 35.6854, 139.7545, '[[35.74116, 139.7262], [35.70879, 139.80395], [35.6967, 139.78524], [35.68578, 139.78284], [35.69709, 139.80539], [35.70606, 139.80683], [35.69982, 139.82363], [35.66277, 139.84955], [35.64327, 139.84715], [35.6421, 139.77612], [35.64834, 139.77132], [35.65887, 139.78716], [35.6772, 139.791], [35.68578, 139.7814], [35.67135, 139.779], [35.6655, 139.75548], [35.63664, 139.73964], [35.65146, 139.69837], [35.66199, 139.70125], [35.69982, 139.66237], [35.71542, 139.66141], [35.73219, 139.70413], [35.72946, 139.71565], [35.74077, 139.72572]]', 1),
('dist_zion', 'Z', 'Zion Coast (Southern Bay)', 1, 35.5619, 139.7332, '[[35.64483, 139.74636], [35.62416, 139.743], [35.5836, 139.77132], [35.57931, 139.76268], [35.57658, 139.78188], [35.56059, 139.74972], [35.55591, 139.78908], [35.5173, 139.82075], [35.50287, 139.80395], [35.49702, 139.7766], [35.50365, 139.72236], [35.49507, 139.69501], [35.5017, 139.68301], [35.49273, 139.67965], [35.49897, 139.66909], [35.52042, 139.67005], [35.55786, 139.62734], [35.56683, 139.64941], [35.58438, 139.64749], [35.59452, 139.66333], [35.60232, 139.69837], [35.63352, 139.69645], [35.6421, 139.70941], [35.63352, 139.73436], [35.63937, 139.74828], [35.64444, 139.74588]]', 1);

INSERT OR IGNORE INTO district_adjacencies (id, from_district_id, to_district_id, route_type, base_transit_minutes, is_blocked) VALUES
('adj_A_X_land', 'dist_apex', 'dist_xeno', 'LAND', 30, 0),
('adj_X_A_land', 'dist_xeno', 'dist_apex', 'LAND', 30, 0),
('adj_W_X_land', 'dist_warden', 'dist_xeno', 'LAND', 35, 0),
('adj_X_W_land', 'dist_xeno', 'dist_warden', 'LAND', 35, 0),
('adj_E_X_land', 'dist_echo', 'dist_xeno', 'LAND', 40, 0),
('adj_X_E_land', 'dist_xeno', 'dist_echo', 'LAND', 40, 0),
('adj_Z_X_land', 'dist_zion', 'dist_xeno', 'LAND', 35, 0),
('adj_X_Z_land', 'dist_xeno', 'dist_zion', 'LAND', 35, 0),
('adj_A_W_land', 'dist_apex', 'dist_warden', 'LAND', 45, 0),
('adj_W_A_land', 'dist_warden', 'dist_apex', 'LAND', 45, 0),
('adj_A_E_land', 'dist_apex', 'dist_echo', 'LAND', 40, 0),
('adj_E_A_land', 'dist_echo', 'dist_apex', 'LAND', 40, 0),
('adj_W_Z_land', 'dist_warden', 'dist_zion', 'LAND', 40, 0),
('adj_Z_W_land', 'dist_zion', 'dist_warden', 'LAND', 40, 0);

-- Liaisons Maritimes (Temps Doublé: 60 à 80 minutes)
INSERT OR IGNORE INTO district_adjacencies (id, from_district_id, to_district_id, route_type, base_transit_minutes, is_blocked) VALUES
-- Echo <-> Xeno (Maritime)
('adj_E_X_sea', 'dist_echo', 'dist_xeno', 'SEA', 80, 0),
('adj_X_E_sea', 'dist_xeno', 'dist_echo', 'SEA', 80, 0),

-- Xeno <-> Zion (Maritime)
('adj_X_Z_sea', 'dist_xeno', 'dist_zion', 'SEA', 70, 0),
('adj_Z_X_sea', 'dist_zion', 'dist_xeno', 'SEA', 70, 0),

-- Echo <-> Zion (Maritime direct baie)
('adj_E_Z_sea', 'dist_echo', 'dist_zion', 'SEA', 90, 0),
('adj_Z_E_sea', 'dist_zion', 'dist_echo', 'SEA', 90, 0);

-- =============================================================================
-- SEED DATA : 10 Ressources Stratégiques
-- =============================================================================

INSERT OR IGNORE INTO resource_types (id, code, name, description, unit, is_critical) VALUES
('res_water', 'WATER', 'Eau Potable', 'Réserves d''eau potable d''urgence', 'Litres', 1),
('res_food', 'FOOD', 'Rations Alimentaires', 'Packs de rations de survie longue conservation', 'Rations', 1),
('res_medkit', 'MED_KIT', 'Kits Médicaux', 'Kits complets de soins d''urgence et chirurgie de terrain', 'Unités', 1),
('res_generator', 'GENERATOR', 'Générateurs Mobiles', 'Groupes électrogènes autonomes diesel de secours', 'Unités', 1),
('res_fuel', 'FUEL', 'Carburant', 'Carburant opérationnel raffiné (diesel / essence)', 'Litres', 1),
('res_shelter', 'SHELTER', 'Modules d''Abris', 'Modules et tentes d''hébergement d''urgence étanches', 'Unités', 1),
('res_medic', 'MEDIC', 'Équipes Médicales', 'Brigades médicales mobiles d''urgence et urgentistes', 'Équipes', 1),
('res_atv', 'ATV', 'Véhicules Tout-Terrain', 'Véhicules d''intervention 4x4 tout-terrain et amphibies', 'Véhicules', 1),
('res_clearing', 'CLEARING_GEAR', 'Engins de Déblaiement', 'Pelleteuses compactes et matériel de perforation de ruines', 'Unités', 1),
('res_purifier', 'WATER_PURIFIER', 'Unités de Purification', 'Stations mobiles de désalinisation et filtration bactériologique', 'Unités', 1);

-- =============================================================================
-- SEED DATA : Stocks Initiaux des 10 Ressources sur les 5 Quartiers
-- =============================================================================

-- Apex (A) : Dominance abris et purification
INSERT OR IGNORE INTO district_resources (id, district_id, resource_type_id, initial_quantity, current_quantity, reserved_quantity, min_retention_pct) VALUES
('dr_A_water', 'dist_apex', 'res_water', 15000, 15000, 0, 0.30),
('dr_A_food', 'dist_apex', 'res_food', 12000, 12000, 0, 0.30),
('dr_A_medkit', 'dist_apex', 'res_medkit', 600, 600, 0, 0.30),
('dr_A_gen', 'dist_apex', 'res_generator', 45, 45, 0, 0.30),
('dr_A_fuel', 'dist_apex', 'res_fuel', 8000, 8000, 0, 0.30),
('dr_A_shelter', 'dist_apex', 'res_shelter', 800, 800, 0, 0.30),
('dr_A_medic', 'dist_apex', 'res_medic', 25, 25, 0, 0.30),
('dr_A_atv', 'dist_apex', 'res_atv', 30, 30, 0, 0.30),
('dr_A_clearing', 'dist_apex', 'res_clearing', 15, 15, 0, 0.30),
('dr_A_purifier', 'dist_apex', 'res_purifier', 10, 10, 0, 0.30);

-- Echo (E) : Port, réserves d'eau et alimentation
INSERT OR IGNORE INTO district_resources (id, district_id, resource_type_id, initial_quantity, current_quantity, reserved_quantity, min_retention_pct) VALUES
('dr_E_water', 'dist_echo', 'res_water', 35000, 35000, 0, 0.30),
('dr_E_food', 'dist_echo', 'res_food', 28000, 28000, 0, 0.30),
('dr_E_medkit', 'dist_echo', 'res_medkit', 850, 850, 0, 0.30),
('dr_E_gen', 'dist_echo', 'res_generator', 60, 60, 0, 0.30),
('dr_E_fuel', 'dist_echo', 'res_fuel', 22000, 22000, 0, 0.30),
('dr_E_shelter', 'dist_echo', 'res_shelter', 400, 400, 0, 0.30),
('dr_E_medic', 'dist_echo', 'res_medic', 30, 30, 0, 0.30),
('dr_E_atv', 'dist_echo', 'res_atv', 20, 20, 0, 0.30),
('dr_E_clearing', 'dist_echo', 'res_clearing', 25, 25, 0, 0.30),
('dr_E_purifier', 'dist_echo', 'res_purifier', 18, 18, 0, 0.30);

-- Warden (W) : Industrie lourde, carburant, véhicules, déblaiement
INSERT OR IGNORE INTO district_resources (id, district_id, resource_type_id, initial_quantity, current_quantity, reserved_quantity, min_retention_pct) VALUES
('dr_W_water', 'dist_warden', 'res_water', 18000, 18000, 0, 0.30),
('dr_W_food', 'dist_warden', 'res_food', 14000, 14000, 0, 0.30),
('dr_W_medkit', 'dist_warden', 'res_medkit', 700, 700, 0, 0.30),
('dr_W_gen', 'dist_warden', 'res_generator', 90, 90, 0, 0.30),
('dr_W_fuel', 'dist_warden', 'res_fuel', 45000, 45000, 0, 0.30),
('dr_W_shelter', 'dist_warden', 'res_shelter', 350, 350, 0, 0.30),
('dr_W_medic', 'dist_warden', 'res_medic', 20, 20, 0, 0.30),
('dr_W_atv', 'dist_warden', 'res_atv', 60, 60, 0, 0.30),
('dr_W_clearing', 'dist_warden', 'res_clearing', 40, 40, 0, 0.30),
('dr_W_purifier', 'dist_warden', 'res_purifier', 8, 8, 0, 0.30);

-- Xeno (X) : Carrefour central, hub logistique médical et polyvalent
INSERT OR IGNORE INTO district_resources (id, district_id, resource_type_id, initial_quantity, current_quantity, reserved_quantity, min_retention_pct) VALUES
('dr_X_water', 'dist_xeno', 'res_water', 30000, 30000, 0, 0.30),
('dr_X_food', 'dist_xeno', 'res_food', 25000, 25000, 0, 0.30),
('dr_X_medkit', 'dist_xeno', 'res_medkit', 1500, 1500, 0, 0.30),
('dr_X_gen', 'dist_xeno', 'res_generator', 110, 110, 0, 0.30),
('dr_X_fuel', 'dist_xeno', 'res_fuel', 30000, 30000, 0, 0.30),
('dr_X_shelter', 'dist_xeno', 'res_shelter', 600, 600, 0, 0.30),
('dr_X_medic', 'dist_xeno', 'res_medic', 60, 60, 0, 0.30),
('dr_X_atv', 'dist_xeno', 'res_atv', 50, 50, 0, 0.30),
('dr_X_clearing', 'dist_xeno', 'res_clearing', 30, 30, 0, 0.30),
('dr_X_purifier', 'dist_xeno', 'res_purifier', 15, 15, 0, 0.30);

-- Zion (Z) : Hôpital côtier et hébergement
INSERT OR IGNORE INTO district_resources (id, district_id, resource_type_id, initial_quantity, current_quantity, reserved_quantity, min_retention_pct) VALUES
('dr_Z_water', 'dist_zion', 'res_water', 22000, 22000, 0, 0.30),
('dr_Z_food', 'dist_zion', 'res_food', 20000, 20000, 0, 0.30),
('dr_Z_medkit', 'dist_zion', 'res_medkit', 1100, 1100, 0, 0.30),
('dr_Z_gen', 'dist_zion', 'res_generator', 70, 70, 0, 0.30),
('dr_Z_fuel', 'dist_zion', 'res_fuel', 18000, 18000, 0, 0.30),
('dr_Z_shelter', 'dist_zion', 'res_shelter', 750, 750, 0, 0.30),
('dr_Z_medic', 'dist_zion', 'res_medic', 45, 45, 0, 0.30),
('dr_Z_atv', 'dist_zion', 'res_atv', 35, 35, 0, 0.30),
('dr_Z_clearing', 'dist_zion', 'res_clearing', 20, 20, 0, 0.30),
('dr_Z_purifier', 'dist_zion', 'res_purifier', 22, 22, 0, 0.30);

-- =============================================================================
-- SEED DATA : Comptes Opérationnels par Défaut
-- =============================================================================

-- Passwords hashés ou de crise (ex: kaiju2026 / direct access)
INSERT OR IGNORE INTO user_accounts (id, username, password_hash, display_name, role, assigned_district_id) VALUES
('user_cd', 'director', 'kaiju_director_secure', 'Cmdt. Vance (City Director)', 'CD', NULL),
('user_lc', 'logistics', 'kaiju_logistics_secure', 'Maj. Thorne (Logistics Coordinator)', 'LC', NULL),
('user_qc_a', 'coord_apex', 'coord_apex_secure', 'Capt. Reyes (QC Apex)', 'QC', 'dist_apex'),
('user_qc_e', 'coord_echo', 'coord_echo_secure', 'Lt. Chen (QC Echo)', 'QC', 'dist_echo'),
('user_qc_w', 'coord_warden', 'coord_warden_secure', 'Sgt. Kowalski (QC Warden)', 'QC', 'dist_warden'),
('user_qc_x', 'coord_xeno', 'coord_xeno_secure', 'Capt. Mori (QC Xeno)', 'QC', 'dist_xeno'),
('user_qc_z', 'coord_zion', 'coord_zion_secure', 'Dr. Al-Mansoor (QC Zion)', 'QC', 'dist_zion');

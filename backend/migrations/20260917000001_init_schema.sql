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
('dist_apex', 'A', 'Apex Sector (North Enclave)', 0, 35.7471, 139.6075, '[[35.68089, 139.68533], [35.68244, 139.67961], [35.69178, 139.6758], [35.68556, 139.66246], [35.68711, 139.64912], [35.69644, 139.63006], [35.69644, 139.55574], [35.70267, 139.55002], [35.71044, 139.55383], [35.71822, 139.5443], [35.73378, 139.51], [35.73844, 139.51572], [35.76022, 139.51381], [35.78044, 139.53668], [35.79289, 139.57098], [35.78822, 139.59195], [35.79911, 139.59385], [35.80222, 139.60148], [35.80067, 139.6415], [35.78978, 139.64721], [35.78511, 139.65102], [35.78044, 139.66055], [35.77889, 139.68152], [35.76956, 139.69676], [35.768, 139.7082], [35.75244, 139.71963], [35.74467, 139.71201], [35.74, 139.68533], [35.72444, 139.65674], [35.70733, 139.65674], [35.69333, 139.67008], [35.69333, 139.67961], [35.68867, 139.68533], [35.68089, 139.68533], [35.68244, 139.67961], [35.69178, 139.6758], [35.68556, 139.66246], [35.68711, 139.64912], [35.69644, 139.63006], [35.69644, 139.55574], [35.70267, 139.55002]]', 1),
('dist_echo', 'E', 'Echo Harbor (Eastern Bay)', 1, 35.7511, 139.8391, '[[35.838, 139.81111], [35.83178, 139.82254], [35.82244, 139.82254], [35.82556, 139.86447], [35.81622, 139.86256], [35.81, 139.86828], [35.81311, 139.87781], [35.80689, 139.88924], [35.80844, 139.91402], [35.80378, 139.91402], [35.79444, 139.90258], [35.78667, 139.90258], [35.77578, 139.91783], [35.76333, 139.91783], [35.754, 139.92926], [35.74778, 139.92926], [35.74311, 139.92355], [35.73844, 139.93117], [35.72444, 139.93117], [35.71822, 139.93879], [35.71667, 139.95213], [35.70578, 139.96547], [35.70422, 139.975], [35.70422, 139.97119], [35.70578, 139.95975], [35.71511, 139.94832], [35.70889, 139.94832], [35.70111, 139.95785], [35.684, 139.95594], [35.67778, 139.95975], [35.67778, 139.9407], [35.67311, 139.93879], [35.67, 139.94451], [35.67156, 139.95594], [35.66067, 139.95785], [35.65444, 139.94451], [35.64978, 139.94451], [35.64511, 139.92545], [35.63578, 139.9083], [35.64511, 139.87781], [35.65133, 139.87781], [35.65133, 139.85875], [35.65911, 139.85303], [35.66378, 139.85684], [35.66378, 139.85113], [35.67467, 139.85303], [35.67467, 139.84922], [35.67778, 139.84732], [35.69489, 139.83969], [35.69644, 139.83969], [35.69956, 139.83779], [35.698, 139.83779], [35.69956, 139.83588], [35.69956, 139.83779], [35.70111, 139.83588], [35.70889, 139.83398], [35.71511, 139.82635], [35.71356, 139.82254], [35.712, 139.81492], [35.73067, 139.79014], [35.73378, 139.76918], [35.74622, 139.75012], [35.74622, 139.73488], [35.75089, 139.72725], [35.75089, 139.72535], [35.75244, 139.71963], [35.768, 139.7082], [35.76956, 139.69676], [35.77889, 139.68152], [35.78044, 139.66055], [35.78511, 139.65102], [35.78978, 139.64721], [35.80067, 139.6415], [35.80533, 139.67199], [35.80533, 139.72916], [35.80067, 139.73107], [35.80067, 139.7749], [35.81622, 139.7749], [35.83022, 139.76918], [35.82867, 139.78061], [35.83333, 139.78443], [35.838, 139.8073], [35.83178, 139.82254], [35.82244, 139.82254], [35.82556, 139.86447], [35.81622, 139.86256], [35.81, 139.86828], [35.81311, 139.87781], [35.80689, 139.88924], [35.80844, 139.91402], [35.80378, 139.91402], [35.79444, 139.90258], [35.78667, 139.90258], [35.77578, 139.91783], [35.76333, 139.91783], [35.754, 139.92926], [35.74778, 139.92926], [35.74311, 139.92355], [35.73844, 139.93117], [35.72444, 139.93117], [35.71822, 139.93879], [35.71667, 139.95213], [35.70578, 139.96547], [35.70422, 139.975]]', 1),
('dist_warden', 'W', 'Warden Fort (West Industrial)', 0, 35.6378, 139.6099, '[[35.57044, 139.62244], [35.58289, 139.6091], [35.59844, 139.5748], [35.60156, 139.54049], [35.59378, 139.52906], [35.586, 139.52906], [35.586, 139.52334], [35.59533, 139.52525], [35.60467, 139.53859], [35.60311, 139.54621], [35.60622, 139.55002], [35.62489, 139.53859], [35.63267, 139.54049], [35.63889, 139.55002], [35.67933, 139.55002], [35.68244, 139.55574], [35.698, 139.55193], [35.70267, 139.55002], [35.69644, 139.55574], [35.69644, 139.63006], [35.68711, 139.64912], [35.68556, 139.66246], [35.69178, 139.6758], [35.68244, 139.67961], [35.68089, 139.68533], [35.67, 139.69486], [35.65911, 139.69486], [35.65289, 139.70629], [35.64356, 139.70057], [35.642, 139.69486], [35.64044, 139.69486], [35.63578, 139.68914], [35.63111, 139.68914], [35.62956, 139.69676], [35.62489, 139.69295], [35.61089, 139.69486], [35.60933, 139.68152], [35.60467, 139.6758], [35.60622, 139.66055], [35.59844, 139.65865], [35.59378, 139.6434], [35.58911, 139.6434], [35.586, 139.64912], [35.58289, 139.64531], [35.57667, 139.64721], [35.572, 139.6415], [35.57356, 139.62625], [35.57044, 139.62244], [35.58289, 139.6091], [35.59844, 139.5748], [35.60156, 139.54049], [35.59378, 139.52906], [35.586, 139.52906], [35.586, 139.52334], [35.59533, 139.52525], [35.60467, 139.53859], [35.60311, 139.54621], [35.60622, 139.55002], [35.62489, 139.53859], [35.63267, 139.54049], [35.63889, 139.55002], [35.67933, 139.55002]]', 1),
('dist_xeno', 'X', 'Xeno Central Nexus (Hub & Bay)', 1, 35.6975, 139.7440, '[[35.68089, 139.68533], [35.68867, 139.68533], [35.69333, 139.67961], [35.69333, 139.67008], [35.70733, 139.65674], [35.72444, 139.65674], [35.74, 139.68533], [35.74467, 139.71201], [35.75244, 139.71963], [35.75089, 139.72535], [35.75089, 139.72725], [35.74622, 139.73488], [35.74622, 139.75012], [35.73378, 139.76918], [35.73067, 139.79014], [35.712, 139.81492], [35.71356, 139.82254], [35.70111, 139.83588], [35.69956, 139.83588], [35.698, 139.83779], [35.69644, 139.83969], [35.69489, 139.83969], [35.67778, 139.84732], [35.67467, 139.84922], [35.64978, 139.84732], [35.64978, 139.8092], [35.65444, 139.8092], [35.65444, 139.79967], [35.656, 139.79777], [35.65444, 139.79777], [35.65289, 139.79967], [35.64511, 139.80348], [35.642, 139.79586], [35.63267, 139.79777], [35.63733, 139.78633], [35.64356, 139.78443], [35.642, 139.78061], [35.64356, 139.78061], [35.64511, 139.78061], [35.65133, 139.77871], [35.64822, 139.77299], [35.65911, 139.76537], [35.66844, 139.78252], [35.67, 139.77871], [35.67933, 139.77871], [35.67778, 139.76918], [35.67156, 139.76346], [35.67467, 139.75584], [35.656, 139.75012], [35.656, 139.74441], [35.64822, 139.74822], [35.64822, 139.74441], [35.64978, 139.74441], [35.64822, 139.74441], [35.642, 139.73678], [35.64667, 139.71582], [35.65289, 139.70629], [35.65911, 139.69486], [35.67, 139.69486], [35.68089, 139.68533], [35.68867, 139.68533], [35.69333, 139.67961], [35.69333, 139.67008], [35.70733, 139.65674], [35.72444, 139.65674], [35.74, 139.68533], [35.74467, 139.71201], [35.75244, 139.71963]],
('dist_zion', 'Z', 'Zion Coast (Southern Bay)', 1, 35.5631, 139.7200, '[[35.642, 139.69486], [35.64356, 139.70057], [35.65289, 139.70629], [35.64667, 139.71582], [35.642, 139.73678], [35.63889, 139.73488], [35.64044, 139.74441], [35.63422, 139.7425], [35.63111, 139.75012], [35.61867, 139.75203], [35.59533, 139.76918], [35.586, 139.76346], [35.58756, 139.77299], [35.58911, 139.7768], [35.58444, 139.78061], [35.57822, 139.75584], [35.56889, 139.74822], [35.57044, 139.76156], [35.56733, 139.76346], [35.57356, 139.7768], [35.56733, 139.77299], [35.56578, 139.78824], [35.52844, 139.81873], [35.50667, 139.79586], [35.50511, 139.77871], [35.49733, 139.78824], [35.48644, 139.78824], [35.48489, 139.78633], [35.48644, 139.78824], [35.48956, 139.78633], [35.49889, 139.78443], [35.50667, 139.75393], [35.51133, 139.74822], [35.50978, 139.71201], [35.502, 139.69676], [35.50356, 139.68152], [35.49889, 139.68152], [35.50511, 139.67008], [35.50356, 139.66627], [35.51911, 139.66246], [35.52844, 139.66627], [35.54089, 139.64721], [35.544, 139.64912], [35.56578, 139.62244], [35.57044, 139.62244], [35.57356, 139.62625], [35.572, 139.6415], [35.57667, 139.64721], [35.58289, 139.64531], [35.586, 139.64912], [35.58911, 139.6434], [35.59378, 139.6434], [35.59844, 139.65865], [35.60622, 139.66055], [35.60467, 139.6758], [35.60933, 139.68152], [35.61089, 139.69486], [35.62489, 139.69295], [35.62956, 139.69676], [35.63111, 139.68914], [35.63578, 139.68914], [35.64044, 139.69486], [35.642, 139.69486], [35.64356, 139.70057], [35.65289, 139.70629]]', 1);

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

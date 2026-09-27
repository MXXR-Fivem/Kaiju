export type Role = 'QC' | 'LC' | 'CD';
export type Route = 'LAND' | 'SEA';
export type TransferStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'REJECTED';
export type DisasterType = 'EARTHQUAKE' | 'TSUNAMI' | 'TORNADO';
export type Action = 'RESERVE' | 'ADJACENT_TRANSFER' | 'ORGANIZE_TRANSIT' | 'REQUISITION' | 'LOWER_RETENTION';
export type TacticalLayer = 'GLOBAL' | 'POWER' | 'SUPPLIES' | 'SHELTER' | 'MEDICAL' | 'LOGISTICS';

export interface SessionUser {
  id: string;
  username: string;
  role: Role;
  district: string | null;
  exp: number;
}

export interface Session {
  token: string;
  user: SessionUser;
}

export interface Registration {
  username: string;
  password: string;
  role: Role;
  district: string | null;
}

export interface District {
  code: string;
  name: string;
  is_coastal: boolean;
  latitude: number;
  longitude: number;
  disaster_level: number;
}

export interface Disaster {
  id: string;
  district_code: string;
  disaster_type: DisasterType;
  level: number;
  active: boolean;
  triggered_at: string;
  resolved_at: string | null;
}

export interface Stock {
  district_code: string;
  resource_code: string;
  resource_name: string;
  initial_quantity: number;
  current_quantity: number;
  reserved_quantity: number;
  retention_pct: number;
  min_retained: number;
  available: number;
  transferable: number;
}

export interface Transfer {
  id: string;
  requester_id: string;
  requester_name: string;
  source_code: string;
  target_code: string;
  transit_code: string | null;
  resource_code: string;
  resource_name: string;
  quantity: number;
  route: Route;
  is_requisition: boolean;
  source_approved: boolean;
  transit_approved: boolean | null;
  status: TransferStatus;
  duration_minutes: number;
  created_at: string;
  departed_at: string | null;
  arrival_at: string | null;
  delivered_at: string | null;
}

export interface NewTransfer {
  source: string;
  target: string;
  resource: string;
  quantity: number;
  route: Route | null;
  requisition: boolean;
}

export interface Reservation {
  id: string;
  district_code: string;
  resource_code: string;
  resource_name: string;
  user_id: string;
  username: string;
  team_name: string;
  quantity: number;
  starts_at: string;
  ends_at: string;
  status: 'ACTIVE' | 'RETURNED';
}

export interface NewReservation {
  resource: string;
  team_name: string;
  quantity: number;
  starts_at: string;
  ends_at: string;
}

export interface WsMessage {
  type: string;
  payload: any;
}

export interface TacticalAlert {
  id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: Date;
}

export const DISTRICT_CODES = ['A', 'E', 'W', 'X', 'Z'];

export const ROLE_LABELS: Record<Role, string> = {
  QC: 'Coordinateur de quartier',
  LC: 'Coordinateur logistique',
  CD: 'Directeur de la ville'
};

export const LEVEL_LABELS = ['', 'Veille', 'Alerte', 'Urgence', 'Critique', 'Catastrophe'];
export const LEVEL_COLORS = ['', '#22c55e', '#eab308', '#f97316', '#ef4444', '#d946ef'];

export const PERMISSIONS: { action: Action; label: string; rolesByLevel: Role[][] }[] = [
  { action: 'RESERVE', label: 'Réserver dans son quartier', rolesByLevel: [[], ['QC'], ['QC'], ['QC'], ['QC']] },
  { action: 'ADJACENT_TRANSFER', label: 'Demander un transfert adjacent', rolesByLevel: [[], [], ['QC'], ['QC', 'LC'], ['QC', 'LC', 'CD']] },
  { action: 'ORGANIZE_TRANSIT', label: 'Organiser un transit', rolesByLevel: [[], [], [], ['LC'], ['LC', 'CD']] },
  { action: 'REQUISITION', label: 'Réquisitionner', rolesByLevel: [[], [], [], ['CD'], ['CD']] },
  { action: 'LOWER_RETENTION', label: 'Abaisser la rétention à 15 %', rolesByLevel: [[], [], [], [], ['CD']] }
];

export function can(action: Action, role: Role, level: number): boolean {
  const permission = PERMISSIONS.find((p) => p.action === action);
  return !!permission?.rolesByLevel[level - 1]?.includes(role);
}

export interface TacticalLayerConfig {
  id: TacticalLayer;
  label: string;
  tag: string;
  resourceCodes: string[];
}

export const TACTICAL_LAYERS: TacticalLayerConfig[] = [
  { id: 'GLOBAL', label: 'Vue globale', tag: 'ALL', resourceCodes: [] },
  { id: 'POWER', label: 'Énergie & communications', tag: 'PWR', resourceCodes: ['POWER', 'COMMUNICATION'] },
  { id: 'SUPPLIES', label: 'Vivres & eau', tag: 'H2O', resourceCodes: ['FOOD_WATER'] },
  { id: 'SHELTER', label: 'Abris & sécurité', tag: 'SEC', resourceCodes: ['SHELTERS', 'SECURITY'] },
  { id: 'MEDICAL', label: 'Secours & santé', tag: 'MED', resourceCodes: ['MEDICAL', 'RESCUE', 'HAZMAT'] },
  { id: 'LOGISTICS', label: 'Transport & génie', tag: 'LOG', resourceCodes: ['TRANSPORT', 'ENGINEERING'] }
];

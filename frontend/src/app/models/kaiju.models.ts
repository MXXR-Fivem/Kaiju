export type UserRole = 'QC' | 'LC' | 'CD';
export type DisasterType = 'EARTHQUAKE' | 'TSUNAMI' | 'TORNADO';
export type RouteType = 'LAND' | 'SEA';
export type TransferStatus = 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'DELIVERED' | 'REJECTED' | 'CANCELLED';
export type TransitApprovalStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type TacticalLayer = 'GLOBAL' | 'POWER' | 'WATER' | 'FOOD' | 'MEDICAL' | 'HEAVY_GEAR';

export interface TacticalLayerConfig {
  id: TacticalLayer;
  label: string;
  sublabel: string;
  icon: string;
  color: string;
  resourceCodes: string[];
}

export const TACTICAL_LAYERS: TacticalLayerConfig[] = [
  {
    id: 'GLOBAL',
    label: 'Global QG',
    sublabel: 'Vue d\'ensemble tactique',
    icon: '🌐',
    color: '#38bdf8',
    resourceCodes: []
  },
  {
    id: 'POWER',
    label: 'Électricité & Énergie',
    sublabel: 'Câbles H.T. & Générateurs',
    icon: '⚡',
    color: '#fbbf24',
    resourceCodes: ['GENERATOR', 'FUEL']
  },
  {
    id: 'WATER',
    label: 'Eau & Filtration',
    sublabel: 'Aqueducs & Stations',
    icon: '💧',
    color: '#0284c7',
    resourceCodes: ['WATER', 'WATER_PURIFIER']
  },
  {
    id: 'FOOD',
    label: 'Vivres & Rations',
    sublabel: 'Chaîne de subsistance',
    icon: '🍞',
    color: '#f97316',
    resourceCodes: ['FOOD']
  },
  {
    id: 'MEDICAL',
    label: 'Médical & Soins',
    sublabel: 'Kits & Brigades mobiles',
    icon: '🏥',
    color: '#ef4444',
    resourceCodes: ['MED_KIT', 'MEDIC']
  },
  {
    id: 'HEAVY_GEAR',
    label: 'Abris & Logistique',
    sublabel: 'Tentes, 4x4 & Déblaiement',
    icon: '🚜',
    color: '#a855f7',
    resourceCodes: ['SHELTER', 'ATV', 'CLEARING_GEAR']
  }
];

export interface District {
  id: string;
  code: string;
  name: string;
  is_coastal: boolean;
  latitude: number;
  longitude: number;
  polygon_bounds_json: string;
  current_disaster_level: number;
}

export interface DistrictAdjacency {
  id: string;
  from_district_id: string;
  to_district_id: string;
  route_type: RouteType;
  base_transit_minutes: number;
  is_blocked: boolean;
}

export interface ResourceType {
  id: string;
  code: string;
  name: string;
  description: string;
  unit: string;
  is_critical: boolean;
}

export interface DistrictResourceDetail {
  id: string;
  district_id: string;
  district_code: string;
  district_name: string;
  resource_type_id: string;
  resource_code: string;
  resource_name: string;
  unit: string;
  initial_quantity: number;
  current_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  min_retention_pct: number;
  min_retained_quantity: number;
  transferable_quantity: number;
}

export interface TransferRequestDetail {
  id: string;
  requester_id: string;
  requester_name: string;
  requester_role: string;
  source_district_id: string;
  source_district_code: string;
  source_district_name: string;
  target_district_id: string;
  target_district_code: string;
  target_district_name: string;
  resource_type_id: string;
  resource_code: string;
  resource_name: string;
  unit: string;
  quantity: number;
  route_type: RouteType;
  transit_district_id?: string;
  transit_district_code?: string;
  status: TransferStatus;
  transit_approval_status: TransitApprovalStatus;
  estimated_duration_minutes: number;
  departed_at?: string;
  estimated_arrival_at?: string;
  delivered_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface DisasterEvent {
  id: string;
  district_id: string;
  disaster_type: DisasterType;
  intensity: number;
  calculated_level: number;
  is_active: boolean;
  triggered_by: string;
  triggered_at: string;
  resolved_at?: string;
}

export interface WsMessage<T = any> {
  type: string;
  payload: T;
}

export interface TacticalAlert {
  id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  timestamp: Date;
}

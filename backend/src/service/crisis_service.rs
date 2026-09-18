use std::sync::Arc;
use uuid::Uuid;
use crate::domain::{DisasterEvent, RulesEngine};
use crate::errors::AppError;
use crate::repository::{DisasterRepository, DistrictRepository, ResourceRepository};
use crate::ws::{WsEvent, WsHub};

pub struct CrisisService {
    district_repo: Arc<DistrictRepository>,
    disaster_repo: Arc<DisasterRepository>,
    resource_repo: Arc<ResourceRepository>,
    ws_hub: Arc<WsHub>,
}

impl CrisisService {
    pub fn new(
        district_repo: Arc<DistrictRepository>,
        disaster_repo: Arc<DisasterRepository>,
        resource_repo: Arc<ResourceRepository>,
        ws_hub: Arc<WsHub>,
    ) -> Self {
        Self {
            district_repo,
            disaster_repo,
            resource_repo,
            ws_hub,
        }
    }

    pub async fn trigger_disaster(
        &self,
        district_id_or_code: &str,
        disaster_type: &str,
        intensity: i64,
        triggered_by: &str,
    ) -> Result<DisasterEvent, AppError> {
        let district = if let Some(d) = self.district_repo.find_by_code(district_id_or_code).await? {
            d
        } else if let Some(d) = self.district_repo.find_by_id(district_id_or_code).await? {
            d
        } else {
            return Err(AppError::NotFound(format!("Quartier '{}' introuvable.", district_id_or_code)));
        };

        RulesEngine::validate_disaster_target(&district.code, district.is_coastal, disaster_type)?;

        let calculated_level = match intensity {
            1..=20 => 1,
            21..=40 => 2,
            41..=60 => 3,
            61..=80 => 4,
            _ => 5,
        };

        let disaster_id = format!("dis_{}", Uuid::new_v4().simple());
        let event = self.disaster_repo.create_disaster(
            &disaster_id,
            &district.id,
            disaster_type,
            intensity,
            calculated_level,
            triggered_by,
        ).await?;

        self.ws_hub.broadcast_event(WsEvent::DisasterTriggered {
            disaster_id: event.id.clone(),
            district_id: district.id.clone(),
            district_code: district.code.clone(),
            disaster_type: disaster_type.to_string(),
            intensity,
            level: calculated_level,
        });

        self.ws_hub.broadcast_event(WsEvent::Alert {
            severity: if calculated_level >= 4 { "CRITICAL".to_string() } else { "WARNING".to_string() },
            title: format!("ALERTE CATASTROPHE : {} DANS {}", disaster_type, district.name),
            message: format!("Intensite : {}/100. Niveau d'urgence : {}.", intensity, calculated_level),
        });

        Ok(event)
    }

    pub async fn resolve_disaster(&self) -> Result<Option<DisasterEvent>, AppError> {
        let resolved = self.disaster_repo.resolve_active_disaster().await?;

        if let Some(ref d) = resolved {
            let district = self.district_repo.find_by_id(&d.district_id).await?;
            let code = district.map(|x| x.code).unwrap_or_else(|| "UNKNOWN".to_string());

            self.ws_hub.broadcast_event(WsEvent::DisasterResolved {
                disaster_id: d.id.clone(),
                district_id: d.district_id.clone(),
                district_code: code,
            });

            self.ws_hub.broadcast_event(WsEvent::Alert {
                severity: "INFO".to_string(),
                title: "FIN D'ALERTE".to_string(),
                message: "La catastrophe a ete maitrisee. Retour au niveau nominal.".to_string(),
            });
        }

        Ok(resolved)
    }

    pub async fn apply_retention_override(
        &self,
        district_id_or_code: &str,
        user_role: &str,
    ) -> Result<f64, AppError> {
        let district = if let Some(d) = self.district_repo.find_by_code(district_id_or_code).await? {
            d
        } else if let Some(d) = self.district_repo.find_by_id(district_id_or_code).await? {
            d
        } else {
            return Err(AppError::NotFound(format!("Quartier '{}' introuvable.", district_id_or_code)));
        };

        let new_pct = RulesEngine::validate_retention_override(user_role, district.current_disaster_level)?;

        self.resource_repo.update_retention_override(&district.id, new_pct).await?;

        self.ws_hub.broadcast_event(WsEvent::Alert {
            severity: "CRITICAL".to_string(),
            title: format!("ORDRE CITY DIRECTOR : Seuil a 15% ({})", district.code),
            message: format!("Le quartier {} a recu l'autorisation exceptionnelle de puiser jusqu'a 15%.", district.name),
        });

        Ok(new_pct)
    }

    pub async fn get_active_disaster(&self) -> Result<Option<DisasterEvent>, AppError> {
        self.disaster_repo.find_active().await
    }
}

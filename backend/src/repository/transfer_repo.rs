use chrono::Utc;
use sqlx::{Pool, Sqlite};
use crate::domain::{TransferRequest, TransferRequestDetail};
use crate::errors::AppError;

pub struct TransferRepository {
    pool: Pool<Sqlite>,
}

impl TransferRepository {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    pub async fn create(
        &self,
        id: &str,
        requester_id: &str,
        source_district_id: &str,
        target_district_id: &str,
        resource_type_id: &str,
        quantity: i64,
        route_type: &str,
        transit_district_id: Option<&str>,
        status: &str,
        transit_approval_status: &str,
        estimated_duration_minutes: i64,
    ) -> Result<TransferRequest, AppError> {
        let now = Utc::now();
        let estimated_arrival = now + chrono::Duration::minutes(estimated_duration_minutes);

        sqlx::query(
            r#"
            INSERT INTO transfer_requests (
                id, requester_id, source_district_id, target_district_id,
                resource_type_id, quantity, route_type, transit_district_id,
                status, transit_approval_status, estimated_duration_minutes,
                departed_at, estimated_arrival_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            "#
        )
        .bind(id)
        .bind(requester_id)
        .bind(source_district_id)
        .bind(target_district_id)
        .bind(resource_type_id)
        .bind(quantity)
        .bind(route_type)
        .bind(transit_district_id)
        .bind(status)
        .bind(transit_approval_status)
        .bind(estimated_duration_minutes)
        .bind(now)
        .bind(estimated_arrival)
        .execute(&self.pool)
        .await?;

        let created = self.find_by_id(id).await?.ok_or_else(|| {
            AppError::InternalError("Transfert non retrouvé après insertion.".to_string())
        })?;

        Ok(created)
    }

    pub async fn find_by_id(&self, id: &str) -> Result<Option<TransferRequest>, AppError> {
        let transfer = sqlx::query_as::<_, TransferRequest>(
            r#"
            SELECT id, requester_id, source_district_id, target_district_id,
                   resource_type_id, quantity, route_type, transit_district_id,
                   status, transit_approval_status, estimated_duration_minutes,
                   departed_at, estimated_arrival_at, delivered_at,
                   rejection_reason, created_at, updated_at
            FROM transfer_requests
            WHERE id = $1
            "#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(transfer)
    }

    pub async fn find_all_detailed(&self) -> Result<Vec<TransferRequestDetail>, AppError> {
        let transfers = sqlx::query_as::<_, TransferRequestDetail>(
            r#"
            SELECT 
                tr.id,
                tr.requester_id,
                u.display_name as requester_name,
                u.role as requester_role,
                tr.source_district_id,
                sd.code as source_district_code,
                sd.name as source_district_name,
                tr.target_district_id,
                td.code as target_district_code,
                td.name as target_district_name,
                tr.resource_type_id,
                rt.code as resource_code,
                rt.name as resource_name,
                rt.unit,
                tr.quantity,
                tr.route_type,
                tr.transit_district_id,
                xd.code as transit_district_code,
                tr.status,
                tr.transit_approval_status,
                tr.estimated_duration_minutes,
                tr.departed_at,
                tr.estimated_arrival_at,
                tr.delivered_at,
                tr.rejection_reason,
                tr.created_at,
                tr.updated_at
            FROM transfer_requests tr
            JOIN user_accounts u ON tr.requester_id = u.id
            JOIN districts sd ON tr.source_district_id = sd.id
            JOIN districts td ON tr.target_district_id = td.id
            JOIN resource_types rt ON tr.resource_type_id = rt.id
            LEFT JOIN districts xd ON tr.transit_district_id = xd.id
            ORDER BY tr.created_at DESC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(transfers)
    }

    pub async fn update_status(
        &self,
        id: &str,
        new_status: &str,
        rejection_reason: Option<&str>,
    ) -> Result<(), AppError> {
        let delivered_at = if new_status == "DELIVERED" {
            Some(Utc::now())
        } else {
            None
        };

        sqlx::query(
            r#"
            UPDATE transfer_requests
            SET status = $1,
                rejection_reason = $2,
                delivered_at = COALESCE($3, delivered_at),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            "#
        )
        .bind(new_status)
        .bind(rejection_reason)
        .bind(delivered_at)
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn update_transit_approval(
        &self,
        id: &str,
        transit_status: &str,
    ) -> Result<(), AppError> {
        sqlx::query(
            r#"
            UPDATE transfer_requests
            SET transit_approval_status = $1,
                status = CASE WHEN $1 = 'APPROVED' THEN 'IN_TRANSIT' ELSE status END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            "#
        )
        .bind(transit_status)
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}

use sqlx::{Pool, Sqlite};
use crate::domain::UserAccount;
use crate::errors::AppError;

pub struct UserRepository {
    pool: Pool<Sqlite>,
}

impl UserRepository {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    #[allow(dead_code)]
    pub async fn find_all(&self) -> Result<Vec<UserAccount>, AppError> {
        let users = sqlx::query_as::<_, UserAccount>(
            r#"
            SELECT id, username, password_hash, display_name, role, assigned_district_id
            FROM user_accounts
            ORDER BY role ASC, username ASC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(users)
    }

    pub async fn find_by_id(&self, id: &str) -> Result<Option<UserAccount>, AppError> {
        let user = sqlx::query_as::<_, UserAccount>(
            r#"
            SELECT id, username, password_hash, display_name, role, assigned_district_id
            FROM user_accounts
            WHERE id = $1
            "#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn find_by_username(&self, username: &str) -> Result<Option<UserAccount>, AppError> {
        let user = sqlx::query_as::<_, UserAccount>(
            r#"
            SELECT id, username, password_hash, display_name, role, assigned_district_id
            FROM user_accounts
            WHERE username = $1
            "#
        )
        .bind(username)
        .fetch_optional(&self.pool)
        .await?;

        Ok(user)
    }
}

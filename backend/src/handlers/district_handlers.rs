use actix_web::{get, web, HttpResponse};
use std::sync::Arc;
use crate::errors::AppError;
use crate::repository::DistrictRepository;

#[get("/api/districts")]
pub async fn get_all_districts(
    district_repo: web::Data<Arc<DistrictRepository>>,
) -> Result<HttpResponse, AppError> {
    let districts = district_repo.find_all().await?;
    Ok(HttpResponse::Ok().json(districts))
}

#[get("/api/districts/{identifier}")]
pub async fn get_district_by_id_or_code(
    path: web::Path<String>,
    district_repo: web::Data<Arc<DistrictRepository>>,
) -> Result<HttpResponse, AppError> {
    let identifier = path.into_inner();
    let district = if let Some(d) = district_repo.find_by_code(&identifier).await? {
        Some(d)
    } else {
        district_repo.find_by_id(&identifier).await?
    };

    match district {
        Some(d) => Ok(HttpResponse::Ok().json(d)),
        None => Err(AppError::NotFound(format!("Quartier '{}' introuvable.", identifier))),
    }
}

#[get("/api/districts/{identifier}/adjacencies")]
pub async fn get_district_adjacencies(
    path: web::Path<String>,
    district_repo: web::Data<Arc<DistrictRepository>>,
) -> Result<HttpResponse, AppError> {
    let identifier = path.into_inner();
    let district = if let Some(d) = district_repo.find_by_code(&identifier).await? {
        d
    } else if let Some(d) = district_repo.find_by_id(&identifier).await? {
        d
    } else {
        return Err(AppError::NotFound(format!("Quartier '{}' introuvable.", identifier)));
    };

    let adjacencies = district_repo.find_adjacencies(&district.id).await?;
    Ok(HttpResponse::Ok().json(adjacencies))
}

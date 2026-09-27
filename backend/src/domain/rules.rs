use std::collections::HashMap;

use super::{Role, Route, Stock};
use crate::errors::AppError;

pub const LAND_LEG_MINUTES: i64 = 30;
pub const XENO: &str = "X";
pub const DEFAULT_RETENTION_PCT: i64 = 30;
pub const LOWERED_RETENTION_PCT: i64 = 15;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Action {
    Reserve,
    AdjacentTransfer,
    OrganizeTransit,
    Requisition,
    LowerRetention,
}

impl Action {
    fn label(self) -> &'static str {
        match self {
            Action::Reserve => "Réserver dans son quartier",
            Action::AdjacentTransfer => "Demander un transfert adjacent",
            Action::OrganizeTransit => "Organiser un transit",
            Action::Requisition => "Réquisitionner",
            Action::LowerRetention => "Abaisser le seuil de rétention",
        }
    }
}

pub fn allowed_roles(action: Action, level: i64) -> &'static [Role] {
    use Role::*;
    match (action, level) {
        (Action::Reserve, 2..=5) => &[QC],
        (Action::AdjacentTransfer, 3) => &[QC],
        (Action::AdjacentTransfer, 4) => &[QC, LC],
        (Action::AdjacentTransfer, 5) => &[QC, LC, CD],
        (Action::OrganizeTransit, 4) => &[LC],
        (Action::OrganizeTransit, 5) => &[LC, CD],
        (Action::Requisition, 4..=5) => &[CD],
        (Action::LowerRetention, 5) => &[CD],
        _ => &[],
    }
}

pub fn authorize(action: Action, role: Role, level: i64) -> Result<(), AppError> {
    let allowed = allowed_roles(action, level);
    if allowed.is_empty() {
        let required = (1..=5).find(|l| !allowed_roles(action, *l).is_empty()).unwrap_or(5);
        return Err(AppError::LevelRestricted(format!(
            "« {} » est verrouillé au niveau {level} : niveau {required} minimum.",
            action.label()
        )));
    }
    if !allowed.contains(&role) {
        let roles: Vec<String> = allowed.iter().map(|r| r.to_string()).collect();
        return Err(AppError::PermissionDenied(format!(
            "« {} » est réservé à {} au niveau {level} (rôle actuel : {role}).",
            action.label(),
            roles.join(", ")
        )));
    }
    Ok(())
}

pub fn min_retained(initial_quantity: i64, retention_pct: i64) -> i64 {
    (initial_quantity * retention_pct + 99) / 100
}

pub fn check_withdrawal(stock: &Stock, quantity: i64) -> Result<(), AppError> {
    if stock.current_quantity - quantity < stock.min_retained {
        return Err(AppError::RetentionViolation(format!(
            "{} doit conserver au moins {} × {} ({} % de {}) : {} transférable(s) au maximum.",
            stock.district_code,
            stock.min_retained,
            stock.resource_name,
            stock.retention_pct,
            stock.initial_quantity,
            stock.transferable
        )));
    }
    if quantity > stock.available {
        return Err(AppError::ResourceConflict(format!(
            "Seulement {} × {} disponible(s) dans {} ({} réservé(s)).",
            stock.available, stock.resource_name, stock.district_code, stock.reserved_quantity
        )));
    }
    Ok(())
}

#[derive(Debug, PartialEq)]
pub struct Plan {
    pub adjacent: bool,
    pub route: Route,
    pub transit: Option<String>,
    pub minutes: i64,
}

pub struct Topology {
    neighbors: HashMap<String, Vec<String>>,
    coastal: Vec<String>,
}

impl Topology {
    pub fn new(adjacencies: Vec<(String, String)>, coastal: Vec<String>) -> Self {
        let mut neighbors: HashMap<String, Vec<String>> = HashMap::new();
        for (district, neighbor) in adjacencies {
            neighbors.entry(district).or_default().push(neighbor);
        }
        Self { neighbors, coastal }
    }

    pub fn contains(&self, code: &str) -> bool {
        self.neighbors.contains_key(code)
    }

    pub fn neighbors(&self, code: &str) -> &[String] {
        self.neighbors.get(code).map(Vec::as_slice).unwrap_or(&[])
    }

    pub fn are_adjacent(&self, a: &str, b: &str) -> bool {
        self.neighbors(a).iter().any(|n| n == b)
    }

    fn is_coastal(&self, code: &str) -> bool {
        self.coastal.iter().any(|c| c == code)
    }

    pub fn plan(&self, source: &str, target: &str, route: Option<Route>, level: i64) -> Result<Plan, AppError> {
        if source == target {
            return Err(AppError::Validation("Le quartier source et le quartier cible doivent différer.".into()));
        }
        let adjacent = self.are_adjacent(source, target);
        let maritime = self.is_coastal(source) && self.is_coastal(target);
        let route = route.unwrap_or(if level >= 5 && maritime { Route::Sea } else { Route::Land });
        let (transit, minutes) = match route {
            Route::Sea if !maritime => {
                return Err(AppError::AdjacencyViolation(format!(
                    "La route maritime ne relie que les quartiers de la baie (E, X, Z) : {source} → {target} impossible."
                )))
            }
            Route::Sea => (None, 2 * LAND_LEG_MINUTES),
            Route::Land if adjacent => (None, LAND_LEG_MINUTES),
            Route::Land => {
                let transit = self
                    .neighbors(source)
                    .iter()
                    .filter(|n| self.are_adjacent(n, target))
                    .min_by_key(|n| (n.as_str() == XENO, (*n).clone()))
                    .ok_or_else(|| {
                        AppError::AdjacencyViolation(format!("Aucun quartier de transit ne relie {source} à {target}."))
                    })?;
                (Some(transit.clone()), 2 * LAND_LEG_MINUTES)
            }
        };
        Ok(Plan { adjacent, route, transit, minutes })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use Role::*;

    fn tokyork() -> Topology {
        let pairs = [("A", "E"), ("A", "W"), ("A", "X"), ("E", "X"), ("W", "X"), ("W", "Z"), ("X", "Z")];
        let adjacencies = pairs
            .iter()
            .flat_map(|(a, b)| [(a.to_string(), b.to_string()), (b.to_string(), a.to_string())])
            .collect();
        Topology::new(adjacencies, vec!["E".into(), "X".into(), "Z".into()])
    }

    fn stock(current: i64, reserved: i64) -> Stock {
        Stock {
            district_code: "A".into(),
            resource_code: "MEDICAL".into(),
            resource_name: "Personnel médical".into(),
            initial_quantity: 12,
            current_quantity: current,
            reserved_quantity: reserved,
            retention_pct: 30,
            min_retained: 0,
            available: 0,
            transferable: 0,
        }
        .with_limits()
    }

    #[test]
    fn permission_matrix_matches_annex() {
        let expected: [(Action, [&[Role]; 5]); 5] = [
            (Action::Reserve, [&[], &[QC], &[QC], &[QC], &[QC]]),
            (Action::AdjacentTransfer, [&[], &[], &[QC], &[QC, LC], &[QC, LC, CD]]),
            (Action::OrganizeTransit, [&[], &[], &[], &[LC], &[LC, CD]]),
            (Action::Requisition, [&[], &[], &[], &[CD], &[CD]]),
            (Action::LowerRetention, [&[], &[], &[], &[], &[CD]]),
        ];
        for (action, levels) in expected {
            for (index, roles) in levels.iter().enumerate() {
                assert_eq!(allowed_roles(action, index as i64 + 1), *roles, "{action:?} niveau {}", index + 1);
            }
        }
    }

    #[test]
    fn authorize_distinguishes_level_and_role() {
        assert!(matches!(authorize(Action::Reserve, QC, 1), Err(AppError::LevelRestricted(_))));
        assert!(matches!(authorize(Action::Reserve, LC, 2), Err(AppError::PermissionDenied(_))));
        assert!(authorize(Action::Reserve, QC, 2).is_ok());
    }

    #[test]
    fn retention_matches_annex() {
        let cases = [(12, 4), (5, 2), (8, 3), (3, 1), (7, 3), (4, 2), (9, 3), (6, 2), (10, 3), (2, 1)];
        for (initial, minimum) in cases {
            assert_eq!(min_retained(initial, 30), minimum, "stock initial {initial}");
        }
        assert_eq!(min_retained(12, 15), 2);
    }

    #[test]
    fn withdrawal_respects_retention_and_reservations() {
        assert_eq!(stock(12, 0).transferable, 8);
        assert!(check_withdrawal(&stock(12, 0), 8).is_ok());
        assert!(matches!(check_withdrawal(&stock(12, 0), 9), Err(AppError::RetentionViolation(_))));
        assert!(matches!(check_withdrawal(&stock(12, 6), 7), Err(AppError::ResourceConflict(_))));
    }

    #[test]
    fn routes_follow_topology() {
        let t = tokyork();
        assert_eq!(
            t.plan("A", "X", None, 3).unwrap(),
            Plan { adjacent: true, route: Route::Land, transit: None, minutes: LAND_LEG_MINUTES }
        );
        assert_eq!(t.plan("A", "Z", None, 4).unwrap().transit.as_deref(), Some("W"));
        assert_eq!(t.plan("E", "Z", Some(Route::Land), 4).unwrap().transit.as_deref(), Some("X"));
        let sea = t.plan("E", "Z", None, 5).unwrap();
        assert_eq!((sea.route, sea.transit, sea.minutes), (Route::Sea, None, 2 * LAND_LEG_MINUTES));
        assert_eq!(t.plan("E", "X", Some(Route::Sea), 3).unwrap().minutes, 2 * LAND_LEG_MINUTES);
        assert!(matches!(t.plan("A", "X", Some(Route::Sea), 5), Err(AppError::AdjacencyViolation(_))));
    }
}

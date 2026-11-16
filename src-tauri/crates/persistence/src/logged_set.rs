//! One logged set: its JSON shape and its `history` row.

use rusqlite::{params_from_iter, Connection, Row, ToSql};
use serde::{Deserialize, Serialize};

use crate::Result;

/// The set type of a set that does not say: in JSON from before sets had
/// one, and in rows logged before the column existed.
pub(crate) const DEFAULT_SET_TYPE: &str = "working";

fn default_set_type() -> String {
    DEFAULT_SET_TYPE.to_string()
}

/// One logged set. JSON is camelCase to match the TypeScript `LoggedSet`.
#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LoggedSetRow {
    pub id: String,
    pub ex_id: String,
    pub exercise: String,
    pub group: String,
    pub muscles: Vec<String>,
    /// Reps, or seconds for time-based exercises.
    pub value: f64,
    /// kg, or null for unweighted.
    pub weight: Option<f64>,
    /// ISO 8601 timestamp.
    pub ts: String,
    /// Local date key YYYY-MM-DD.
    pub date: String,
    /// "idle" | "timer" | "manual".
    pub trigger: String,
    /// The plan item this set counts toward, if any.
    #[serde(default)]
    pub plan_item_id: Option<String>,
    /// "warmup" | "working" | "drop".
    #[serde(default = "default_set_type")]
    pub set_type: String,
}

/// The `history` row of a set. Columns are addressed by name in both
/// directions, so nothing depends on their order; `muscles` is stored as a
/// JSON array.
impl LoggedSetRow {
    pub(crate) fn from_row(row: &Row<'_>) -> Result<Self> {
        let muscles: String = row.get("muscles")?;
        Ok(Self {
            id: row.get("id")?,
            ex_id: row.get("ex_id")?,
            exercise: row.get("exercise")?,
            group: row.get("group")?,
            muscles: serde_json::from_str(&muscles)?,
            value: row.get("value")?,
            weight: row.get("weight")?,
            ts: row.get("ts")?,
            date: row.get("date")?,
            trigger: row.get("trigger")?,
            plan_item_id: row.get("plan_item_id")?,
            set_type: row.get("set_type")?,
        })
    }

    pub(crate) fn insert_into(&self, conn: &Connection) -> Result<()> {
        let muscles = serde_json::to_string(&self.muscles)?;
        let columns: [(&str, &dyn ToSql); 12] = [
            ("id", &self.id),
            ("ex_id", &self.ex_id),
            ("exercise", &self.exercise),
            ("group", &self.group),
            ("muscles", &muscles),
            ("value", &self.value),
            ("weight", &self.weight),
            ("ts", &self.ts),
            ("date", &self.date),
            ("trigger", &self.trigger),
            ("plan_item_id", &self.plan_item_id),
            ("set_type", &self.set_type),
        ];
        // Quoted: `group` is an SQL keyword.
        let names: Vec<String> = columns
            .iter()
            .map(|(name, _)| format!("\"{name}\""))
            .collect();
        let placeholders = vec!["?"; columns.len()];
        conn.execute(
            &format!(
                "INSERT INTO history ({}) VALUES ({})",
                names.join(", "),
                placeholders.join(", ")
            ),
            params_from_iter(columns.iter().map(|(_, value)| value)),
        )?;
        Ok(())
    }
}

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::{Arc, Mutex};

#[derive(Clone, Default)]
pub struct TransferCancels {
    pub cancelled: Arc<Mutex<HashSet<String>>>,
    pub paused: Arc<Mutex<HashSet<String>>>,
    pub queue: Arc<Mutex<()>>,
}

#[derive(Deserialize)]
pub struct ConflictResolution {
    pub name: String,
    pub action: String,
}

#[derive(Deserialize)]
pub struct TransferRequest {
    pub id: String,
    pub sources: Vec<String>,
    pub dest: String,
    pub cut: bool,
    pub resolutions: Vec<ConflictResolution>,
    #[serde(default)]
    pub fix_incompatible_names: bool,
}

#[derive(Serialize)]
pub struct TransferConflict {
    pub name: String,
    pub is_dir: bool,
    pub destination_name: Option<String>,
}

#[derive(Serialize)]
pub struct TransferNameChange {
    pub source: String,
    pub suggested_name: String,
}

#[derive(Serialize)]
pub struct TransferScan {
    pub files: u64,
    pub bytes: u64,
    pub conflicts: Vec<TransferConflict>,
    pub name_changes: Vec<TransferNameChange>,
}

#[derive(Serialize, Clone)]
pub struct TransferProgress {
    pub id: String,
    pub cut: bool,
    pub kind: String,
    pub done_files: u64,
    pub total_files: u64,
    pub done_bytes: u64,
    pub total_bytes: u64,
    pub finished: bool,
    pub cancelled: bool,
    pub error: Option<String>,
}

#[derive(Serialize, Default)]
pub struct TransferSummary {
    pub copied: u64,
    pub skipped: u64,
    pub cancelled: bool,
    pub touched: Vec<(String, String)>,
    pub errors: Vec<String>,
}

#[derive(Clone, Copy, Default)]
pub struct SourceSize {
    pub files: u64,
    pub bytes: u64,
}

impl SourceSize {
    pub fn zero() -> Self {
        Self::default()
    }
    pub fn merge(&mut self, other: SourceSize) {
        self.files += other.files;
        self.bytes = self.bytes.saturating_add(other.bytes);
    }
}

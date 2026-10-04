use serde::Deserialize;
use std::collections::{HashSet, VecDeque};
use std::path::PathBuf;

use crate::filesystem::entries::{entry_from_dir_entry, FileEntry};

pub const MAX_RECENT_SCAN: usize = 20_000;
pub const MAX_RECENT_DEPTH: u32 = 3;

fn default_recent_limit() -> u32 {
    40
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RecentQuery {
    #[serde(default)]
    pub roots: Vec<String>,
    #[serde(default = "default_recent_limit")]
    pub limit: u32,
    #[serde(default)]
    pub include_hidden: bool,
}

pub fn recent_entries(query: &RecentQuery) -> Result<Vec<FileEntry>, String> {
    let limit = query.limit.clamp(1, 500) as usize;
    let mut found: Vec<FileEntry> = Vec::new();
    let mut seen: HashSet<String> = HashSet::new();
    let mut budget = MAX_RECENT_SCAN;

    for root in &query.roots {
        if budget == 0 {
            break;
        }
        let root_path = PathBuf::from(root);
        if !root_path.is_dir() {
            continue;
        }
        let mut queue: VecDeque<(PathBuf, u32)> = VecDeque::new();
        queue.push_back((root_path, 0));

        while let Some((dir, depth)) = queue.pop_front() {
            if budget == 0 {
                break;
            }
            let Ok(reader) = std::fs::read_dir(&dir) else {
                continue;
            };
            for entry in reader.filter_map(Result::ok) {
                if budget == 0 {
                    break;
                }
                let Some(meta) = entry_from_dir_entry(&entry) else {
                    continue;
                };
                budget -= 1;
                if meta.is_directory() {
                    let should_descend = depth < MAX_RECENT_DEPTH && !meta.name.starts_with('.');
                    if should_descend {
                        queue.push_back((PathBuf::from(&meta.path), depth + 1));
                    }
                }
                if meta.hidden && !query.include_hidden {
                    continue;
                }
                if seen.insert(meta.path.clone()) {
                    found.push(meta);
                }
            }
        }
    }

    found.sort_by(|left, right| {
        right
            .recency()
            .cmp(&left.recency())
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
    });
    found.truncate(limit);
    Ok(found)
}

use serde::Serialize;
use std::path::Path;

#[derive(Serialize, Default)]
pub struct FolderStats {
    pub size: u64,
    pub files: u64,
    pub dirs: u64,
    pub truncated: bool,
}

pub const MAX_STATS_ENTRIES: u64 = 200_000;

pub fn collect_folder_stats(root: &Path) -> FolderStats {
    let mut budget = MAX_STATS_ENTRIES;
    let mut stats = FolderStats::default();
    walk_budgeted(root, &mut budget, &mut stats);
    stats
}

pub fn collect_budgeted(root: &Path, budget: &mut u64) -> FolderStats {
    let mut stats = FolderStats::default();
    walk_budgeted(root, budget, &mut stats);
    stats
}

fn walk_budgeted(root: &Path, budget: &mut u64, stats: &mut FolderStats) {
    if *budget == 0 {
        return;
    }
    let mut seen: std::collections::HashSet<(u64, u64)> = std::collections::HashSet::new();
    let mut stack = vec![root.to_path_buf()];

    while let Some(current) = stack.pop() {
        if *budget == 0 {
            stats.truncated = true;
            return;
        }
        let Ok(reader) = std::fs::read_dir(&current) else {
            continue;
        };
        for entry in reader.filter_map(Result::ok) {
            if *budget == 0 {
                stats.truncated = true;
                return;
            }
            *budget -= 1;
            let path = entry.path();
            let Ok(metadata) = path.symlink_metadata() else {
                continue;
            };
            if metadata.file_type().is_symlink() {
                continue;
            }
            #[cfg(unix)]
            {
                use std::os::unix::fs::MetadataExt;
                if !seen.insert((metadata.dev(), metadata.ino())) {
                    continue;
                }
            }
            if metadata.is_dir() {
                stats.dirs += 1;
                stack.push(path);
            } else {
                stats.files += 1;
                stats.size = stats.size.saturating_add(metadata.len());
            }
        }
    }
}

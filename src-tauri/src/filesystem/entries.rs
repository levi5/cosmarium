use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::path::{Path, PathBuf};

#[derive(Serialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub kind: String,
    pub size: u64,
    pub modified: Option<u64>,
    pub accessed: Option<u64>,
    pub created: Option<u64>,
    pub hidden: bool,
}

const KIND_DIRECTORY: &str = "directory";
const KIND_FILE: &str = "file";

impl FileEntry {
    pub fn recency(&self) -> u64 {
        self.accessed.unwrap_or(0).max(self.modified.unwrap_or(0))
    }

    pub fn is_directory(&self) -> bool {
        self.kind == KIND_DIRECTORY
    }
}

fn kind_of(metadata: &std::fs::Metadata) -> String {
    if metadata.is_dir() {
        KIND_DIRECTORY.to_string()
    } else {
        KIND_FILE.to_string()
    }
}

fn unix_seconds(time: Option<std::time::SystemTime>) -> Option<u64> {
    time?
        .duration_since(std::time::UNIX_EPOCH)
        .ok()
        .map(|duration| duration.as_secs())
}

fn has_windows_hidden_attribute(path: &Path) -> bool {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::fs::MetadataExt;
        const FILE_ATTRIBUTE_HIDDEN: u32 = 0x2;
        path.symlink_metadata()
            .is_ok_and(|metadata| metadata.file_attributes() & FILE_ATTRIBUTE_HIDDEN != 0)
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = path;
        false
    }
}

pub fn is_hidden_entry(path: &Path, name: &str) -> bool {
    has_windows_hidden_attribute(path) || name.starts_with('.')
}

fn build_entry(path: &Path, name: String, metadata: &std::fs::Metadata) -> FileEntry {
    FileEntry {
        hidden: is_hidden_entry(path, &name),
        path: path.to_string_lossy().into_owned(),
        kind: kind_of(metadata),
        name,
        size: metadata.len(),
        modified: unix_seconds(metadata.modified().ok()),
        accessed: unix_seconds(metadata.accessed().ok()),
        created: unix_seconds(metadata.created().ok()),
    }
}

pub fn entry_from_dir_entry(entry: &std::fs::DirEntry) -> Option<FileEntry> {
    let metadata = entry.metadata().ok()?;
    let path = entry.path();
    let name = entry.file_name().to_string_lossy().into_owned();
    Some(build_entry(&path, name, &metadata))
}

pub fn entry_from_path(path: &Path) -> Result<FileEntry, String> {
    let metadata = path.symlink_metadata().map_err(|error| error.to_string())?;
    let name = path
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .ok_or_else(|| "Invalid name.".to_string())?;
    Ok(build_entry(path, name, &metadata))
}

pub fn sort_default(entries: &mut [FileEntry]) {
    entries.sort_by(|left, right| {
        (!left.is_directory(), left.name.to_lowercase())
            .cmp(&(!right.is_directory(), right.name.to_lowercase()))
    });
}

pub fn list_directory(path: &str) -> Result<Vec<FileEntry>, String> {
    let directory = PathBuf::from(path);
    if !directory.is_dir() {
        return Err("This location is not a directory.".into());
    }
    let mut entries = std::fs::read_dir(&directory)
        .map_err(|error| error.to_string())?
        .filter_map(Result::ok)
        .filter_map(|entry| entry_from_dir_entry(&entry))
        .collect::<Vec<_>>();
    sort_default(&mut entries);
    Ok(entries)
}

fn default_depth() -> u32 {
    8
}
fn default_limit() -> u32 {
    5_000
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SearchQuery {
    #[serde(default)]
    pub text: String,
    pub root: String,
    #[serde(default)]
    pub extensions: Vec<String>,
    #[serde(default = "default_depth")]
    pub max_depth: u32,
    #[serde(default)]
    pub min_size: u64,
    #[serde(default = "default_limit")]
    pub limit: u32,
    #[serde(default)]
    pub include_hidden: bool,
}

fn lowercase_extension(name: &str) -> String {
    match name.rsplit_once('.') {
        Some((stem, extension)) if !stem.is_empty() => extension.to_lowercase(),
        _ => String::new(),
    }
}

pub fn search_entries(query: &SearchQuery) -> Result<Vec<FileEntry>, String> {
    let root = PathBuf::from(&query.root);
    if !root.is_dir() {
        return Err("This location is not a directory.".into());
    }

    let needle = query.text.trim().to_lowercase();
    let extensions: Vec<String> = query
        .extensions
        .iter()
        .map(|ext| ext.trim().trim_start_matches('.').to_lowercase())
        .filter(|ext| !ext.is_empty())
        .collect();
    let max_depth = query.max_depth.min(32);
    let limit = query.limit.clamp(1, 50_000) as usize;

    let mut results: Vec<FileEntry> = Vec::new();
    let mut queue: VecDeque<(PathBuf, u32)> = VecDeque::new();
    queue.push_back((root, 0));

    'outer: while let Some((dir, depth)) = queue.pop_front() {
        let Ok(reader) = std::fs::read_dir(&dir) else {
            continue;
        };
        for entry in reader.filter_map(Result::ok) {
            let Some(meta) = entry_from_dir_entry(&entry) else {
                continue;
            };
            if meta.hidden && !query.include_hidden {
                continue;
            }
            if meta.is_directory() {
                if depth < max_depth {
                    queue.push_back((PathBuf::from(&meta.path), depth + 1));
                }
                continue;
            }
            if !needle.is_empty() && !meta.name.to_lowercase().contains(&needle) {
                continue;
            }
            if !extensions.is_empty() && !extensions.contains(&lowercase_extension(&meta.name)) {
                continue;
            }
            if meta.size < query.min_size {
                continue;
            }
            results.push(meta);
            if results.len() >= limit {
                break 'outer;
            }
        }
    }

    sort_default(&mut results);
    Ok(results)
}

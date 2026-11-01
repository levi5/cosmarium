use super::entries::{FileEntry, SearchQuery};
use std::io::Read;

pub fn matches(entry: &FileEntry, query: &SearchQuery) -> bool {
    if (query.kind == "file" && entry.is_directory())
        || (query.kind == "folder" && !entry.is_directory())
    {
        return false;
    }
    if !entry
        .name
        .to_lowercase()
        .contains(&query.text.trim().to_lowercase())
    {
        return false;
    }
    if query
        .modified_after
        .is_some_and(|date| entry.modified.unwrap_or(0) < date)
        || query
            .modified_before
            .is_some_and(|date| entry.modified.unwrap_or(0) > date)
    {
        return false;
    }
    if !query.extensions.is_empty() {
        let extension = std::path::Path::new(&entry.name)
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or_default();
        if !query.extensions.iter().any(|value| {
            value
                .trim_start_matches('.')
                .eq_ignore_ascii_case(extension)
        }) {
            return false;
        }
    }
    if !entry.is_directory()
        && (entry.size < query.min_size || query.max_size.is_some_and(|size| entry.size > size))
    {
        return false;
    }
    if let Some(needle) = query.content.as_ref().filter(|value| !value.is_empty()) {
        const MAX_CONTENT_SIZE: u64 = 2 * 1024 * 1024;
        if entry.is_directory() || entry.size > MAX_CONTENT_SIZE {
            return false;
        }
        let Ok(file) = std::fs::File::open(&entry.path) else {
            return false;
        };
        let mut buffer = Vec::new();
        if file
            .take(MAX_CONTENT_SIZE + 1)
            .read_to_end(&mut buffer)
            .is_err()
            || buffer.len() as u64 > MAX_CONTENT_SIZE
            || buffer.contains(&0)
        {
            return false;
        }
        let Ok(text) = std::str::from_utf8(&buffer) else {
            return false;
        };
        if !text.to_lowercase().contains(&needle.to_lowercase()) {
            return false;
        }
    }
    true
}

use serde::Serialize;

#[cfg(any(
    target_os = "windows",
    all(
        unix,
        not(any(target_os = "macos", target_os = "ios", target_os = "android"))
    )
))]
#[path = "native.rs"]
mod backend;
#[cfg(not(any(
    target_os = "windows",
    all(
        unix,
        not(any(target_os = "macos", target_os = "ios", target_os = "android"))
    )
)))]
#[path = "freedesktop.rs"]
mod backend;

pub use backend::{count_items, list_items, purge_all, restore_items};

#[derive(Serialize)]
pub struct TrashEntry {
    pub id: String,
    pub name: String,
    pub original_path: String,
    pub deleted_at: i64,
    pub size: u64,
    pub entries: usize,
    pub is_dir: bool,
}

fn sort_entries(entries: &mut [TrashEntry]) {
    entries.sort_by(|left, right| {
        right
            .deleted_at
            .cmp(&left.deleted_at)
            .then_with(|| left.name.cmp(&right.name))
    });
}

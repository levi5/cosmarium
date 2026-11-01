use super::{sort_entries, TrashEntry};

fn describe(item: &trash::TrashItem) -> TrashEntry {
    let (size, entries) = trash::os_limited::metadata(item)
        .map(|metadata| {
            (
                metadata.size.size().unwrap_or(0),
                metadata.size.entries().unwrap_or(0),
            )
        })
        .unwrap_or((0, 0));
    TrashEntry {
        id: item.id.to_string_lossy().into_owned(),
        name: item.name.to_string_lossy().into_owned(),
        original_path: item.original_path().to_string_lossy().into_owned(),
        deleted_at: item.time_deleted.max(0),
        size,
        entries,
        is_dir: size == 0 && entries > 0,
    }
}

pub fn list_items() -> Result<Vec<TrashEntry>, String> {
    let items = trash::os_limited::list().map_err(|error| error.to_string())?;
    let mut entries = items.iter().map(describe).collect::<Vec<_>>();
    sort_entries(&mut entries);
    Ok(entries)
}

pub fn count_items() -> Result<usize, String> {
    trash::os_limited::list()
        .map(|items| items.len())
        .map_err(|error| error.to_string())
}

pub fn purge_all() -> Result<usize, String> {
    let items = trash::os_limited::list().map_err(|error| error.to_string())?;
    let count = items.len();
    if count > 0 {
        trash::os_limited::purge_all(&items).map_err(|error| error.to_string())?;
    }
    Ok(count)
}

pub fn restore_items(ids: &[String]) -> Result<usize, String> {
    if ids.is_empty() {
        return Err("Nothing selected.".into());
    }
    let wanted = ids.iter().collect::<std::collections::HashSet<_>>();
    let items: Vec<_> = trash::os_limited::list()
        .map_err(|error| error.to_string())?
        .into_iter()
        .filter(|item| wanted.contains(&item.id.to_string_lossy().to_string()))
        .collect();
    let count = items.len();
    if count == 0 {
        return Ok(0);
    }
    match trash::os_limited::restore_all(items) {
        Ok(()) => Ok(count),
        Err(trash::Error::RestoreCollision {
            remaining_items, ..
        }) => Ok(count - remaining_items.len()),
        Err(error) => Err(error.to_string()),
    }
}

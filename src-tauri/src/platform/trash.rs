use serde::Serialize;

#[cfg(any(
    target_os = "windows",
    all(
        unix,
        not(target_os = "macos"),
        not(target_os = "ios"),
        not(target_os = "android")
    )
))]
const NATIVE: bool = true;
#[cfg(not(any(
    target_os = "windows",
    all(
        unix,
        not(target_os = "macos"),
        not(target_os = "ios"),
        not(target_os = "android")
    )
)))]
const NATIVE: bool = false;

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

#[cfg(any(
    target_os = "windows",
    all(
        unix,
        not(target_os = "macos"),
        not(target_os = "ios"),
        not(target_os = "android")
    )
))]
fn describe(item: &trash::TrashItem) -> TrashEntry {
    let metadata = trash::os_limited::metadata(item).ok();
    let (size, entries) = match metadata {
        Some(meta) => (
            meta.size.size().unwrap_or(0),
            meta.size.entries().unwrap_or(0),
        ),
        None => (0, 0),
    };
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

#[cfg(not(any(
    target_os = "windows",
    all(
        unix,
        not(target_os = "macos"),
        not(target_os = "ios"),
        not(target_os = "android")
    )
)))]
fn payload_of(info_path: &std::path::Path) -> Option<std::path::PathBuf> {
    let trash_folder = info_path.parent()?.parent()?;
    let stem = info_path.file_stem()?;
    Some(trash_folder.join("files").join(stem))
}

#[cfg(not(any(
    target_os = "windows",
    all(
        unix,
        not(target_os = "macos"),
        not(target_os = "ios"),
        not(target_os = "android")
    )
)))]
fn original_path_of(decoded: &str, files_dir: &std::path::Path) -> String {
    if std::path::Path::new(decoded).is_absolute() {
        return decoded.to_string();
    }
    files_dir.join(decoded).to_string_lossy().into_owned()
}

#[cfg(not(any(
    target_os = "windows",
    all(
        unix,
        not(target_os = "macos"),
        not(target_os = "ios"),
        not(target_os = "android")
    )
)))]
fn read_original_path(raw: &str, files_dir: &std::path::Path) -> String {
    raw.lines()
        .skip(1)
        .filter_map(|line| line.split_once('='))
        .find(|(key, _)| key.trim() == "Path")
        .map(|(_, value)| original_path_of(&decode_uri_path(value.trim()), files_dir))
        .unwrap_or_default()
}

#[cfg(not(any(
    target_os = "windows",
    all(
        unix,
        not(target_os = "macos"),
        not(target_os = "ios"),
        not(target_os = "android")
    )
)))]
fn measure_payload(payload: &std::path::Path, is_dir: bool) -> (u64, usize) {
    if !is_dir {
        let size = std::fs::symlink_metadata(payload)
            .map(|meta| meta.len())
            .unwrap_or(0);
        return (size, 0);
    }
    let child_count = std::fs::read_dir(payload)
        .map(|children| children.flatten().count())
        .unwrap_or(0);
    (0, child_count)
}

#[cfg(not(any(
    target_os = "windows",
    all(
        unix,
        not(target_os = "macos"),
        not(target_os = "ios"),
        not(target_os = "android")
    )
)))]
fn freedesktop_entries() -> Vec<TrashEntry> {
    let Some(root) = super::locations::trash_root() else {
        return Vec::new();
    };
    let Some(trash_folder) = root.parent() else {
        return Vec::new();
    };
    let files_dir = trash_folder.join("files");
    let Ok(infos) = std::fs::read_dir(trash_folder.join("info")) else {
        return Vec::new();
    };

    let mut collected = Vec::new();
    for info in infos.flatten() {
        let info_path = info.path();
        if info_path
            .extension()
            .and_then(|extension| extension.to_str())
            != Some("trashinfo")
        {
            continue;
        }
        let Some(payload) = payload_of(&info_path) else {
            continue;
        };
        let Ok(meta) = std::fs::symlink_metadata(&payload) else {
            continue;
        };
        let is_dir = meta.is_dir();

        let Ok(raw) = std::fs::read_to_string(&info_path) else {
            continue;
        };
        let original = read_original_path(&raw, &files_dir);
        let deleted_at = raw
            .lines()
            .skip(1)
            .filter_map(|line| line.split_once('='))
            .find(|(key, _)| key.trim() == "DeletionDate")
            .map(|(_, value)| parse_deletion_date(value.trim()))
            .unwrap_or(0);
        if original.is_empty() {
            continue;
        }

        let (size, entries) = measure_payload(&payload, is_dir);
        collected.push(TrashEntry {
            id: info_path.to_string_lossy().into_owned(),
            name: std::path::Path::new(&original)
                .file_name()
                .map(|name| name.to_string_lossy().into_owned())
                .unwrap_or_default(),
            original_path: original,
            deleted_at,
            size,
            entries,
            is_dir,
        });
    }
    sort_entries(&mut collected);
    collected
}

#[cfg(not(any(
    target_os = "windows",
    all(
        unix,
        not(target_os = "macos"),
        not(target_os = "ios"),
        not(target_os = "android")
    )
)))]
fn decode_uri_path(value: &str) -> String {
    let bytes = value.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' && index + 2 < bytes.len() {
            let hex = std::str::from_utf8(&bytes[index + 1..index + 3]).unwrap_or("");
            if let Ok(byte) = u8::from_str_radix(hex, 16) {
                out.push(byte);
                index += 3;
                continue;
            }
        }
        out.push(bytes[index]);
        index += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

#[cfg(not(any(
    target_os = "windows",
    all(
        unix,
        not(target_os = "macos"),
        not(target_os = "ios"),
        not(target_os = "android")
    )
)))]
fn days_in_month(year: i64, month: i64) -> i64 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if (year % 4 == 0 && year % 100 != 0) || year % 400 == 0 => 29,
        2 => 28,
        _ => 0,
    }
}

#[cfg(not(any(
    target_os = "windows",
    all(
        unix,
        not(target_os = "macos"),
        not(target_os = "ios"),
        not(target_os = "android")
    )
)))]
fn parse_deletion_date(value: &str) -> i64 {
    let Some((date_part, time_part)) = value.split_once('T') else {
        return 0;
    };
    let mut date_fields = date_part
        .split('-')
        .filter_map(|part| part.parse::<i64>().ok());
    let (Some(year), Some(month), Some(day)) =
        (date_fields.next(), date_fields.next(), date_fields.next())
    else {
        return 0;
    };
    let mut time_fields = time_part
        .split(':')
        .filter_map(|part| part.parse::<i64>().ok());
    let (Some(hour), Some(minute), Some(second)) =
        (time_fields.next(), time_fields.next(), time_fields.next())
    else {
        return 0;
    };
    if month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 60 {
        return 0;
    }

    let days = days_in_month(year, month);
    if days == 0 || day > days {
        return 0;
    }
    let shifted = year - i64::from(month <= 2);
    let era = if shifted >= 0 { shifted } else { shifted - 399 } / 400;
    let year_of_era = shifted - era * 400;
    let month_prime = if month > 2 { month - 3 } else { month + 9 };
    let day_of_year = (153 * month_prime + 2) / 5 + day - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
    (era * 146097 + day_of_era - 719468) * 86400 + hour * 3600 + minute * 60 + second
}

pub fn list_items() -> Result<Vec<TrashEntry>, String> {
    if NATIVE {
        #[cfg(any(
            target_os = "windows",
            all(
                unix,
                not(target_os = "macos"),
                not(target_os = "ios"),
                not(target_os = "android")
            )
        ))]
        {
            let items = trash::os_limited::list().map_err(|error| error.to_string())?;
            let mut out: Vec<TrashEntry> = items.iter().map(describe).collect();
            sort_entries(&mut out);
            return Ok(out);
        }
    }
    #[cfg(not(any(
        target_os = "windows",
        all(
            unix,
            not(target_os = "macos"),
            not(target_os = "ios"),
            not(target_os = "android")
        )
    )))]
    {
        return Ok(freedesktop_entries());
    }
    #[cfg(any(
        target_os = "windows",
        all(
            unix,
            not(target_os = "macos"),
            not(target_os = "ios"),
            not(target_os = "android")
        )
    ))]
    unreachable!()
}

pub fn count_items() -> Result<usize, String> {
    if NATIVE {
        #[cfg(any(
            target_os = "windows",
            all(
                unix,
                not(target_os = "macos"),
                not(target_os = "ios"),
                not(target_os = "android")
            )
        ))]
        {
            return trash::os_limited::list()
                .map(|items| items.len())
                .map_err(|error| error.to_string());
        }
    }
    #[cfg(not(any(
        target_os = "windows",
        all(
            unix,
            not(target_os = "macos"),
            not(target_os = "ios"),
            not(target_os = "android")
        )
    )))]
    {
        return Ok(freedesktop_entries().len());
    }
    #[cfg(any(
        target_os = "windows",
        all(
            unix,
            not(target_os = "macos"),
            not(target_os = "ios"),
            not(target_os = "android")
        )
    ))]
    unreachable!()
}

pub fn purge_all() -> Result<usize, String> {
    if NATIVE {
        #[cfg(any(
            target_os = "windows",
            all(
                unix,
                not(target_os = "macos"),
                not(target_os = "ios"),
                not(target_os = "android")
            )
        ))]
        {
            let items = trash::os_limited::list().map_err(|error| error.to_string())?;
            let removed = items.len();
            if removed > 0 {
                trash::os_limited::purge_all(&items).map_err(|error| error.to_string())?;
            }
            return Ok(removed);
        }
    }
    #[cfg(not(any(
        target_os = "windows",
        all(
            unix,
            not(target_os = "macos"),
            not(target_os = "ios"),
            not(target_os = "android")
        )
    )))]
    {
        let entries = freedesktop_entries();
        let total = entries.len();
        let mut failed = 0;
        for entry in entries {
            let Some(payload) = payload_of(std::path::Path::new(&entry.id)) else {
                failed += 1;
                continue;
            };
            let removal = if entry.is_dir {
                std::fs::remove_dir_all(&payload)
            } else {
                std::fs::remove_file(&payload)
            };
            match removal {
                Ok(()) => {
                    let _ = std::fs::remove_file(&entry.id);
                }
                Err(_) => failed += 1,
            }
        }
        return Ok(total - failed);
    }
    #[cfg(any(
        target_os = "windows",
        all(
            unix,
            not(target_os = "macos"),
            not(target_os = "ios"),
            not(target_os = "android")
        )
    ))]
    unreachable!()
}

#[cfg(not(any(
    target_os = "windows",
    all(
        unix,
        not(target_os = "macos"),
        not(target_os = "ios"),
        not(target_os = "android")
    )
)))]
fn ensure_parent_dir(target: &std::path::Path) -> Result<(), String> {
    match target.parent() {
        Some(parent) => {
            std::fs::create_dir_all(parent).map_err(|error| format!("Could not recreate {error}"))
        }
        None => Ok(()),
    }
}

#[cfg(not(any(
    target_os = "windows",
    all(
        unix,
        not(target_os = "macos"),
        not(target_os = "ios"),
        not(target_os = "android")
    )
)))]
fn restore_freedesktop_entry(entry: &TrashEntry, payload: &std::path::Path) -> Result<(), String> {
    let target = std::path::PathBuf::from(&entry.original_path);
    if target.exists() || target.is_symlink() {
        return Err(format!("Already exists: {}", entry.original_path));
    }
    ensure_parent_dir(&target)?;
    let moved =
        std::fs::rename(payload, &target).is_ok() || copy_then_remove(payload, &target).is_ok();
    if !moved {
        return Err(format!("Could not restore {}", entry.original_path));
    }
    let _ = std::fs::remove_file(&entry.id);
    Ok(())
}

pub fn restore_items(ids: &[String]) -> Result<usize, String> {
    if ids.is_empty() {
        return Err("Nothing selected.".into());
    }
    if NATIVE {
        #[cfg(any(
            target_os = "windows",
            all(
                unix,
                not(target_os = "macos"),
                not(target_os = "ios"),
                not(target_os = "android")
            )
        ))]
        {
            let wanted: std::collections::HashSet<&String> = ids.iter().collect();
            let items: Vec<trash::TrashItem> = trash::os_limited::list()
                .map_err(|error| error.to_string())?
                .into_iter()
                .filter(|item| wanted.contains(&item.id.to_string_lossy().to_string()))
                .collect();
            return restore_native(items);
        }
    }
    #[cfg(not(any(
        target_os = "windows",
        all(
            unix,
            not(target_os = "macos"),
            not(target_os = "ios"),
            not(target_os = "android")
        )
    )))]
    {
        let wanted: std::collections::HashSet<&String> = ids.iter().collect();
        let selected: Vec<TrashEntry> = freedesktop_entries()
            .into_iter()
            .filter(|entry| wanted.contains(&entry.id))
            .collect();
        if selected.is_empty() {
            return Ok(0);
        }
        let mut restored = 0;
        let mut last_error = None;
        for entry in &selected {
            let Some(payload) = payload_of(std::path::Path::new(&entry.id)) else {
                continue;
            };
            match restore_freedesktop_entry(entry, &payload) {
                Ok(()) => restored += 1,
                Err(message) => last_error = last_error.or(Some(message)),
            }
        }
        if restored == 0 {
            return Err(last_error.unwrap_or_else(|| "Nothing could be restored.".into()));
        }
        return Ok(restored);
    }
    #[cfg(any(
        target_os = "windows",
        all(
            unix,
            not(target_os = "macos"),
            not(target_os = "ios"),
            not(target_os = "android")
        )
    ))]
    unreachable!()
}

#[cfg(any(
    target_os = "windows",
    all(
        unix,
        not(target_os = "macos"),
        not(target_os = "ios"),
        not(target_os = "android")
    )
))]
fn restore_native(items: Vec<trash::TrashItem>) -> Result<usize, String> {
    if items.is_empty() {
        return Ok(0);
    }
    let count = items.len();
    match trash::os_limited::restore_all(items) {
        Ok(()) => Ok(count),
        Err(trash::Error::RestoreCollision {
            remaining_items, ..
        }) => Ok(count - remaining_items.len()),
        Err(error) => Err(error.to_string()),
    }
}

#[cfg(not(any(
    target_os = "windows",
    all(
        unix,
        not(target_os = "macos"),
        not(target_os = "ios"),
        not(target_os = "android")
    )
)))]
fn copy_then_remove(source: &std::path::Path, target: &std::path::Path) -> Result<(), String> {
    let meta = std::fs::symlink_metadata(source).map_err(|error| error.to_string())?;
    if meta.is_dir() {
        std::fs::create_dir_all(target).map_err(|error| error.to_string())?;
        let entries = std::fs::read_dir(source).map_err(|error| error.to_string())?;
        for entry in entries.flatten() {
            copy_then_remove(&entry.path(), &target.join(entry.file_name()))?;
        }
        return std::fs::remove_dir_all(source).map_err(|error| error.to_string());
    }
    std::fs::copy(source, target).map_err(|error| error.to_string())?;
    std::fs::remove_file(source).map_err(|error| error.to_string())
}

#[path = "codecs.rs"]
mod codecs;

use super::{sort_entries, TrashEntry};
use codecs::{decode_uri_path, parse_deletion_date};
use std::path::{Path, PathBuf};

fn payload_of(info: &Path) -> Option<PathBuf> {
    Some(
        info.parent()?
            .parent()?
            .join("files")
            .join(info.file_stem()?),
    )
}

fn read_entry(info: &Path, files: &Path) -> Option<TrashEntry> {
    if info.extension()?.to_str()? != "trashinfo" {
        return None;
    }
    let payload = payload_of(info)?;
    let metadata = payload.symlink_metadata().ok()?;
    let raw = std::fs::read_to_string(info).ok()?;
    let fields: std::collections::HashMap<_, _> = raw
        .lines()
        .skip(1)
        .filter_map(|line| line.split_once('='))
        .collect();
    let decoded = decode_uri_path(fields.get("Path")?.trim());
    let original = if Path::new(&decoded).is_absolute() {
        PathBuf::from(decoded)
    } else {
        files.join(decoded)
    };
    let is_dir = metadata.is_dir() && !metadata.file_type().is_symlink();
    let entries = if is_dir {
        std::fs::read_dir(&payload)
            .map(|children| children.flatten().count())
            .unwrap_or(0)
    } else {
        0
    };
    Some(TrashEntry {
        id: info.to_string_lossy().into_owned(),
        name: original.file_name()?.to_string_lossy().into_owned(),
        original_path: original.to_string_lossy().into_owned(),
        deleted_at: fields
            .get("DeletionDate")
            .map(|value| parse_deletion_date(value.trim()))
            .unwrap_or(0),
        size: if is_dir { 0 } else { metadata.len() },
        entries,
        is_dir,
    })
}

pub fn list_items() -> Result<Vec<TrashEntry>, String> {
    let Some(root) = crate::platform::locations::trash_root() else {
        return Ok(Vec::new());
    };
    let Some(directory) = root.parent() else {
        return Ok(Vec::new());
    };
    let Ok(infos) = std::fs::read_dir(directory.join("info")) else {
        return Ok(Vec::new());
    };
    let mut entries = infos
        .filter_map(Result::ok)
        .filter_map(|info| read_entry(&info.path(), &directory.join("files")))
        .collect::<Vec<_>>();
    sort_entries(&mut entries);
    Ok(entries)
}

pub fn count_items() -> Result<usize, String> {
    list_items().map(|entries| entries.len())
}

pub fn purge_all() -> Result<usize, String> {
    let mut count = 0;
    for entry in list_items()? {
        let Some(payload) = payload_of(Path::new(&entry.id)) else {
            continue;
        };
        let result = if entry.is_dir {
            std::fs::remove_dir_all(payload)
        } else {
            std::fs::remove_file(payload)
        };
        if result.is_ok() {
            std::fs::remove_file(&entry.id).map_err(|error| error.to_string())?;
            count += 1;
        }
    }
    Ok(count)
}

fn copy_tree(source: &Path, target: &Path) -> Result<(), String> {
    let metadata = source
        .symlink_metadata()
        .map_err(|error| error.to_string())?;
    if metadata.file_type().is_symlink() {
        return Err("Cannot restore this symbolic link across volumes.".into());
    }
    if metadata.is_dir() {
        std::fs::create_dir(target).map_err(|error| error.to_string())?;
        for entry in std::fs::read_dir(source).map_err(|error| error.to_string())? {
            let entry = entry.map_err(|error| error.to_string())?;
            copy_tree(&entry.path(), &target.join(entry.file_name()))?;
        }
    } else {
        let mut input = std::fs::File::open(source).map_err(|error| error.to_string())?;
        let mut output = std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(target)
            .map_err(|error| error.to_string())?;
        std::io::copy(&mut input, &mut output).map_err(|error| error.to_string())?;
        output.sync_all().map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn restore_entry(entry: &TrashEntry) -> Result<(), String> {
    let payload = payload_of(Path::new(&entry.id)).ok_or("Invalid trash entry.")?;
    let target = Path::new(&entry.original_path);
    if target.symlink_metadata().is_ok() {
        return Err(format!("Already exists: {}", target.display()));
    }
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    if std::fs::rename(&payload, target).is_err() {
        copy_tree(&payload, target)?;
        if entry.is_dir {
            std::fs::remove_dir_all(payload)
        } else {
            std::fs::remove_file(payload)
        }
        .map_err(|error| error.to_string())?;
    }
    std::fs::remove_file(&entry.id).map_err(|error| error.to_string())
}

pub fn restore_items(ids: &[String]) -> Result<usize, String> {
    if ids.is_empty() {
        return Err("Nothing selected.".into());
    }
    let mut restored = 0;
    let mut error = None;
    for entry in list_items()?
        .into_iter()
        .filter(|entry| ids.contains(&entry.id))
    {
        match restore_entry(&entry) {
            Ok(()) => restored += 1,
            Err(reason) => error = Some(reason),
        }
    }
    if restored == 0 {
        if let Some(error) = error {
            return Err(error);
        }
    }
    Ok(restored)
}

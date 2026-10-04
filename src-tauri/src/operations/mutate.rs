use crate::filesystem::entries::{entry_from_path, FileEntry};
use crate::platform::paths::validate_name;
use std::path::PathBuf;
use tauri::Emitter;

pub fn create_directory(dir: &str, name: &str) -> Result<(), String> {
    let parent = PathBuf::from(dir);
    if !parent.is_dir() {
        return Err("This location is not a directory.".into());
    }
    let target = parent.join(validate_name(name)?);
    if target.exists() {
        return Err("An item with this name already exists.".into());
    }
    std::fs::create_dir(&target).map_err(|error| error.to_string())
}

pub fn create_file(dir: &str, name: &str) -> Result<FileEntry, String> {
    let parent = PathBuf::from(dir);
    if !parent.is_dir() {
        return Err("This location is not a directory.".into());
    }
    let target = parent.join(validate_name(name)?);
    if target.exists() {
        return Err("An item with this name already exists.".into());
    }
    std::fs::File::create(&target).map_err(|error| error.to_string())?;
    entry_from_path(&target)
}

pub fn rename_entry(path: &str, new_name: &str) -> Result<FileEntry, String> {
    let source = PathBuf::from(path);
    if !source.exists() {
        return Err("This item no longer exists.".into());
    }
    let parent = source
        .parent()
        .ok_or_else(|| "Cannot rename this item.".to_string())?;
    let target = parent.join(validate_name(new_name)?);
    if target == source {
        return entry_from_path(&source);
    }
    if target.exists() {
        return Err("An item with this name already exists.".into());
    }
    std::fs::rename(&source, &target).map_err(|error| error.to_string())?;
    entry_from_path(&target)
}

pub fn trash_entries(
    app: &tauri::AppHandle,
    paths: &[String],
    cancels: &crate::operations::transfer::TransferCancels,
    id: &str,
) -> Result<(), String> {
    if paths.is_empty() {
        return Err("Nothing selected.".into());
    }
    let targets: Vec<PathBuf> = paths.iter().map(PathBuf::from).collect();
    for target in &targets {
        if !target.exists() {
            return Err(format!("Not found: {}", target.to_string_lossy()));
        }
    }

    let measured = crate::operations::transfer::measure_all(&targets);
    let mut progress = crate::operations::transfer::TransferProgress {
        id: id.to_string(),
        cut: false,
        kind: "trash".to_string(),
        done_files: 0,
        total_files: measured.files,
        total_bytes: measured.bytes,
        done_bytes: 0,
        finished: false,
        error: None,
    };
    let _ = app.emit(crate::events::TRANSFER_PROGRESS, &progress);

    let mut errors: Vec<String> = Vec::new();
    for target in &targets {
        if crate::operations::transfer::is_cancelled(id, cancels) {
            break;
        }
        let measured = crate::operations::transfer::scan_source(target);
        match trash::delete(target) {
            Ok(()) => {
                progress.done_files = progress.done_files.saturating_add(measured.files.max(1));
                progress.done_bytes = progress.done_bytes.saturating_add(measured.bytes);
                let _ = app.emit(crate::events::TRANSFER_PROGRESS, &progress);
            }
            Err(error) => errors.push(format!("{}: {error}", target.to_string_lossy())),
        }
    }

    if let Ok(mut set) = cancels.0.lock() {
        set.remove(id);
    }
    progress.finished = true;
    if !errors.is_empty() {
        progress.error = Some(errors.join("\n"));
        let _ = app.emit(crate::events::TRANSFER_PROGRESS, &progress);
        return Err(errors.join("\n"));
    }
    let _ = app.emit(crate::events::TRANSFER_PROGRESS, &progress);
    Ok(())
}

pub fn restore_trash(ids: &[String]) -> Result<usize, String> {
    crate::platform::trash::restore_items(ids)
}

pub fn empty_trash() -> Result<usize, String> {
    crate::platform::trash::purge_all()
}

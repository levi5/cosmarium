use super::transfer::{is_cancelled, TransferCancels, TransferProgress};
use std::io::{Read, Write};
use std::path::Path;
use std::time::{Duration, Instant};

pub(super) fn destination_error(source: &Path, target: &Path, error: std::io::Error) -> String {
    let name = source.file_name().unwrap_or_default().to_string_lossy();
    let reason = if name.ends_with(' ') || name.ends_with('.') {
        Some("it ends with a space or a dot")
    } else if name
        .chars()
        .any(|character| character.is_control() || "<>:\"\\|?*".contains(character))
    {
        Some("it contains characters forbidden by FAT/exFAT/NTFS")
    } else {
        None
    };
    if error.kind() == std::io::ErrorKind::InvalidInput || error.raw_os_error() == Some(22) {
        if let Some(reason) = reason {
            return format!(
                "Cannot copy {source:?}: the destination filesystem rejected the name {name:?}; \
                 {reason}. Rename this item at the source and try again. ({error})"
            );
        }
    }
    format!("Cannot copy {source:?} to {target:?}: {error}")
}

pub fn checkpoint(id: &str, controls: &TransferCancels) -> Result<(), String> {
    loop {
        if is_cancelled(id, controls) {
            return Err("Transfer cancelled.".into());
        }
        let paused = controls
            .paused
            .lock()
            .map_err(|_| "Internal error.")?
            .contains(id);
        if !paused {
            return Ok(());
        }
        std::thread::sleep(Duration::from_millis(80));
    }
}

pub fn copy_file(
    source: &Path,
    target: &Path,
    progress: &mut TransferProgress,
    emit: &dyn Fn(&TransferProgress),
    controls: &TransferCancels,
) -> Result<(), String> {
    let metadata = source
        .symlink_metadata()
        .map_err(|error| error.to_string())?;
    if !metadata.is_file() || metadata.file_type().is_symlink() {
        return Err("Only regular files can be copied. Symbolic links were not followed.".into());
    }
    let mut input = std::fs::File::open(source).map_err(|error| error.to_string())?;
    let mut output = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(target)
        .map_err(|error| destination_error(source, target, error))?;
    let result = (|| {
        let mut buffer = vec![0; 1024 * 1024];
        let mut last_emit = Instant::now();
        loop {
            checkpoint(&progress.id, controls)?;
            let count = input.read(&mut buffer).map_err(|error| error.to_string())?;
            if count == 0 {
                break;
            }
            output
                .write_all(&buffer[..count])
                .map_err(|error| error.to_string())?;
            progress.done_bytes = progress.done_bytes.saturating_add(count as u64);
            if progress.done_bytes == count as u64
                || last_emit.elapsed() >= Duration::from_millis(100)
            {
                emit(progress);
                last_emit = Instant::now();
            }
        }
        output.sync_all().map_err(|error| error.to_string())?;
        std::fs::set_permissions(target, metadata.permissions())
            .map_err(|error| error.to_string())?;
        progress.done_files += 1;
        emit(progress);
        Ok(())
    })();
    drop(output);
    if result.is_err() {
        let _ = std::fs::remove_file(target);
    }
    result
}

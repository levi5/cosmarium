use super::transfer::{is_cancelled, TransferCancels, TransferProgress};
use std::io::{Read, Write};
use std::path::Path;
use std::time::{Duration, Instant};

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
        .map_err(|error| error.to_string())?;
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

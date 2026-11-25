use super::{scan::is_real_directory, ConflictResolution, TransferCancels, TransferProgress};
use crate::operations::transfer_io::{checkpoint, copy_file, destination_error};
use std::path::Path;

pub fn copy_tree(
    source: &Path,
    target: &Path,
    progress: &mut TransferProgress,
    emit: &dyn Fn(&TransferProgress),
    controls: &TransferCancels,
    fix_names: bool,
    resolutions: &[ConflictResolution],
) -> Result<(), String> {
    let mut stack = vec![(source.to_path_buf(), target.to_path_buf())];
    while let Some((from_dir, to_dir)) = stack.pop() {
        checkpoint(&progress.id, controls)?;
        if from_dir != source {
            std::fs::create_dir(&to_dir)
                .map_err(|error| destination_error(&from_dir, &to_dir, error))?;
        }
        let entries = if fix_names {
            super::names::plan_entries(&from_dir, &to_dir, resolutions)?
        } else {
            super::names::read_entries(&from_dir)?
                .into_iter()
                .map(|from| {
                    let to = to_dir.join(from.file_name().unwrap_or_default());
                    (from, to)
                })
                .collect()
        };
        for (from, to) in entries {
            checkpoint(&progress.id, controls)?;
            let metadata = from.symlink_metadata().map_err(|error| error.to_string())?;
            if is_real_directory(&metadata) {
                stack.push((from, to));
            } else {
                copy_file(&from, &to, progress, emit, controls)
                    .map_err(|error| format!("{}: {error}", from.display()))?;
            }
        }
    }
    Ok(())
}

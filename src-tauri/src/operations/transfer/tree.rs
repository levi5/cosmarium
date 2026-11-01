use super::{scan::is_real_directory, TransferCancels, TransferProgress};
use crate::operations::transfer_io::{checkpoint, copy_file};
use std::path::Path;

pub fn copy_tree(
    source: &Path,
    target: &Path,
    progress: &mut TransferProgress,
    emit: &dyn Fn(&TransferProgress),
    controls: &TransferCancels,
) -> Result<(), String> {
    let mut stack = vec![(source.to_path_buf(), target.to_path_buf())];
    while let Some((from_dir, to_dir)) = stack.pop() {
        checkpoint(&progress.id, controls)?;
        if from_dir != source {
            std::fs::create_dir(&to_dir)
                .map_err(|error| format!("{}: {error}", to_dir.display()))?;
        }
        let reader = std::fs::read_dir(&from_dir)
            .map_err(|error| format!("{}: {error}", from_dir.display()))?;
        for entry in reader {
            checkpoint(&progress.id, controls)?;
            let entry = entry.map_err(|error| error.to_string())?;
            let from = entry.path();
            let to = to_dir.join(entry.file_name());
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

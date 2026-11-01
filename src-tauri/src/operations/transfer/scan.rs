use super::models::{SourceSize, TransferConflict, TransferScan};
use std::path::{Path, PathBuf};

pub fn is_real_directory(metadata: &std::fs::Metadata) -> bool {
    metadata.is_dir() && !metadata.file_type().is_symlink()
}

pub fn scan_source(root: &Path) -> SourceSize {
    let mut total = SourceSize::zero();
    let mut stack = vec![root.to_path_buf()];
    while let Some(path) = stack.pop() {
        let Ok(metadata) = path.symlink_metadata() else {
            continue;
        };
        if !is_real_directory(&metadata) {
            total.files += 1;
            total.bytes = total.bytes.saturating_add(metadata.len());
            continue;
        }
        let Ok(reader) = std::fs::read_dir(&path) else {
            continue;
        };
        stack.extend(reader.filter_map(Result::ok).map(|entry| entry.path()));
    }
    total
}

pub fn measure_all(paths: &[PathBuf]) -> SourceSize {
    let mut total = SourceSize::zero();
    for path in paths {
        total.merge(scan_source(path));
    }
    total
}

pub fn scan_sources(sources: &[String]) -> SourceSize {
    measure_all(&sources.iter().map(PathBuf::from).collect::<Vec<_>>())
}

pub fn validate(sources: &[String], destination: &Path) -> Result<(), String> {
    let destination = std::fs::canonicalize(destination).map_err(|error| error.to_string())?;
    if !destination.is_dir() {
        return Err("The destination is not a directory.".into());
    }
    if sources.is_empty() {
        return Err("Nothing selected.".into());
    }
    let mut resolved = Vec::new();
    let mut names = std::collections::HashSet::new();
    for source in sources {
        let metadata = std::fs::symlink_metadata(source).map_err(|error| error.to_string())?;
        if metadata.file_type().is_symlink() {
            return Err("Symbolic links are not supported for transfers.".into());
        }
        let source = std::fs::canonicalize(source).map_err(|error| error.to_string())?;
        if source.is_dir() && destination.starts_with(&source) {
            return Err("Cannot copy a folder into itself.".into());
        }
        if resolved
            .iter()
            .any(|previous: &PathBuf| source.starts_with(previous) || previous.starts_with(&source))
        {
            return Err("Do not select the same item or a folder and its children twice.".into());
        }
        if !names.insert(
            source
                .file_name()
                .ok_or("Cannot transfer a root folder.")?
                .to_os_string(),
        ) {
            return Err("Selected items have duplicate names. Transfer them separately.".into());
        }
        resolved.push(source);
    }
    Ok(())
}

pub fn scan_transfer(sources: &[String], destination: &str) -> Result<TransferScan, String> {
    let destination = Path::new(destination);
    validate(sources, destination)?;
    let measured = scan_sources(sources);
    let conflicts = sources
        .iter()
        .filter_map(|source| {
            let path = Path::new(source);
            let name = path.file_name()?.to_str()?;
            destination
                .join(name)
                .symlink_metadata()
                .is_ok()
                .then(|| TransferConflict {
                    name: name.into(),
                    is_dir: path.is_dir(),
                })
        })
        .collect();
    Ok(TransferScan {
        files: measured.files,
        bytes: measured.bytes,
        conflicts,
    })
}

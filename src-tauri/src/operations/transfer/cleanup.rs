use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};

fn same_contents(source: &Path, target: &Path) -> Result<(), String> {
    let metadata = source
        .symlink_metadata()
        .map_err(|error| error.to_string())?;
    if !metadata.is_file() || metadata.file_type().is_symlink() {
        return Err(format!("Source changed: {}", source.display()));
    }
    let mut input = File::open(source).map_err(|error| error.to_string())?;
    let mut output = File::open(target).map_err(|error| error.to_string())?;
    let mut remaining = metadata.len();
    if remaining != output.metadata().map_err(|error| error.to_string())?.len() {
        return Err(format!("Source changed: {}", source.display()));
    }
    let mut left = [0; 64 * 1024];
    let mut right = [0; 64 * 1024];
    while remaining > 0 {
        let length = remaining.min(left.len() as u64) as usize;
        input
            .read_exact(&mut left[..length])
            .map_err(|error| error.to_string())?;
        output
            .read_exact(&mut right[..length])
            .map_err(|error| error.to_string())?;
        if left[..length] != right[..length] {
            return Err(format!("Source changed: {}", source.display()));
        }
        remaining -= length as u64;
    }
    Ok(())
}

pub fn remove_copied_source(source: &Path, target: &Path) -> Result<(), String> {
    let mut pending = vec![(source.to_path_buf(), target.to_path_buf())];
    let mut files = Vec::new();
    let mut directories: Vec<PathBuf> = Vec::new();
    while let Some((original, copied)) = pending.pop() {
        let metadata = original
            .symlink_metadata()
            .map_err(|error| error.to_string())?;
        if metadata.file_type().is_symlink() {
            return Err(format!("Source changed: {}", original.display()));
        }
        if metadata.is_dir() {
            for entry in std::fs::read_dir(&copied).map_err(|error| error.to_string())? {
                let entry = entry.map_err(|error| error.to_string())?;
                pending.push((original.join(entry.file_name()), entry.path()));
            }
            directories.push(original);
        } else {
            same_contents(&original, &copied)?;
            files.push(original);
        }
    }
    for file in files {
        std::fs::remove_file(&file).map_err(|error| {
            format!(
                "The copy is safe, but the source could not be removed: {}: {error}",
                file.display()
            )
        })?;
    }
    for directory in directories.into_iter().rev() {
        std::fs::remove_dir(&directory).map_err(|error| {
            format!(
                "The copy is safe. New or unavailable source entries were preserved: {}: {error}",
                directory.display()
            )
        })?;
    }
    Ok(())
}

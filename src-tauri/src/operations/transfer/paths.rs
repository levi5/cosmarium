use std::path::{Path, PathBuf};

pub fn unique_target(destination: &Path, name: &str) -> Result<PathBuf, String> {
    let (stem, extension) = name
        .rsplit_once('.')
        .filter(|(stem, _)| !stem.is_empty())
        .map_or((name, None), |(stem, extension)| (stem, Some(extension)));
    for counter in 1..=10_000 {
        let name = match extension {
            Some(extension) => format!("{stem} (copy {counter}).{extension}"),
            None => format!("{stem} (copy {counter})"),
        };
        let candidate = destination.join(name);
        if candidate.symlink_metadata().is_err() {
            return Ok(candidate);
        }
    }
    Err("Could not generate a unique file name.".into())
}

pub fn remove_target(target: &Path) -> Result<(), String> {
    let metadata = match target.symlink_metadata() {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(error.to_string()),
    };
    let result = if super::scan::is_real_directory(&metadata) {
        std::fs::remove_dir_all(target)
    } else {
        std::fs::remove_file(target)
    };
    result.map_err(|error| error.to_string())
}

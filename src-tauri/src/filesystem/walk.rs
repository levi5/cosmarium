use std::path::{Path, PathBuf};

pub fn files(root: &Path, limit: usize) -> Result<Vec<PathBuf>, String> {
    let mut pending = vec![root.to_path_buf()];
    let mut result = Vec::new();
    let mut visited = 0;
    while let Some(path) = pending.pop() {
        visited += 1;
        if visited > limit {
            return Err(format!(
                "Too many entries (limit: {limit}). Choose a smaller folder."
            ));
        }
        let metadata = path
            .symlink_metadata()
            .map_err(|error| format!("{}: {error}", path.display()))?;
        if metadata.file_type().is_symlink() {
            continue;
        }
        if metadata.is_dir() {
            for entry in std::fs::read_dir(&path).map_err(|error| error.to_string())? {
                pending.push(entry.map_err(|error| error.to_string())?.path());
            }
        } else if metadata.is_file() {
            result.push(path);
        }
    }
    result.sort();
    Ok(result)
}

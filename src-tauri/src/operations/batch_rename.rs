use crate::filesystem::entries::{entry_from_path, FileEntry};
use crate::platform::paths::validate_name;
use crate::platform::rename::without_replacement;
use serde::Deserialize;
use std::collections::HashSet;
use std::path::{Path, PathBuf};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameItem {
    pub path: String,
    pub new_name: String,
}

fn plan(items: &[RenameItem]) -> Result<Vec<(PathBuf, PathBuf)>, String> {
    if items.is_empty() || items.len() > 10_000 {
        return Err("Select between 1 and 10000 items.".into());
    }
    let mut sources = HashSet::new();
    let mut targets = HashSet::new();
    let mut result = Vec::new();
    for item in items {
        let source = std::fs::canonicalize(&item.path).map_err(|error| error.to_string())?;
        if Path::new(&item.path)
            .symlink_metadata()
            .map_err(|error| error.to_string())?
            .file_type()
            .is_symlink()
        {
            return Err("Renaming symbolic links in a batch is not supported.".into());
        }
        let name = validate_name(&item.new_name)?;
        let target = source
            .parent()
            .ok_or("Cannot rename a root folder.")?
            .join(name);
        if !sources.insert(source.clone()) || !targets.insert(target.clone()) {
            return Err("The rename contains duplicate paths.".into());
        }
        if source != target && target.symlink_metadata().is_ok() {
            return Err(format!("Already exists: {}", target.display()));
        }
        result.push((source, target));
    }
    if result.iter().any(|(source, _)| {
        result
            .iter()
            .any(|(other, _)| source != other && source.starts_with(other))
    }) {
        return Err("Do not rename a folder and its children in the same batch.".into());
    }
    Ok(result)
}

pub fn execute(items: &[RenameItem]) -> Result<Vec<FileEntry>, String> {
    let changes = plan(items)?;
    let mut completed: Vec<(&PathBuf, &PathBuf)> = Vec::new();
    for (source, target) in &changes {
        if source == target {
            continue;
        }
        if let Err(error) = without_replacement(source, target) {
            let mut errors = vec![error];
            for (from, to) in completed.into_iter().rev() {
                if let Err(rollback) = without_replacement(to, from) {
                    errors.push(format!("Rollback {}: {rollback}", to.display()));
                }
            }
            return Err(errors.join("\n"));
        }
        completed.push((source, target));
    }
    changes
        .iter()
        .map(|(_, target)| entry_from_path(target))
        .collect()
}

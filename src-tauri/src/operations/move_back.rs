use crate::platform::rename::without_replacement;
use std::path::Path;

pub fn execute(from: &[String], to: &[String]) -> Result<(), String> {
    if from.len() != to.len() {
        return Err("Invalid undo operation.".into());
    }
    let changes: Vec<_> = to
        .iter()
        .zip(from)
        .filter(|(source, target)| source != target)
        .collect();
    for (source, target) in &changes {
        if !Path::new(source).exists() {
            return Err(format!("Not found: {source}"));
        }
        if Path::new(target).symlink_metadata().is_ok() {
            return Err(format!(
                "Already exists: {target}. Move it before retrying undo."
            ));
        }
    }
    let mut completed = Vec::new();
    for (source, target) in changes {
        if let Err(error) = without_replacement(Path::new(source), Path::new(target)) {
            let mut errors = vec![error];
            for (original, moved) in completed.into_iter().rev() {
                if let Err(rollback) = without_replacement(Path::new(moved), Path::new(original)) {
                    errors.push(format!("Rollback failed: {rollback}"));
                }
            }
            return Err(errors.join("\n"));
        }
        completed.push((source, target));
    }
    Ok(())
}

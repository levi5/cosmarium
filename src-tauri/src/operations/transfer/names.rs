use super::{ConflictResolution, TransferConflict, TransferNameChange, TransferRequest};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

pub fn enabled(request: &TransferRequest) -> bool {
    // Moves need an exact source/destination mapping for cleanup and undo.
    if request.cut || !request.fix_incompatible_names {
        return false;
    }
    restricted_filesystem(Path::new(&request.dest))
}

pub fn restricted_filesystem(destination: &Path) -> bool {
    #[cfg(target_os = "linux")]
    {
        rustix::fs::statfs(destination)
            .map(|stat| matches!(stat.f_type as u64, 0x4d44 | 0x2011bab0 | 0x5346544e))
            .unwrap_or(false)
    }
    #[cfg(target_os = "windows")]
    {
        let _ = destination;
        true
    }
    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    {
        let _ = destination;
        false
    }
}

pub fn read_entries(source: &Path) -> Result<Vec<PathBuf>, String> {
    let mut entries = std::fs::read_dir(source)
        .map_err(|error| format!("{source:?}: {error}"))?
        .map(|entry| entry.map(|entry| entry.path()))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;
    // Preserve already-compatible names before considering corrected names.
    entries.sort_by_key(|path| {
        let name = path.file_name().unwrap_or_default().to_string_lossy();
        (
            compatible_name(&name) != name,
            path.file_name().unwrap_or_default().to_os_string(),
        )
    });
    Ok(entries)
}

pub fn inspect(
    sources: &[String],
) -> Result<(Vec<TransferNameChange>, Vec<TransferConflict>), String> {
    let mut changes = Vec::new();
    let mut conflicts = Vec::new();
    let mut pending: Vec<PathBuf> = sources.iter().map(PathBuf::from).collect();
    while let Some(source) = pending.pop() {
        let metadata = source
            .symlink_metadata()
            .map_err(|error| error.to_string())?;
        let name = source
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or("Invalid file name.")?;
        let corrected = compatible_name(name);
        if corrected != name {
            changes.push(TransferNameChange {
                source: source.to_string_lossy().into_owned(),
                suggested_name: corrected,
            });
        }
        if super::scan::is_real_directory(&metadata) {
            let entries = read_entries(&source)?;
            let mut seen = HashSet::new();
            for entry in &entries {
                let name = entry
                    .file_name()
                    .and_then(|name| name.to_str())
                    .ok_or("Invalid file name.")?;
                let corrected = compatible_name(name);
                if !seen.insert(corrected.to_lowercase()) {
                    conflicts.push(TransferConflict {
                        name: entry.to_string_lossy().into_owned(),
                        is_dir: entry.is_dir(),
                        destination_name: Some(corrected),
                    });
                }
            }
            pending.extend(entries);
        }
    }
    Ok((changes, conflicts))
}

// Resolve collisions before copying any sibling, including queued directories.
// No suffix is allocated unless the user explicitly selected keep_both.
pub fn plan_entries(
    source: &Path,
    destination: &Path,
    resolutions: &[ConflictResolution],
) -> Result<Vec<(PathBuf, PathBuf)>, String> {
    let entries = read_entries(source)?;
    let mut reserved: HashSet<String> = entries
        .iter()
        .map(|path| {
            compatible_name(&path.file_name().unwrap_or_default().to_string_lossy()).to_lowercase()
        })
        .collect();
    let mut selected: Vec<Option<(PathBuf, PathBuf)>> = Vec::new();
    let mut winners: HashMap<String, usize> = HashMap::new();
    for entry in entries {
        let name = entry
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or("Invalid file name.")?;
        let corrected = compatible_name(name);
        let key = corrected.to_lowercase();
        let mut target = destination.join(&corrected);
        if let Some(previous) = winners.get(&key).copied() {
            let action = resolutions
                .iter()
                .find(|resolution| resolution.name == entry.to_string_lossy())
                .map(|resolution| resolution.action.as_str());
            match action {
                Some("skip") => continue,
                Some("replace") => selected[previous] = None,
                Some("keep_both") => {
                    target = allocate(destination, &corrected, &mut reserved)?;
                }
                _ => return Err(format!(
                    "Name conflict after correction: {entry:?} → {corrected:?}. Review the transfer conflicts."
                )),
            }
        }
        // Keep-both gets its own key; later collisions still refer to the base name.
        winners.insert(
            target
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_lowercase(),
            selected.len(),
        );
        selected.push(Some((entry, target)));
    }
    Ok(selected.into_iter().flatten().collect())
}

pub fn compatible_name(name: &str) -> String {
    let name: String = name
        .chars()
        .map(|character| {
            if character.is_control() || "<>:\"\\|?*".contains(character) {
                '_'
            } else {
                character
            }
        })
        .collect();
    let name = name.trim_end_matches([' ', '.']);
    if name.is_empty() {
        return "_".into();
    }
    let base = name.split('.').next().unwrap_or(name).to_ascii_uppercase();
    let reserved = matches!(base.as_str(), "CON" | "PRN" | "AUX" | "NUL")
        || (base.len() == 4
            && (base.starts_with("COM") || base.starts_with("LPT"))
            && matches!(base.as_bytes()[3], b'1'..=b'9'));
    if reserved {
        format!("_{name}")
    } else {
        name.into()
    }
}

// Reserve names before creating queued directories as well as files.
pub fn allocate(
    destination: &Path,
    name: &str,
    reserved: &mut HashSet<String>,
) -> Result<PathBuf, String> {
    let name = compatible_name(name);
    let (stem, extension) = name
        .rsplit_once('.')
        .filter(|(stem, _)| !stem.is_empty())
        .map_or((name.as_str(), None), |(stem, extension)| {
            (stem, Some(extension))
        });
    for counter in 0..=10_000 {
        let candidate = if counter == 0 {
            name.clone()
        } else {
            match extension {
                Some(extension) => format!("{stem} (copy {counter}).{extension}"),
                None => format!("{stem} (copy {counter})"),
            }
        };
        let path = destination.join(&candidate);
        if reserved.contains(&candidate.to_lowercase()) {
            continue;
        }
        match path.symlink_metadata() {
            Ok(_) => continue,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(error.to_string()),
        }
        reserved.insert(candidate.to_lowercase());
        return Ok(path);
    }
    Err("Could not generate a compatible unique file name.".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fixes_only_incompatible_parts() {
        assert_eq!(compatible_name("Terreno "), "Terreno");
        assert_eq!(compatible_name("report:2026?.txt"), "report_2026_.txt");
        assert_eq!(compatible_name("..."), "_");
        assert_eq!(compatible_name("CON.txt"), "_CON.txt");
        assert_eq!(compatible_name("LPT1"), "_LPT1");
        assert_eq!(compatible_name("Imposto de Renda"), "Imposto de Renda");
    }

    #[test]
    fn moves_never_change_names_even_when_the_option_is_enabled() {
        let request = TransferRequest {
            id: "move".into(),
            sources: vec!["/source".into()],
            dest: "/destination".into(),
            cut: true,
            resolutions: Vec::new(),
            fix_incompatible_names: true,
        };
        assert!(!enabled(&request));
    }

    #[test]
    fn old_requests_leave_name_correction_disabled() {
        let request: TransferRequest = serde_json::from_str(
            r#"{"id":"old","sources":["/source"],"dest":"/dest","cut":false,"resolutions":[]}"#,
        )
        .unwrap();
        assert!(!request.fix_incompatible_names);
    }

    #[test]
    fn collisions_include_queued_directories_and_case_variants() {
        let root = tempfile::tempdir().unwrap();
        let mut reserved = HashSet::from(["terreno".into()]);
        let first = allocate(root.path(), "Terreno ", &mut reserved).unwrap();
        let second = allocate(root.path(), "terreno.", &mut reserved).unwrap();
        assert_eq!(first.file_name().unwrap(), "Terreno (copy 1)");
        assert_eq!(second.file_name().unwrap(), "terreno (copy 2)");
    }

    #[test]
    #[cfg(unix)]
    fn copying_a_tree_fixes_nested_names_without_changing_originals() {
        let root = tempfile::tempdir().unwrap();
        let source = root.path().join("source");
        let target = root.path().join("target");
        std::fs::create_dir_all(source.join("Terreno ")).unwrap();
        std::fs::create_dir_all(source.join("Terreno")).unwrap();
        std::fs::create_dir(&target).unwrap();
        std::fs::write(source.join("Terreno /report:2026.txt"), b"renamed").unwrap();
        std::fs::write(source.join("Terreno/original.txt"), b"preserved").unwrap();
        std::fs::write(source.join("report?.txt"), b"question").unwrap();
        std::fs::write(source.join("report*.txt"), b"star").unwrap();
        let mut progress = super::super::TransferProgress {
            id: "names".into(),
            cut: false,
            kind: "copy".into(),
            done_files: 0,
            done_bytes: 0,
            total_files: 4,
            total_bytes: 0,
            finished: false,
            cancelled: false,
            error: None,
        };
        let (_, conflicts) = inspect(&[source.to_string_lossy().into_owned()]).unwrap();
        let resolutions: Vec<_> = conflicts
            .into_iter()
            .map(|conflict| ConflictResolution {
                name: conflict.name,
                action: "keep_both".into(),
            })
            .collect();
        super::super::tree::copy_tree(
            &source,
            &target,
            &mut progress,
            &|_| {},
            &super::super::TransferCancels::default(),
            true,
            &resolutions,
        )
        .unwrap();
        assert_eq!(
            std::fs::read(target.join("Terreno (copy 1)/report_2026.txt")).unwrap(),
            b"renamed"
        );
        assert_eq!(
            std::fs::read(target.join("Terreno/original.txt")).unwrap(),
            b"preserved"
        );
        let mut contents = vec![
            std::fs::read(target.join("report_.txt")).unwrap(),
            std::fs::read(target.join("report_ (copy 1).txt")).unwrap(),
        ];
        contents.sort();
        assert_eq!(contents, vec![b"question".to_vec(), b"star".to_vec()]);
        assert!(source.join("Terreno /report:2026.txt").exists());
        assert!(source.join("report?.txt").exists());
        assert_eq!(progress.done_files, 4);
    }

    #[test]
    #[cfg(unix)]
    fn corrected_conflicts_require_a_choice_and_honor_skip_replace_and_keep_both() {
        let root = tempfile::tempdir().unwrap();
        let source = root.path().join("source");
        let target = root.path().join("target");
        std::fs::create_dir(&source).unwrap();
        std::fs::create_dir(&target).unwrap();
        std::fs::write(source.join("Terreno"), b"original").unwrap();
        std::fs::write(source.join("Terreno "), b"corrected").unwrap();
        let (changes, conflicts) = inspect(&[source.to_string_lossy().into_owned()]).unwrap();
        assert_eq!(changes.len(), 1);
        assert_eq!(changes[0].suggested_name, "Terreno");
        assert_eq!(conflicts.len(), 1);
        assert_eq!(conflicts[0].destination_name.as_deref(), Some("Terreno"));
        assert!(plan_entries(&source, &target, &[]).is_err());
        for (action, expected) in [
            ("skip", vec!["Terreno"]),
            ("replace", vec!["Terreno "]),
            ("keep_both", vec!["Terreno", "Terreno "]),
        ] {
            let plan = plan_entries(
                &source,
                &target,
                &[ConflictResolution {
                    name: source.join("Terreno ").to_string_lossy().into_owned(),
                    action: action.into(),
                }],
            )
            .unwrap();
            let actual: Vec<_> = plan
                .iter()
                .map(|(from, _)| from.file_name().unwrap().to_str().unwrap())
                .collect();
            assert_eq!(actual, expected);
            if action == "keep_both" {
                assert_eq!(plan[1].1.file_name().unwrap(), "Terreno (copy 1)");
            } else {
                assert_eq!(plan[0].1.file_name().unwrap(), "Terreno");
            }
        }
        assert_eq!(
            std::fs::read(source.join("Terreno ")).unwrap(),
            b"corrected"
        );
        assert_eq!(std::fs::read_dir(target).unwrap().count(), 0);
    }
}

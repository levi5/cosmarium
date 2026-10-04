use serde::Serialize;

const UNDO_LIMIT: usize = 50;

#[derive(Serialize, Clone)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum UndoStep {
    RestoreTrash {
        ids: Vec<String>,
        count: usize,
    },
    RemoveCopies {
        paths: Vec<String>,
        count: usize,
    },
    Clear,
    RemoveCreated {
        paths: Vec<String>,
        count: usize,
    },
    Rename {
        from: String,
        to: String,
    },
    MoveBack {
        from: Vec<String>,
        to: Vec<String>,
        count: usize,
    },
}

impl UndoStep {
    fn apply(self) -> Result<(), String> {
        match self {
            UndoStep::Clear => Ok(()),
            UndoStep::RestoreTrash { ids, .. } => {
                crate::platform::trash::restore_items(&ids).map(|_| ())
            }
            UndoStep::RemoveCopies { paths, .. } => remove_paths(&paths),
            UndoStep::RemoveCreated { paths, .. } => remove_paths(&paths),
            UndoStep::Rename { from, to } => {
                std::fs::rename(&to, &from).map_err(|error| error.to_string())
            }
            UndoStep::MoveBack { from, to, .. } => {
                let mut moved = 0;
                for (source, target) in to.iter().zip(from.iter()) {
                    if std::fs::rename(source, target).is_ok() {
                        moved += 1;
                    }
                }
                if moved == 0 {
                    return Err("Could not move the items back.".into());
                }
                Ok(())
            }
        }
    }
}

fn remove_paths(paths: &[String]) -> Result<(), String> {
    let mut removed = 0;
    for path in paths {
        let target = std::path::Path::new(path);
        let removal = if target.is_dir() {
            std::fs::remove_dir_all(target)
        } else {
            std::fs::remove_file(target)
        };
        if removal.is_ok() {
            removed += 1;
        }
    }
    if removed == 0 {
        return Err("Could not remove the created items.".into());
    }
    Ok(())
}

#[derive(Clone, Default)]
pub struct UndoStack {
    steps: std::sync::Arc<std::sync::Mutex<Vec<UndoStep>>>,
}

impl UndoStack {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn push(&self, step: UndoStep) {
        let Ok(mut steps) = self.steps.lock() else {
            return;
        };
        steps.push(step);
        if steps.len() > UNDO_LIMIT {
            let overflow = steps.len() - UNDO_LIMIT;
            steps.drain(0..overflow);
        }
    }

    pub fn clear(&self) {
        if let Ok(mut steps) = self.steps.lock() {
            steps.clear();
        }
    }

    pub fn undo(&self) -> Result<UndoStep, String> {
        let mut steps = self
            .steps
            .lock()
            .map_err(|_| "Internal error.".to_string())?;
        let step = steps.pop().ok_or_else(|| "Nothing to undo.".to_string())?;
        match step.clone().apply() {
            Ok(()) => Ok(step),
            Err(error) => {
                steps.push(step);
                Err(error)
            }
        }
    }
}

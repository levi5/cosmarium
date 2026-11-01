use serde::Serialize;

const UNDO_LIMIT: usize = 50;
type RemoveEntries = dyn Fn(&[String]) -> Result<(), String> + Send + Sync;

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
    fn apply(self, remove: &RemoveEntries) -> Result<(), String> {
        match self {
            UndoStep::Clear => Ok(()),
            UndoStep::RestoreTrash { ids, .. } => {
                crate::platform::trash::restore_items(&ids).map(|_| ())
            }
            UndoStep::RemoveCopies { paths, .. } | UndoStep::RemoveCreated { paths, .. } => {
                remove(&paths)
            }
            UndoStep::Rename { from, to } => super::move_back::execute(&[from], &[to]),
            UndoStep::MoveBack { from, to, .. } => super::move_back::execute(&from, &to),
        }
    }
}

#[derive(Clone)]
pub struct UndoStack {
    steps: std::sync::Arc<std::sync::Mutex<Vec<UndoStep>>>,
    remove: std::sync::Arc<RemoveEntries>,
}

impl Default for UndoStack {
    fn default() -> Self {
        Self {
            steps: Default::default(),
            remove: std::sync::Arc::new(|paths| {
                trash::delete_all(paths).map_err(|error| error.to_string())
            }),
        }
    }
}

impl UndoStack {
    pub fn new() -> Self {
        Self::default()
    }

    #[cfg(test)]
    pub fn with_remover(
        remove: impl Fn(&[String]) -> Result<(), String> + Send + Sync + 'static,
    ) -> Self {
        Self {
            steps: Default::default(),
            remove: std::sync::Arc::new(remove),
        }
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
        match step.clone().apply(self.remove.as_ref()) {
            Ok(()) => Ok(step),
            Err(error) => {
                steps.push(step);
                Err(error)
            }
        }
    }
}

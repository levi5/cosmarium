use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use notify_debouncer_full::{new_debouncer, DebouncedEvent, Debouncer, FileIdMap};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{Emitter, Manager};

const DEBOUNCE: Duration = Duration::from_millis(250);

type BoxDebouncer = Debouncer<RecommendedWatcher, FileIdMap>;

#[derive(Default)]
pub struct WatcherState {
    active: Mutex<HashMap<String, BoxDebouncer>>,
}

impl WatcherState {
    pub fn new() -> Self {
        Self {
            active: Mutex::new(HashMap::new()),
        }
    }
}

pub fn watch_directory(
    state: &WatcherState,
    app: &tauri::AppHandle,
    path: String,
) -> Result<(), String> {
    let directory = PathBuf::from(&path);
    if !directory.is_dir() {
        return Err("This location is not a directory.".into());
    }

    let watch_path = path.clone();
    let app_handle = app.clone();
    let mut debouncer = new_debouncer(
        DEBOUNCE,
        None,
        move |result: notify_debouncer_full::DebounceEventResult| {
            let Ok(events) = result else { return };
            if events.iter().any(is_relevant) {
                let _ = app_handle.emit(crate::events::FS_CHANGED, &watch_path);
            }
        },
    )
    .map_err(|error| error.to_string())?;

    debouncer
        .watcher()
        .watch(&directory, RecursiveMode::NonRecursive)
        .map_err(|error| error.to_string())?;

    let mut active = state
        .active
        .lock()
        .map_err(|_| "Internal error.".to_string())?;
    active.insert(path, debouncer);
    Ok(())
}

fn is_relevant(event: &DebouncedEvent) -> bool {
    use notify::EventKind;
    !matches!(event.kind, EventKind::Access(_))
}

fn clear_map(map: &Mutex<HashMap<String, BoxDebouncer>>) {
    if let Ok(mut active) = map.lock() {
        active.clear();
    }
}

pub fn unwatch_directory(state: &WatcherState, path: &str) {
    if let Ok(mut active) = state.active.lock() {
        active.remove(path);
    }
}

pub fn unwatch_all(app: &tauri::AppHandle) {
    if let Some(state) = app.try_state::<WatcherState>() {
        clear_map(&state.active);
    }
}

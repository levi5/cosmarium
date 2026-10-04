use tauri::{AppHandle, State};

use crate::platform::open;
use crate::watcher::{self, WatcherState};

#[tauri::command]
pub fn open_with_default(path: String) -> Result<(), String> {
    open::open_with_default(&path)
}

#[tauri::command]
pub fn watch_directory(
    state: State<'_, WatcherState>,
    app: AppHandle,
    path: String,
) -> Result<(), String> {
    watcher::watch_directory(&state, &app, path)
}

#[tauri::command]
pub fn unwatch_directory(state: State<'_, WatcherState>, path: String) -> Result<(), String> {
    watcher::unwatch_directory(&state, &path);
    Ok(())
}

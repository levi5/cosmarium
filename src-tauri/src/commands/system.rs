use tauri::{AppHandle, State};

use crate::platform::applications;
use crate::platform::open;
use crate::watcher::{self, WatcherState};

#[tauri::command]
pub fn open_with_default(path: String) -> Result<(), String> {
    open::open_with_default(&path)
}

#[tauri::command]
pub async fn list_applications(path: String) -> Result<Vec<applications::Application>, String> {
    super::off_thread(move || applications::list_applications(&path)).await
}

#[tauri::command]
pub async fn open_with_application(path: String, app_id: String) -> Result<(), String> {
    super::off_thread(move || applications::open_with_application(&path, &app_id)).await
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

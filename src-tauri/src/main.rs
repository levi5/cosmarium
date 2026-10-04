#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod events;
mod filesystem;
mod operations;
mod platform;
mod watcher;

use std::fs;
use std::path::PathBuf;

use operations::transfer::TransferCancels;
use operations::undo::UndoStack;
use serde::{Deserialize, Serialize};
use tauri::{
    Manager, PhysicalPosition, PhysicalSize, Position, Runtime, Size, WebviewWindow, WindowEvent,
};
use watcher::WatcherState;

#[derive(Deserialize, Serialize)]
struct SavedWindowState {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    maximized: bool,
}

fn window_state_path<R: Runtime>(window: &WebviewWindow<R>) -> Result<PathBuf, String> {
    let directory = window
        .app_handle()
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory.join("window-state.json"))
}

fn save_window_state<R: Runtime>(window: &WebviewWindow<R>) -> Result<(), String> {
    let position = window.outer_position().map_err(|error| error.to_string())?;
    let size = window.outer_size().map_err(|error| error.to_string())?;
    let state = SavedWindowState {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        maximized: window.is_maximized().map_err(|error| error.to_string())?,
    };
    let data = serde_json::to_vec(&state).map_err(|error| error.to_string())?;
    fs::write(window_state_path(window)?, data).map_err(|error| error.to_string())
}

fn restore_window_state<R: Runtime>(window: &WebviewWindow<R>) {
    let Ok(path) = window_state_path(window) else {
        return;
    };
    let Ok(data) = fs::read(path) else { return };
    let Ok(state) = serde_json::from_slice::<SavedWindowState>(&data) else {
        return;
    };
    if !state.maximized {
        let _ = window.set_size(Size::Physical(PhysicalSize::new(state.width, state.height)));
        let _ = window.set_position(Position::Physical(PhysicalPosition::new(state.x, state.y)));
    }
    if state.maximized {
        let _ = window.maximize();
    }
}

fn main() {
    tauri::Builder::default()
        .manage(TransferCancels::default())
        .manage(UndoStack::new())
        .manage(WatcherState::new())
        .invoke_handler(tauri::generate_handler![
            commands::fs_read::get_locations,
            commands::fs_read::get_volumes,
            commands::fs_read::list_directory,
            commands::fs_read::get_parent_directory,
            commands::fs_read::search_entries,
            commands::fs_read::recent_entries,
            commands::fs_read::read_text_preview,
            commands::fs_read::get_folder_stats,
            commands::fs_read::get_folder_sizes,
            commands::fs_write::create_directory,
            commands::fs_write::create_file,
            commands::fs_write::rename_entry,
            commands::fs_write::trash_entries,
            commands::fs_write::empty_trash,
            commands::fs_write::record_created,
            commands::fs_write::record_rename,
            commands::fs_write::undo_last,
            commands::fs_read::trash_count,
            commands::trash::trash_list,
            commands::trash::restore_trash_items,
            commands::ops_transfer::scan_transfer,
            commands::ops_transfer::transfer_entries,
            commands::ops_transfer::cancel_transfer,
            commands::system::open_with_default,
            commands::system::watch_directory,
            commands::system::unwatch_directory,
        ])
        .setup(|app| {
            let window = app
                .get_webview_window("main")
                .expect("main window should exist");
            restore_window_state(&window);
            let state_window = window.clone();
            let app_handle = app.handle().clone();
            window.on_window_event(move |event| match event {
                WindowEvent::Moved(_)
                | WindowEvent::Resized(_)
                | WindowEvent::CloseRequested { .. } => {
                    let _ = save_window_state(&state_window);
                }
                WindowEvent::Destroyed => watcher::unwatch_all(&app_handle),
                _ => {}
            });
            window.show()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Cosmarium");
}

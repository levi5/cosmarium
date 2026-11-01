use super::off_thread;
use crate::operations::transfer::{
    self, TransferCancels, TransferRequest, TransferScan, TransferSummary,
};
use crate::operations::undo::UndoStack;
use tauri::{AppHandle, Emitter, State};

#[tauri::command]
pub async fn scan_transfer(sources: Vec<String>, dest: String) -> Result<TransferScan, String> {
    off_thread(move || transfer::scan_transfer(&sources, &dest)).await
}

#[tauri::command]
pub fn cancel_transfer(id: String, cancels: State<'_, TransferCancels>) -> Result<(), String> {
    transfer::cancel_transfer(id, &cancels)
}

#[tauri::command]
pub fn pause_transfer(
    id: String,
    paused: bool,
    cancels: State<'_, TransferCancels>,
) -> Result<(), String> {
    let mut entries = cancels.paused.lock().map_err(|_| "Internal error.")?;
    if paused {
        entries.insert(id);
    } else {
        entries.remove(&id);
    }
    Ok(())
}

#[tauri::command]
pub async fn transfer_entries(
    app: AppHandle,
    request: TransferRequest,
    cancels: State<'_, TransferCancels>,
    undo: State<'_, UndoStack>,
) -> Result<TransferSummary, String> {
    let cancels = cancels.inner().clone();
    let undo = undo.inner().clone();
    off_thread(move || {
        transfer::execute(&request, &cancels, &undo, &|progress| {
            let _ = app.emit(crate::events::TRANSFER_PROGRESS, progress);
        })
    })
    .await
}

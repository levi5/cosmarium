use super::off_thread;
use crate::operations::transfer::{
    self, TransferCancels, TransferRequest, TransferScan, TransferSummary,
};
use crate::operations::undo::UndoStack;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn scan_transfer(sources: Vec<String>, dest: String) -> Result<TransferScan, String> {
    off_thread(move || transfer::scan_transfer(&sources, &dest)).await
}

#[tauri::command]
pub fn cancel_transfer(id: String, cancels: State<'_, TransferCancels>) -> Result<(), String> {
    transfer::cancel_transfer(id, &cancels)
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
    off_thread(move || transfer::transfer_entries(&app, request, &cancels, &undo)).await
}

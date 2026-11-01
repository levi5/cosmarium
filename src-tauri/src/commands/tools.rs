use super::off_thread;
use crate::filesystem::{
    duplicates::{self, DuplicateGroup},
    entries::FileEntry,
};
use crate::operations::{
    archive,
    batch_rename::{self, RenameItem},
    undo::{UndoStack, UndoStep},
};
use tauri::State;

#[tauri::command]
pub async fn find_duplicates(root: String) -> Result<Vec<DuplicateGroup>, String> {
    off_thread(move || duplicates::find(&root)).await
}

#[tauri::command]
pub async fn batch_rename(
    items: Vec<RenameItem>,
    undo: State<'_, UndoStack>,
) -> Result<Vec<FileEntry>, String> {
    let undo = undo.inner().clone();
    off_thread(move || {
        let entries = batch_rename::execute(&items)?;
        let from = items.iter().map(|item| item.path.clone()).collect();
        let to = entries.iter().map(|entry| entry.path.clone()).collect();
        undo.push(UndoStep::MoveBack {
            from,
            to,
            count: entries.len(),
        });
        Ok(entries)
    })
    .await
}

#[tauri::command]
pub async fn compress_zip(
    sources: Vec<String>,
    destination: String,
    name: String,
    undo: State<'_, UndoStack>,
) -> Result<String, String> {
    let undo = undo.inner().clone();
    off_thread(move || {
        let path = archive::compress(&sources, &destination, &name)?;
        undo.push(UndoStep::RemoveCreated {
            paths: vec![path.clone()],
            count: 1,
        });
        Ok(path)
    })
    .await
}

#[tauri::command]
pub async fn extract_zip(
    source: String,
    destination: String,
    name: String,
    undo: State<'_, UndoStack>,
) -> Result<String, String> {
    let undo = undo.inner().clone();
    off_thread(move || {
        let path = archive::extract(&source, &destination, &name)?;
        undo.push(UndoStep::RemoveCreated {
            paths: vec![path.clone()],
            count: 1,
        });
        Ok(path)
    })
    .await
}

#[tauri::command]
pub async fn open_terminal(path: String) -> Result<(), String> {
    off_thread(move || crate::platform::terminal::open(&path)).await
}

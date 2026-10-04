use super::off_thread;
use crate::filesystem::entries::FileEntry;
use crate::operations::mutate;
use crate::operations::transfer::TransferCancels;
use crate::operations::undo::{UndoStack, UndoStep};
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn create_directory(path: String, name: String) -> Result<FileEntry, String> {
    off_thread(move || {
        mutate::create_directory(&path, &name)?;
        let target = std::path::Path::new(&path).join(name.trim());
        crate::filesystem::entries::entry_from_path(&target)
    })
    .await
}

#[tauri::command]
pub async fn create_file(path: String, name: String) -> Result<FileEntry, String> {
    off_thread(move || mutate::create_file(&path, &name)).await
}

#[tauri::command]
pub async fn rename_entry(path: String, new_name: String) -> Result<FileEntry, String> {
    off_thread(move || mutate::rename_entry(&path, &new_name)).await
}

#[tauri::command]
pub async fn trash_entries(
    app: AppHandle,
    paths: Vec<String>,
    id: String,
    undo: State<'_, UndoStack>,
    cancels: State<'_, TransferCancels>,
) -> Result<(), String> {
    let undo = undo.inner().clone();
    let cancels = cancels.inner().clone();
    off_thread(move || {
        mutate::trash_entries(&app, &paths, &cancels, &id)?;
        let fresh = crate::platform::trash::list_items().unwrap_or_default();
        let known: std::collections::HashSet<String> = fresh
            .iter()
            .map(|item| item.original_path.clone())
            .collect();
        let restored: Vec<String> = paths
            .iter()
            .filter(|path| known.contains(*path))
            .cloned()
            .collect();
        let ids: Vec<String> = fresh
            .into_iter()
            .filter(|item| restored.contains(&item.original_path))
            .map(|item| item.id)
            .collect();
        if !ids.is_empty() {
            undo.push(UndoStep::RestoreTrash {
                ids,
                count: restored.len(),
            });
        }
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn empty_trash(undo: State<'_, UndoStack>) -> Result<usize, String> {
    let undo = undo.inner().clone();
    off_thread(move || {
        let removed = mutate::empty_trash()?;
        undo.push(UndoStep::Clear);
        Ok(removed)
    })
    .await
}

#[tauri::command]
pub async fn record_created(paths: Vec<String>, undo: State<'_, UndoStack>) -> Result<(), String> {
    let undo = undo.inner().clone();
    off_thread(move || {
        if !paths.is_empty() {
            undo.push(UndoStep::RemoveCreated {
                count: paths.len(),
                paths,
            });
        }
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn record_rename(
    from: String,
    to: String,
    undo: State<'_, UndoStack>,
) -> Result<(), String> {
    undo.inner().push(UndoStep::Rename { from, to });
    Ok(())
}

#[tauri::command]
pub async fn undo_last(undo: State<'_, UndoStack>) -> Result<UndoStep, String> {
    let stack = undo.inner().clone();
    off_thread(move || stack.undo()).await
}

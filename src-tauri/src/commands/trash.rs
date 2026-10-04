use super::off_thread;
use crate::operations::mutate;
use crate::operations::undo::UndoStack;
use crate::platform::trash::TrashEntry;
use tauri::State;

#[tauri::command]
pub async fn trash_list() -> Result<Vec<TrashEntry>, String> {
    off_thread(crate::platform::trash::list_items).await
}

#[tauri::command]
pub async fn restore_trash_items(
    ids: Vec<String>,
    undo: State<'_, UndoStack>,
) -> Result<usize, String> {
    let stack = undo.inner().clone();
    off_thread(move || {
        let restored = mutate::restore_trash(&ids)?;
        stack.clear();
        Ok(restored)
    })
    .await
}

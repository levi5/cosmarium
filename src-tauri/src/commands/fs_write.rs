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
) -> Result<mutate::TrashSummary, String> {
    let undo = undo.inner().clone();
    let cancels = cancels.inner().clone();
    off_thread(move || {
        let _queue = cancels.queue.lock().map_err(|_| "Internal error.")?;
        let before = crate::platform::trash::list_items()?;
        let mut summary = mutate::trash_entries(&app, &paths, &cancels, &id)?;
        let fresh = match crate::platform::trash::list_items() {
            Ok(items) => items,
            Err(error) => {
                summary
                    .errors
                    .push(format!("Could not record trash undo: {error}"));
                return Ok(summary);
            }
        };
        let ids = new_trash_ids(&before, fresh, &summary.removed);
        if !ids.is_empty() {
            undo.push(UndoStep::RestoreTrash {
                count: ids.len(),
                ids,
            });
        }
        Ok(summary)
    })
    .await
}

fn new_trash_ids(
    before: &[crate::platform::trash::TrashEntry],
    after: Vec<crate::platform::trash::TrashEntry>,
    removed: &[String],
) -> Vec<String> {
    let known: std::collections::HashSet<_> = before.iter().map(|item| &item.id).collect();
    let removed: std::collections::HashSet<_> = removed.iter().collect();
    after
        .into_iter()
        .filter(|item| !known.contains(&item.id) && removed.contains(&item.original_path))
        .map(|item| item.id)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn item(id: &str, path: &str) -> crate::platform::trash::TrashEntry {
        crate::platform::trash::TrashEntry {
            id: id.into(),
            name: "file.txt".into(),
            original_path: path.into(),
            deleted_at: 0,
            size: 1,
            entries: 1,
            is_dir: false,
        }
    }

    #[test]
    fn trash_undo_excludes_old_items_and_unrelated_deletions() {
        let before = vec![item("old", "/file.txt")];
        let after = vec![
            item("old", "/file.txt"),
            item("new", "/file.txt"),
            item("other", "/other.txt"),
        ];
        assert_eq!(
            new_trash_ids(&before, after, &["/file.txt".into()]),
            vec!["new"]
        );
    }

    #[test]
    fn cancelled_deletions_do_not_record_undo_for_old_items() {
        assert!(new_trash_ids(&[], vec![item("old", "/file.txt")], &[]).is_empty());
    }
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

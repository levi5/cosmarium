use super::off_thread;
use crate::filesystem::entries::{self, FileEntry, SearchQuery};
use crate::filesystem::recent::{self, RecentQuery};
use crate::filesystem::stats::{self, FolderStats, MAX_STATS_ENTRIES};
use crate::platform::locations;
use crate::platform::paths::parent_of;
use crate::platform::volumes::{self, Volume};
use std::collections::HashMap;
use tauri::Manager;

#[tauri::command]
pub async fn prepare_media_preview<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    path: String,
) -> Result<String, String> {
    let canonical =
        off_thread(move || crate::filesystem::preview::media_preview_path(&path)).await?;
    app.asset_protocol_scope()
        .allow_file(&canonical)
        .map_err(|error| error.to_string())?;
    Ok(canonical.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn get_locations(app: tauri::AppHandle) -> Result<locations::Locations, String> {
    off_thread(move || locations::get_locations(&app)).await
}

#[tauri::command]
pub async fn get_volumes() -> Result<Vec<Volume>, String> {
    off_thread(|| Ok(volumes::get_volumes())).await
}

#[tauri::command]
pub async fn trash_count() -> Result<usize, String> {
    off_thread(crate::platform::trash::count_items).await
}

#[tauri::command]
pub async fn list_directory(path: String) -> Result<Vec<FileEntry>, String> {
    off_thread(move || entries::list_directory(&path)).await
}

#[tauri::command]
pub fn get_parent_directory(path: String) -> Result<String, String> {
    parent_of(&path).ok_or_else(|| "This is the root directory.".to_string())
}

#[tauri::command]
pub async fn search_entries(query: SearchQuery) -> Result<Vec<FileEntry>, String> {
    off_thread(move || entries::search_entries(&query)).await
}

#[tauri::command]
pub async fn recent_entries(query: RecentQuery) -> Result<Vec<FileEntry>, String> {
    off_thread(move || recent::recent_entries(&query)).await
}

#[tauri::command]
pub async fn read_text_preview(
    path: String,
) -> Result<crate::filesystem::preview::TextPreview, String> {
    off_thread(move || crate::filesystem::preview::read_text_preview(&path)).await
}

#[tauri::command]
pub async fn get_folder_stats(path: String) -> Result<FolderStats, String> {
    off_thread(move || {
        if !std::path::Path::new(&path).is_dir() {
            return Err("This location is not a directory.".into());
        }
        Ok(stats::collect_folder_stats(std::path::Path::new(&path)))
    })
    .await
}

#[tauri::command]
pub async fn get_folder_sizes(
    paths: Vec<String>,
) -> std::result::Result<HashMap<String, FolderStats>, String> {
    off_thread(move || {
        let mut out = HashMap::with_capacity(paths.len().min(1024));
        let mut budget = MAX_STATS_ENTRIES;
        for key in paths {
            let path = std::path::Path::new(&key);
            if budget == 0 || !path.is_dir() {
                continue;
            }
            let computed = stats::collect_budgeted(path, &mut budget);
            if computed.truncated {
                continue;
            }
            out.insert(key, computed);
        }
        Ok(out)
    })
    .await
}

#[cfg(test)]
mod preview_tests {
    use super::*;

    #[test]
    fn preview_authorization_does_not_allow_siblings_or_glob_matches() {
        let app = tauri::test::mock_builder()
            .build(tauri::test::mock_context(tauri::test::noop_assets()))
            .unwrap();
        let scope = app.asset_protocol_scope();
        let directory = tempfile::tempdir().unwrap();
        let image = directory.path().join("photo[1].png");
        let sibling = directory.path().join("photo1.png");
        let secret = directory.path().join("secret.txt");
        for path in [&image, &sibling, &secret] {
            std::fs::write(path, b"fixture").unwrap();
            assert!(!scope.is_allowed(path));
        }
        let result = tauri::async_runtime::block_on(prepare_media_preview(
            app.handle().clone(),
            image.to_string_lossy().into_owned(),
        ))
        .unwrap();
        assert_eq!(
            std::path::PathBuf::from(result),
            std::fs::canonicalize(&image).unwrap()
        );
        assert!(scope.is_allowed(&image));
        assert!(!scope.is_allowed(&sibling));
        assert!(!scope.is_allowed(&secret));
        assert!(!scope.is_allowed(directory.path()));
        assert!(tauri::async_runtime::block_on(prepare_media_preview(
            app.handle().clone(),
            secret.to_string_lossy().into_owned()
        ))
        .is_err());
        assert!(!scope.is_allowed(&secret));
    }
}

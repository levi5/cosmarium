use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::Manager;

#[derive(Serialize)]
pub struct Locations {
    pub home: String,
    pub desktop: String,
    pub downloads: String,
    pub documents: String,
    pub pictures: String,
    pub music: String,
    pub videos: String,
    pub trash: String,
}

#[cfg(target_os = "macos")]
fn env_home() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var_os("USERPROFILE").map(PathBuf::from)
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var_os("HOME").map(PathBuf::from)
    }
}

fn trash_directory(home: &Path) -> String {
    #[cfg(target_os = "windows")]
    {
        home.to_string_lossy().into_owned()
    }
    #[cfg(not(target_os = "windows"))]
    {
        let path = home.join(".local/share/Trash/files");
        if path.is_dir() {
            return path.to_string_lossy().into_owned();
        }
        let fallback = home.join(".Trash");
        if fallback.is_dir() {
            fallback.to_string_lossy().into_owned()
        } else {
            home.to_string_lossy().into_owned()
        }
    }
}

#[cfg(target_os = "macos")]
pub fn trash_root() -> Option<PathBuf> {
    env_home().map(|home| PathBuf::from(trash_directory(&home)))
}

pub fn get_locations(app: &tauri::AppHandle) -> Result<Locations, String> {
    let resolver = app.path();
    let home = resolver.home_dir().map_err(|error| error.to_string())?;
    let home_text = home.to_string_lossy().into_owned();
    let pick = |dir: Result<PathBuf, tauri::Error>| match dir {
        Ok(path) if path.is_dir() => path.to_string_lossy().into_owned(),
        _ => home_text.clone(),
    };
    Ok(Locations {
        trash: trash_directory(&home),
        home: home_text.clone(),
        desktop: pick(resolver.desktop_dir()),
        downloads: pick(resolver.download_dir()),
        documents: pick(resolver.document_dir()),
        pictures: pick(resolver.picture_dir()),
        music: pick(resolver.audio_dir()),
        videos: pick(resolver.video_dir()),
    })
}

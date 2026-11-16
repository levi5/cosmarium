use std::path::Path;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingPath {
    pub path: String,
    pub is_directory: bool,
}

#[derive(Default)]
pub struct StartupState {
    pending: Mutex<Option<PendingPath>>,
}

impl StartupState {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn set(&self, path: Option<PendingPath>) {
        if let Ok(mut pending) = self.pending.lock() {
            *pending = path;
        }
    }

    pub fn take(&self) -> Option<PendingPath> {
        self.pending
            .lock()
            .unwrap_or_else(|error| error.into_inner())
            .take()
    }
}

#[tauri::command]
pub fn take_startup_path(state: State<'_, StartupState>) -> Option<PendingPath> {
    state.take()
}

pub fn startup_path_from_args() -> Option<PendingPath> {
    std::env::args()
        .skip(1)
        .filter_map(|argument| {
            let trimmed = argument.trim_start_matches('-');
            if trimmed.is_empty() {
                return None;
            }
            let path = Path::new(trimmed);
            if !path.is_absolute() || !path.exists() {
                return None;
            }
            Some(PendingPath {
                path: trimmed.to_string(),
                is_directory: path.is_dir(),
            })
        })
        .next()
}

pub fn register_pending_path(app: &AppHandle) -> Option<PendingPath> {
    let pending = startup_path_from_args();
    if let Some(path) = &pending {
        app.state::<StartupState>().set(Some(path.clone()));
    }
    pending
}

#[cfg(test)]
mod tests {
    #[test]
    fn linux_packages_register_as_a_file_manager() {
        let config: serde_json::Value =
            serde_json::from_str(include_str!("../../tauri.conf.json")).unwrap();
        for format in ["deb", "rpm"] {
            assert_eq!(
                config["bundle"]["linux"][format]["desktopTemplate"],
                "linux/Cosmarium.desktop"
            );
        }
        let desktop = include_str!("../../linux/Cosmarium.desktop");
        assert!(desktop.contains("Exec={{exec}} %f\n"));
        assert!(desktop.contains("MimeType=inode/directory;"));
        assert!(desktop.contains("{{mime_type}}"));
        assert!(desktop.contains("FileManager;"));
    }
}

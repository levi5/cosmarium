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
    path_from_args(std::env::args().skip(1))
}

fn path_from_args(args: impl IntoIterator<Item = String>) -> Option<PendingPath> {
    args.into_iter().find_map(|argument| {
        if argument.is_empty() || argument.starts_with('-') {
            return None;
        }
        let path = Path::new(&argument).canonicalize().ok()?;
        Some(PendingPath {
            path: path.to_string_lossy().into_owned(),
            is_directory: path.is_dir(),
        })
    })
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
    use super::path_from_args;

    #[test]
    fn resolves_relative_startup_paths() {
        let pending = path_from_args([".".to_string()]).unwrap();
        assert_eq!(
            pending.path,
            std::env::current_dir()
                .unwrap()
                .canonicalize()
                .unwrap()
                .to_string_lossy()
        );
        assert!(pending.is_directory);
    }

    #[test]
    fn ignores_options_and_missing_paths() {
        assert!(path_from_args([
            "--help".to_string(),
            "nonexistent-cosmarium-path".to_string()
        ])
        .is_none());
    }

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
        assert!(desktop.lines().any(|line| line == "Exec={{exec}} %f"));
        assert!(desktop.contains("MimeType=inode/directory;"));
        assert!(desktop.contains("{{mime_type}}"));
        assert!(desktop.contains("FileManager;"));
    }
}

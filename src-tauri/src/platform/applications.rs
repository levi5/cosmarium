#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Application {
    pub id: String,
    pub name: String,
    pub is_default: bool,
}

fn validate_file(path: &str) -> Result<std::path::PathBuf, String> {
    let path = std::fs::canonicalize(path).map_err(|error| error.to_string())?;
    if !path.is_file() {
        return Err("Select a file to choose an application.".into());
    }
    Ok(path)
}

#[cfg(target_os = "linux")]
fn compatible_apps(
    path: &std::path::Path,
) -> Result<(Vec<gtk::gio::AppInfo>, Option<String>), String> {
    use gtk::gio::{self, prelude::*};
    let file = gio::File::for_path(path);
    let info = file
        .query_info(
            "standard::content-type",
            gio::FileQueryInfoFlags::NONE,
            gio::Cancellable::NONE,
        )
        .map_err(|error| error.to_string())?;
    let content_type = info
        .content_type()
        .ok_or("Could not determine the file type.")?;
    let default = gio::AppInfo::default_for_type(&content_type, false)
        .and_then(|app| app.id())
        .map(|id| id.to_string());
    Ok((gio::AppInfo::all_for_type(&content_type), default))
}

pub fn list_applications(path: &str) -> Result<Vec<Application>, String> {
    let path = validate_file(path)?;
    #[cfg(target_os = "linux")]
    {
        use gtk::gio::prelude::*;
        let (apps, default) = compatible_apps(&path)?;
        let mut applications: Vec<_> = apps
            .into_iter()
            .filter(|app| app.should_show())
            .filter_map(|app| {
                let id = app.id()?.to_string();
                Some(Application {
                    is_default: default.as_ref() == Some(&id),
                    id,
                    name: app.display_name().to_string(),
                })
            })
            .collect();
        applications.sort_by(|a, b| {
            b.is_default
                .cmp(&a.is_default)
                .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
        });
        applications.dedup_by(|a, b| a.id == b.id);
        Ok(applications)
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = path;
        Err("Application selection is not available on this platform yet.".into())
    }
}

pub fn open_with_application(path: &str, app_id: &str) -> Result<(), String> {
    let path = validate_file(path)?;
    #[cfg(target_os = "linux")]
    {
        use gtk::gio::{self, prelude::*};
        let (apps, _) = compatible_apps(&path)?;
        let app = apps
            .into_iter()
            .find(|app| app.id().as_deref() == Some(app_id))
            .ok_or("This application is no longer available for this file type.")?;
        // Let GIO expand desktop-entry arguments; never interpolate a shell command.
        app.launch(&[gio::File::for_path(path)], gio::AppLaunchContext::NONE)
            .map_err(|error| error.to_string())
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = (path, app_id);
        Err("Application selection is not available on this platform yet.".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_missing_files_and_directories() {
        let root = tempfile::TempDir::new().unwrap();
        assert!(list_applications(root.path().to_str().unwrap()).is_err());
        assert!(
            open_with_application(root.path().join("missing").to_str().unwrap(), "app").is_err()
        );
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn rejects_unregistered_application_ids() {
        let root = tempfile::TempDir::new().unwrap();
        let file = root.path().join("note.txt");
        std::fs::write(&file, b"hello").unwrap();
        assert!(
            open_with_application(file.to_str().unwrap(), "cosmarium-nonexistent-app.desktop")
                .is_err()
        );
    }
}

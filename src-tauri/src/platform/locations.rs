use serde::Serialize;

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

fn home_directory() -> Result<std::path::PathBuf, String> {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(std::path::PathBuf::from)
        .ok_or_else(|| "Could not determine the home directory.".to_string())
}

fn user_directory(home: &std::path::Path, name: &str) -> String {
    let path = home.join(name);
    let resolved = if path.is_dir() {
        path
    } else {
        home.to_path_buf()
    };
    resolved.to_string_lossy().into_owned()
}

fn trash_directory(home: &std::path::Path) -> String {
    #[cfg(target_os = "windows")]
    {
        return home.to_string_lossy().into_owned();
    }
    #[cfg(not(target_os = "windows"))]
    {
        let path = home.join(".local/share/Trash/files");
        if path.is_dir() {
            return path.to_string_lossy().into_owned();
        }
        user_directory(home, ".Trash")
    }
}

pub fn get_locations() -> Result<Locations, String> {
    let home = home_directory()?;
    Ok(Locations {
        home: home.to_string_lossy().into_owned(),
        desktop: user_directory(&home, "Desktop"),
        downloads: user_directory(&home, "Downloads"),
        documents: user_directory(&home, "Documents"),
        pictures: user_directory(&home, "Pictures"),
        music: user_directory(&home, "Music"),
        videos: user_directory(&home, "Videos"),
        trash: trash_directory(&home),
    })
}

use std::path::Path;

pub fn parent_of(path: &str) -> Option<String> {
    Path::new(path)
        .parent()
        .map(|parent| parent.to_string_lossy().into_owned())
}

pub fn validate_name(name: &str) -> Result<String, String> {
    let clean = name.trim().to_string();
    if clean.is_empty() || clean == "." || clean == ".." {
        return Err("Choose a valid name.".into());
    }
    if clean.contains('/') || clean.contains('\\') || clean.contains('\0') {
        return Err("The name contains invalid characters.".into());
    }
    #[cfg(target_os = "windows")]
    {
        if clean.chars().any(|c| "<>:\"|?*".contains(c))
            || clean.ends_with('.')
            || clean.ends_with(' ')
        {
            return Err("The name contains invalid characters.".into());
        }
        let stem = clean
            .split('.')
            .next()
            .unwrap_or_default()
            .to_ascii_uppercase();
        const RESERVED: [&str; 25] = [
            "CON", "PRN", "AUX", "NUL", "CLOCK$", "CONIN$", "CONOUT$", "COM1", "COM2", "COM3",
            "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5",
            "LPT6", "LPT7", "LPT8", "LPT9",
        ];
        if RESERVED.contains(&stem.as_str()) {
            return Err("The name is reserved on Windows.".into());
        }
    }
    Ok(clean)
}

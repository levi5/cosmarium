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
    }
    Ok(clean)
}

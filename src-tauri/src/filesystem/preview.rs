use std::fs;
use std::path::{Path, PathBuf};

pub const PREVIEW_MAX_BYTES: usize = 512 * 1024;
const MAX_SNIFF_BYTES: usize = 4096;

pub fn media_preview_path(path: &str) -> Result<PathBuf, String> {
    let canonical = fs::canonicalize(path).map_err(|error| error.to_string())?;
    if !canonical.is_file() {
        return Err("Choose a regular media file.".into());
    }
    let extension = canonical
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    if !matches!(
        extension.as_str(),
        "webp"
            | "bmp"
            | "ico"
            | "avif"
            | "gif"
            | "jpeg"
            | "jpg"
            | "png"
            | "svg"
            | "webm"
            | "mp4"
            | "mov"
            | "m4v"
            | "ogv"
            | "mp3"
            | "wav"
            | "ogg"
            | "flac"
            | "m4a"
            | "aac"
            | "opus"
            | "pdf"
    ) {
        return Err("This file type is not supported for media preview.".into());
    }
    fs::File::open(&canonical).map_err(|error| error.to_string())?;
    Ok(canonical)
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TextPreview {
    pub text: String,
    pub truncated: bool,
    pub is_text: bool,
    pub size: u64,
}

pub fn read_text_preview(path: &str) -> Result<TextPreview, String> {
    let file = Path::new(path);
    let metadata = fs::metadata(file).map_err(|error| error.to_string())?;
    if !metadata.is_file() {
        return Err("not a file".to_string());
    }
    let size = metadata.len();
    if size == 0 {
        return Ok(TextPreview {
            text: String::new(),
            truncated: false,
            is_text: true,
            size,
        });
    }

    let handle = fs::File::open(file).map_err(|error| error.to_string())?;
    let mut reader = std::io::BufReader::new(handle);
    use std::io::Read;

    let mut sniff = vec![0u8; MAX_SNIFF_BYTES.min(size as usize)];
    reader
        .read_exact(&mut sniff)
        .map_err(|error| error.to_string())?;
    if sniff.contains(&0) {
        return Ok(TextPreview {
            text: String::new(),
            truncated: false,
            is_text: false,
            size,
        });
    }

    let mut buffer = sniff;
    let read_len = (PREVIEW_MAX_BYTES as u64).saturating_sub(buffer.len() as u64);
    let mut extra = vec![0u8; read_len as usize];
    let mut filled = 0usize;
    if read_len > 0 {
        filled = reader.read(&mut extra).unwrap_or(0);
    }
    buffer.extend_from_slice(&extra[..filled]);

    let truncated = size > buffer.len() as u64;
    match String::from_utf8(buffer) {
        Ok(mut text) => {
            if truncated {
                text.push_str("\n\n…");
            }
            Ok(TextPreview {
                text,
                truncated,
                is_text: true,
                size,
            })
        }
        Err(error) => {
            let bytes = error.into_bytes();
            if bytes.contains(&0) {
                return Ok(TextPreview {
                    text: String::new(),
                    truncated: false,
                    is_text: false,
                    size,
                });
            }
            let mut text = bytes.iter().map(|byte| *byte as char).collect::<String>();
            if truncated {
                text.push_str("\n\n…");
            }
            Ok(TextPreview {
                text,
                truncated,
                is_text: true,
                size,
            })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn media_preview_requires_a_supported_readable_regular_file() {
        let directory = tempfile::tempdir().unwrap();
        let image = directory.path().join("photo.PNG");
        fs::write(&image, b"preview").unwrap();
        assert_eq!(
            media_preview_path(image.to_str().unwrap()).unwrap(),
            fs::canonicalize(&image).unwrap()
        );
        let secret = directory.path().join("secret.txt");
        fs::write(&secret, b"private").unwrap();
        assert!(media_preview_path(secret.to_str().unwrap()).is_err());
        assert!(media_preview_path(directory.path().to_str().unwrap()).is_err());
        assert!(
            media_preview_path(directory.path().join("missing.png").to_str().unwrap()).is_err()
        );
    }

    #[cfg(unix)]
    #[test]
    fn media_preview_validates_the_symlink_target() {
        let directory = tempfile::tempdir().unwrap();
        let secret = directory.path().join("secret.txt");
        fs::write(&secret, b"private").unwrap();
        let alias = directory.path().join("image.png");
        std::os::unix::fs::symlink(&secret, &alias).unwrap();
        assert!(media_preview_path(alias.to_str().unwrap()).is_err());
    }

    #[test]
    fn asset_protocol_starts_with_an_empty_scope() {
        let config: serde_json::Value =
            serde_json::from_str(include_str!("../../tauri.conf.json")).unwrap();
        assert_eq!(
            config["app"]["security"]["assetProtocol"]["scope"],
            serde_json::json!([])
        );
    }
}

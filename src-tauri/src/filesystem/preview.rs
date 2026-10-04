use std::fs;
use std::path::Path;

pub const PREVIEW_MAX_BYTES: usize = 512 * 1024;
const MAX_SNIFF_BYTES: usize = 4096;

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

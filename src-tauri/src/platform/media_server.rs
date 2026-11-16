use std::collections::HashMap;
use std::fs::File;
use std::io::{self, BufRead, BufReader, Read, Seek, SeekFrom, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

const MAX_HEADER_BYTES: usize = 16 * 1024;
const READ_TIMEOUT: Duration = Duration::from_secs(10);
const WRITE_TIMEOUT: Duration = Duration::from_secs(30);
const CORS_ALLOW_HEADERS: &str = "Range";

#[derive(Default)]
struct MediaState {
    by_path: HashMap<PathBuf, String>,
    by_id: HashMap<String, PathBuf>,
}

pub struct MediaServer {
    address: String,
    token: String,
    state: Arc<Mutex<MediaState>>,
    next_id: AtomicU64,
}

impl MediaServer {
    pub fn start() -> io::Result<Self> {
        let listener = TcpListener::bind(("127.0.0.1", 0))?;
        let address = listener.local_addr()?.to_string();
        let mut random = [0u8; 32];
        getrandom::fill(&mut random).map_err(|error| io::Error::other(error.to_string()))?;
        let token = random
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect::<String>();
        let state = Arc::new(Mutex::new(MediaState::default()));
        let thread_state = Arc::clone(&state);
        let thread_token = token.clone();
        thread::Builder::new()
            .name("cosmarium-media".into())
            .spawn(move || serve(listener, thread_token, thread_state))?;
        Ok(Self {
            address,
            token,
            state,
            next_id: AtomicU64::new(1),
        })
    }

    pub fn url_for(&self, path: &Path) -> String {
        let mut state = self.state.lock().unwrap_or_else(|error| error.into_inner());
        let id = state
            .by_path
            .entry(path.to_path_buf())
            .or_insert_with(|| format!("{:016x}", self.next_id.fetch_add(1, Ordering::Relaxed)))
            .clone();
        state.by_id.insert(id.clone(), path.to_path_buf());
        format!("http://{}/{}/{}", self.address, self.token, id)
    }
}

fn serve(listener: TcpListener, token: String, state: Arc<Mutex<MediaState>>) {
    for stream in listener.incoming() {
        let Ok(stream) = stream else { continue };
        let token = token.clone();
        let state = Arc::clone(&state);
        let _ = thread::Builder::new().spawn(move || {
            let _ = handle_connection(stream, &token, &state);
        });
    }
}

fn handle_connection(
    mut stream: TcpStream,
    token: &str,
    state: &Mutex<MediaState>,
) -> io::Result<()> {
    stream.set_read_timeout(Some(READ_TIMEOUT))?;
    stream.set_write_timeout(Some(WRITE_TIMEOUT))?;
    let mut reader = BufReader::new(stream.try_clone()?);
    let mut request_line = String::new();
    if reader.read_line(&mut request_line)? == 0 {
        return Ok(());
    }
    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or_default();
    let target = parts.next().unwrap_or_default().to_string();

    if method == "OPTIONS" {
        return write_preflight(&mut stream);
    }
    if method != "GET" && method != "HEAD" {
        return write_status(&mut stream, "405 Method Not Allowed", "Method not allowed.");
    }

    let mut headers_bytes = request_line.len();
    let mut range = None;
    loop {
        let mut line = String::new();
        if reader.read_line(&mut line)? == 0 {
            break;
        }
        headers_bytes += line.len();
        if headers_bytes > MAX_HEADER_BYTES {
            return write_status(
                &mut stream,
                "431 Request Header Fields Too Large",
                "Header too large.",
            );
        }
        if line == "\r\n" || line == "\n" {
            break;
        }
        if let Some((name, value)) = line.split_once(':') {
            if name.trim().eq_ignore_ascii_case("range") {
                range = Some(value.trim().to_string());
            }
        }
    }

    let path = match resolve_target(&target, token, state) {
        Some(path) => path,
        None => return write_status(&mut stream, "404 Not Found", "Not found."),
    };
    let mut file = match File::open(&path) {
        Ok(file) => file,
        Err(_) => return write_status(&mut stream, "404 Not Found", "Not found."),
    };
    let metadata = match file.metadata() {
        Ok(metadata) if metadata.is_file() => metadata,
        _ => return write_status(&mut stream, "404 Not Found", "Not found."),
    };
    let length = metadata.len();
    let content_type = content_type_for(&path);

    if length == 0 {
        return write_headers(
            &mut stream,
            "200 OK",
            &[("Content-Type", content_type.to_string())],
            0,
        );
    }
    let Some((start, end)) = range
        .as_deref()
        .map_or(Some((0, length - 1)), |value| parse_range(value, length))
    else {
        return write_headers(
            &mut stream,
            "416 Range Not Satisfiable",
            &[("Content-Range", format!("bytes */{length}"))],
            0,
        );
    };
    let partial = range.is_some();

    if partial {
        file.seek(SeekFrom::Start(start))?;
    }
    let content_length = end - start + 1;
    let mut headers = vec![
        ("Content-Type", content_type.to_string()),
        ("Accept-Ranges", "bytes".to_string()),
        ("Cache-Control", "no-store".to_string()),
    ];
    if partial {
        headers.push(("Content-Range", format!("bytes {start}-{end}/{length}")));
    }
    let status = if partial {
        "206 Partial Content"
    } else {
        "200 OK"
    };
    write_headers(&mut stream, status, &headers, content_length)?;
    if method == "HEAD" {
        return Ok(());
    }
    io::copy(&mut file.take(content_length), &mut stream)?;
    stream.flush()
}

fn resolve_target(target: &str, token: &str, state: &Mutex<MediaState>) -> Option<PathBuf> {
    let rest = target.strip_prefix('/')?;
    let (request_token, id) = rest.split_once('/')?;
    if request_token != token || id.is_empty() || id.contains('/') {
        return None;
    }
    state
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .by_id
        .get(id)
        .cloned()
}

fn parse_range(header: &str, length: u64) -> Option<(u64, u64)> {
    if length == 0 {
        return None;
    }
    let spec = header.strip_prefix("bytes=")?;
    if spec.contains(',') {
        return None;
    }
    let (start_text, end_text) = spec.split_once('-')?;
    if start_text.is_empty() {
        let suffix = end_text.parse::<u64>().ok()?;
        if suffix == 0 {
            return None;
        }
        return Some((length.saturating_sub(suffix), length - 1));
    }
    let start = start_text.parse::<u64>().ok()?;
    if start >= length {
        return None;
    }
    let end = if end_text.is_empty() {
        length - 1
    } else {
        end_text.parse::<u64>().ok()?.min(length - 1)
    };
    (end >= start).then_some((start, end))
}

fn content_type_for(path: &Path) -> &'static str {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    match extension.as_str() {
        "avif" => "image/avif",
        "bmp" => "image/bmp",
        "gif" => "image/gif",
        "ico" => "image/x-icon",
        "jpeg" | "jpg" => "image/jpeg",
        "png" => "image/png",
        "svg" => "image/svg+xml",
        "webp" => "image/webp",
        "m4v" => "video/x-m4v",
        "mkv" => "video/x-matroska",
        "mov" => "video/quicktime",
        "mp4" => "video/mp4",
        "ogv" => "video/ogg",
        "avi" => "video/x-msvideo",
        "webm" => "video/webm",
        "aac" => "audio/aac",
        "flac" => "audio/flac",
        "m4a" => "audio/mp4",
        "mp3" => "audio/mpeg",
        "ogg" | "opus" => "audio/ogg",
        "wav" => "audio/wav",
        "pdf" => "application/pdf",
        _ => "application/octet-stream",
    }
}

fn cors_headers() -> [(&'static str, &'static str); 4] {
    [
        ("Access-Control-Allow-Origin", "*"),
        ("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS"),
        ("Access-Control-Allow-Headers", CORS_ALLOW_HEADERS),
        (
            "Access-Control-Expose-Headers",
            "Content-Range, Accept-Ranges, Content-Length",
        ),
    ]
}

fn write_preflight(stream: &mut TcpStream) -> io::Result<()> {
    let mut head = String::from("HTTP/1.1 204 No Content\r\n");
    for (name, value) in cors_headers() {
        head.push_str(name);
        head.push_str(": ");
        head.push_str(value);
        head.push_str("\r\n");
    }
    head.push_str("Content-Length: 0\r\nConnection: close\r\n\r\n");
    stream.write_all(head.as_bytes())?;
    stream.flush()
}

fn write_status(stream: &mut TcpStream, status: &str, message: &str) -> io::Result<()> {
    write_headers(
        stream,
        status,
        &[("Content-Type", "text/plain; charset=utf-8".into())],
        message.len() as u64,
    )?;
    stream.write_all(message.as_bytes())?;
    stream.flush()
}

fn write_headers(
    stream: &mut TcpStream,
    status: &str,
    headers: &[(&str, String)],
    content_length: u64,
) -> io::Result<()> {
    let mut head = format!("HTTP/1.1 {status}\r\n");
    for (name, value) in cors_headers() {
        head.push_str(name);
        head.push_str(": ");
        head.push_str(value);
        head.push_str("\r\n");
    }
    for (name, value) in headers {
        head.push_str(name);
        head.push_str(": ");
        head.push_str(value);
        head.push_str("\r\n");
    }
    head.push_str(&format!("Content-Length: {content_length}\r\n"));
    head.push_str("Connection: close\r\n\r\n");
    stream.write_all(head.as_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn raw_get(address: &str, target: &str, range: Option<&str>) -> String {
        raw_request(address, target, "GET", range)
    }

    fn raw_request(address: &str, target: &str, method: &str, range: Option<&str>) -> String {
        let mut stream = TcpStream::connect(address).unwrap();
        let mut request = format!("{method} {target} HTTP/1.1\r\nHost: {address}\r\n");
        if let Some(range) = range {
            request.push_str(&format!("Range: {range}\r\n"));
        }
        request.push_str("Connection: close\r\n\r\n");
        stream.write_all(request.as_bytes()).unwrap();
        let mut response = String::new();
        stream.read_to_string(&mut response).unwrap();
        response
    }

    #[test]
    fn parses_single_ranges() {
        assert_eq!(parse_range("bytes=0-99", 1000), Some((0, 99)));
        assert_eq!(parse_range("bytes=500-", 1000), Some((500, 999)));
        assert_eq!(parse_range("bytes=-100", 1000), Some((900, 999)));
        assert_eq!(parse_range("bytes=0-2000", 1000), Some((0, 999)));
        assert_eq!(parse_range("bytes=1000-", 1000), None);
        assert_eq!(parse_range("bytes=50-10", 1000), None);
        assert_eq!(parse_range("bytes=0-1,4-5", 1000), None);
        assert_eq!(parse_range("bytes=0-1", 0), None);
    }

    #[test]
    fn serves_authorized_files_with_ranges_and_rejects_unknown_ids() {
        let directory = tempfile::tempdir().unwrap();
        let file = directory.path().join("clip.mp4");
        std::fs::write(&file, b"0123456789").unwrap();
        let server = MediaServer::start().unwrap();
        let url = server.url_for(std::fs::canonicalize(&file).unwrap().as_path());
        let target = url.trim_start_matches("http://").split_once('/').unwrap().1;
        let target = format!("/{target}");

        let response = raw_get(&server.address, &target, Some("bytes=2-5"));
        assert!(response.starts_with("HTTP/1.1 206 Partial Content"));
        assert!(response.contains("Content-Type: video/mp4"));
        assert!(response.contains("Content-Range: bytes 2-5/10"));
        assert!(response.ends_with("2345"));

        let response = raw_get(
            &server.address,
            &format!("/{}/deadbeef", server.token),
            None,
        );
        assert!(response.starts_with("HTTP/1.1 404 Not Found"));

        let response = raw_get(
            &server.address,
            &target.replace(&server.token, "wrong"),
            None,
        );
        assert!(response.starts_with("HTTP/1.1 404 Not Found"));
    }

    #[test]
    fn streams_large_files_and_ranges_without_truncating_metadata_at_the_end() {
        let directory = tempfile::tempdir().unwrap();
        let file = directory.path().join("large.mp4");
        let mut contents = "x".repeat(2 * 1024 * 1024);
        contents.push_str("metadata-at-end");
        std::fs::write(&file, &contents).unwrap();
        let server = MediaServer::start().unwrap();
        let url = server.url_for(&file);
        let target = format!(
            "/{}",
            url.trim_start_matches("http://").split_once('/').unwrap().1
        );
        let full_range = format!("bytes=0-{}", contents.len() - 1);
        for range in [None, Some("bytes=0-"), Some(full_range.as_str())] {
            let response = raw_get(&server.address, &target, range);
            let (headers, body) = response.split_once("\r\n\r\n").unwrap();
            assert!(headers.contains(&format!("Content-Length: {}", contents.len())));
            assert_eq!(body, contents);
        }
        let response = raw_get(&server.address, &target, Some("bytes=-15"));
        assert!(response.ends_with("metadata-at-end"));
        let response = raw_request(&server.address, &target, "HEAD", None);
        let (headers, body) = response.split_once("\r\n\r\n").unwrap();
        assert!(headers.contains(&format!("Content-Length: {}", contents.len())));
        assert!(body.is_empty());
    }

    #[test]
    fn reuses_a_stable_url_per_path() {
        let server = MediaServer::start().unwrap();
        let path = Path::new("/tmp/example.png");
        assert_eq!(server.url_for(path), server.url_for(path));
    }
}

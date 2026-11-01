use super::walk;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::io::Read;
use std::path::Path;

#[derive(Serialize)]
pub struct DuplicateGroup {
    pub size: u64,
    pub paths: Vec<String>,
}

fn digest(path: &Path) -> Result<Vec<u8>, String> {
    let mut file = std::fs::File::open(path).map_err(|error| error.to_string())?;
    let mut hash = Sha256::new();
    let mut buffer = [0; 64 * 1024];
    loop {
        let read = file.read(&mut buffer).map_err(|error| error.to_string())?;
        if read == 0 {
            break;
        }
        hash.update(&buffer[..read]);
    }
    Ok(hash.finalize().to_vec())
}

pub fn find(root: &str) -> Result<Vec<DuplicateGroup>, String> {
    if !Path::new(root).is_dir() {
        return Err("Choose a folder.".into());
    }
    let mut sizes = BTreeMap::<u64, Vec<std::path::PathBuf>>::new();
    for path in walk::files(Path::new(root), 100_000)? {
        let size = path.metadata().map_err(|error| error.to_string())?.len();
        sizes.entry(size).or_default().push(path);
    }
    let mut groups = Vec::new();
    for (size, paths) in sizes.into_iter().filter(|(_, paths)| paths.len() > 1) {
        let mut hashes = BTreeMap::<Vec<u8>, Vec<String>>::new();
        for path in paths {
            hashes
                .entry(digest(&path)?)
                .or_default()
                .push(path.to_string_lossy().into_owned());
        }
        groups.extend(
            hashes
                .into_values()
                .filter(|paths| paths.len() > 1)
                .map(|paths| DuplicateGroup { size, paths }),
        );
    }
    Ok(groups)
}

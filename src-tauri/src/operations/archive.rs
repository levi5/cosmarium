use crate::platform::paths::validate_name;
use std::fs::{File, OpenOptions};
use std::io::{Read, Write};
use std::path::Path;
use zip::{write::SimpleFileOptions, ZipArchive, ZipWriter};

const MAX_ENTRIES: usize = 100_000;
const MAX_EXTRACTED_BYTES: u64 = 20 * 1024 * 1024 * 1024;

fn add_path(
    writer: &mut ZipWriter<File>,
    path: &Path,
    base: &Path,
    count: &mut usize,
) -> Result<(), String> {
    *count += 1;
    if *count > MAX_ENTRIES {
        return Err("Too many archive entries.".into());
    }
    let metadata = path.symlink_metadata().map_err(|error| error.to_string())?;
    if metadata.file_type().is_symlink() {
        return Err("Symbolic links are not supported in ZIP archives.".into());
    }
    let relative = path.strip_prefix(base).map_err(|error| error.to_string())?;
    if relative.components().count() > 128 {
        return Err("The folder nesting exceeds the ZIP limit (128 levels).".into());
    }
    let name = relative
        .to_str()
        .ok_or("The archive requires UTF-8 file names.")?
        .replace('\\', "/");
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    if metadata.is_dir() {
        writer
            .add_directory(format!("{name}/"), options)
            .map_err(|error| error.to_string())?;
        for entry in std::fs::read_dir(path).map_err(|error| error.to_string())? {
            add_path(
                writer,
                &entry.map_err(|error| error.to_string())?.path(),
                base,
                count,
            )?;
        }
    } else if metadata.is_file() {
        writer
            .start_file(name, options)
            .map_err(|error| error.to_string())?;
        let mut input = File::open(path).map_err(|error| error.to_string())?;
        std::io::copy(&mut input, writer).map_err(|error| error.to_string())?;
    } else {
        return Err("Only regular files and folders can be archived.".into());
    }
    Ok(())
}

pub fn compress(sources: &[String], destination: &str, name: &str) -> Result<String, String> {
    if sources.is_empty() {
        return Err("Nothing selected.".into());
    }
    let directory = std::fs::canonicalize(destination).map_err(|error| error.to_string())?;
    let name = validate_name(name)?;
    if !name.to_lowercase().ends_with(".zip") {
        return Err("Use a .zip file name.".into());
    }
    let target = directory.join(name);
    let mut paths = Vec::new();
    let mut names = std::collections::HashSet::new();
    for source in sources {
        if std::fs::symlink_metadata(source)
            .map_err(|error| error.to_string())?
            .file_type()
            .is_symlink()
        {
            return Err("Symbolic links are not supported in ZIP archives.".into());
        }
        let path = std::fs::canonicalize(source).map_err(|error| error.to_string())?;
        if path.is_dir() && target.starts_with(&path) {
            return Err("The archive cannot be created inside a selected folder.".into());
        }
        if !names.insert(
            path.file_name()
                .ok_or("Cannot archive a root folder.")?
                .to_os_string(),
        ) {
            return Err("Selected items have duplicate names.".into());
        }
        paths.push(path);
    }
    let output = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&target)
        .map_err(|error| error.to_string())?;
    let result = (|| {
        let mut writer = ZipWriter::new(output);
        let mut count = 0;
        for path in paths {
            add_path(
                &mut writer,
                &path,
                path.parent().ok_or("Invalid parent.")?,
                &mut count,
            )?;
        }
        writer.finish().map_err(|error| error.to_string())?;
        Ok(target.to_string_lossy().into_owned())
    })();
    if result.is_err() {
        let _ = std::fs::remove_file(&target);
    }
    result
}

pub fn extract(source: &str, destination: &str, name: &str) -> Result<String, String> {
    let input = File::open(source).map_err(|error| error.to_string())?;
    let mut archive = ZipArchive::new(input).map_err(|error| error.to_string())?;
    if archive.len() > MAX_ENTRIES {
        return Err("Too many archive entries.".into());
    }
    let directory = std::fs::canonicalize(destination).map_err(|error| error.to_string())?;
    let target = directory.join(validate_name(name)?);
    std::fs::create_dir(&target).map_err(|error| error.to_string())?;
    let result = (|| {
        let mut total = 0_u64;
        for index in 0..archive.len() {
            let mut entry = archive.by_index(index).map_err(|error| error.to_string())?;
            if entry.is_symlink() {
                return Err("Symbolic links are not allowed in archives.".into());
            }
            let relative = entry.enclosed_name().ok_or("Unsafe archive path.")?;
            if relative.components().count() > 128 {
                return Err(
                    "The archive nesting exceeds the extraction limit (128 levels).".into(),
                );
            }
            for component in relative.components() {
                if let std::path::Component::Normal(name) = component {
                    validate_name(
                        name.to_str()
                            .ok_or("The archive requires UTF-8 file names.")?,
                    )?;
                }
            }
            let output = target.join(relative);
            if entry.is_dir() {
                std::fs::create_dir_all(&output).map_err(|error| error.to_string())?;
                continue;
            }
            if let Some(parent) = output.parent() {
                std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
            }
            let mut file = OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(output)
                .map_err(|error| error.to_string())?;
            let remaining = MAX_EXTRACTED_BYTES.saturating_sub(total);
            let bytes = std::io::copy(
                &mut (&mut entry).take(remaining.saturating_add(1)),
                &mut file,
            )
            .map_err(|error| error.to_string())?;
            total = total.saturating_add(bytes);
            if total > MAX_EXTRACTED_BYTES {
                return Err("The archive exceeds the extraction limit (20 GiB).".into());
            }
            file.flush().map_err(|error| error.to_string())?;
        }
        Ok(target.to_string_lossy().into_owned())
    })();
    if result.is_err() {
        let _ = std::fs::remove_dir_all(&target);
    }
    result
}

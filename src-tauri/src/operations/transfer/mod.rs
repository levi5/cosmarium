mod cleanup;
mod models;
mod paths;
mod scan;
#[cfg(test)]
mod security_tests;
#[cfg(test)]
mod tests;
mod tree;

pub use models::*;
pub use scan::{measure_all, scan_source, scan_transfer};

use crate::operations::{
    transfer_io,
    undo::{UndoStack, UndoStep},
};
use crate::platform::rename::without_replacement;
use paths::{remove_target, unique_target};
use std::path::{Path, PathBuf};

pub fn cancel_transfer(id: String, controls: &TransferCancels) -> Result<(), String> {
    controls
        .cancelled
        .lock()
        .map_err(|_| "Internal error.")?
        .insert(id);
    Ok(())
}

pub fn is_cancelled(id: &str, controls: &TransferCancels) -> bool {
    controls
        .cancelled
        .lock()
        .map(|set| set.contains(id))
        .unwrap_or(true)
}

struct TransferContext<'a> {
    request: &'a TransferRequest,
    controls: &'a TransferCancels,
    emit: &'a dyn Fn(&TransferProgress),
    progress: TransferProgress,
    summary: TransferSummary,
}

impl TransferContext<'_> {
    fn target(&self, source: &Path) -> Result<Option<(PathBuf, bool)>, String> {
        let name = source
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or("Invalid file name.")?;
        let destination = Path::new(&self.request.dest);
        let target = destination.join(name);
        if target.symlink_metadata().is_err() {
            return Ok(Some((target, false)));
        }
        let action = self
            .request
            .resolutions
            .iter()
            .find(|resolution| resolution.name == name)
            .map(|resolution| resolution.action.as_str())
            .unwrap_or("skip");
        match action {
            "keep_both" => unique_target(destination, name).map(|target| Some((target, false))),
            "replace" => Ok(Some((target, true))),
            "skip" => Ok(None),
            _ => Err("Invalid conflict resolution.".into()),
        }
    }

    fn copy(&mut self, source: &Path, target: &Path) -> Result<(), String> {
        if source.is_dir() {
            std::fs::create_dir(target).map_err(|error| error.to_string())?;
            if let Err(error) =
                tree::copy_tree(source, target, &mut self.progress, self.emit, self.controls)
            {
                let cleanup = remove_target(target);
                return Err(match cleanup {
                    Ok(()) => error,
                    Err(cleanup) => format!(
                        "{error}\nCould not clean up {}: {cleanup}",
                        target.display()
                    ),
                });
            }
        } else {
            transfer_io::copy_file(source, target, &mut self.progress, self.emit, self.controls)?;
        }
        Ok(())
    }

    fn transfer_source(&mut self, source: &str) -> Result<(), String> {
        transfer_io::checkpoint(&self.request.id, self.controls)?;
        let source_path = Path::new(source);
        let parent = source_path
            .parent()
            .and_then(|path| std::fs::canonicalize(path).ok());
        if parent == std::fs::canonicalize(&self.request.dest).ok() {
            self.summary.skipped += 1;
            return Ok(());
        }
        let Some((target, replace)) = self.target(source_path)? else {
            self.summary.skipped += 1;
            return Ok(());
        };
        transfer_io::checkpoint(&self.request.id, self.controls)?;
        if self.request.cut && !replace && without_replacement(source_path, &target).is_ok() {
            let measured = scan::scan_source(&target);
            self.progress.done_files += measured.files;
            self.progress.done_bytes = self.progress.done_bytes.saturating_add(measured.bytes);
        } else {
            let staging = tempfile::Builder::new()
                .prefix(".cosmarium-transfer-")
                .tempdir_in(&self.request.dest)
                .map_err(|error| error.to_string())?;
            let staged = staging.path().join("entry");
            self.copy(source_path, &staged)?;
            transfer_io::checkpoint(&self.request.id, self.controls)?;
            if replace && target.symlink_metadata().is_ok() {
                trash::delete(&target).map_err(|error| error.to_string())?;
            }
            without_replacement(&staged, &target)?;
            if self.request.cut {
                cleanup::remove_copied_source(source_path, &target)?;
            }
        }
        self.summary.copied += 1;
        self.summary
            .touched
            .push((source.into(), target.to_string_lossy().into_owned()));
        (self.emit)(&self.progress);
        Ok(())
    }
}

fn record_undo(request: &TransferRequest, summary: &TransferSummary, undo: &UndoStack) {
    if summary.touched.is_empty() {
        return;
    }
    let targets = summary
        .touched
        .iter()
        .map(|(_, target)| target.clone())
        .collect();
    let step = if request.cut {
        UndoStep::MoveBack {
            from: summary
                .touched
                .iter()
                .map(|(source, _)| source.clone())
                .collect(),
            to: targets,
            count: summary.copied as usize,
        }
    } else {
        UndoStep::RemoveCopies {
            paths: targets,
            count: summary.copied as usize,
        }
    };
    undo.push(step);
}

pub fn execute(
    request: &TransferRequest,
    controls: &TransferCancels,
    undo: &UndoStack,
    emit: &dyn Fn(&TransferProgress),
) -> Result<TransferSummary, String> {
    let _queue = controls.queue.lock().map_err(|_| "Internal error.")?;
    let result = (|| {
        scan::validate(&request.sources, Path::new(&request.dest))?;
        let measured = scan::scan_sources(&request.sources);
        let progress = TransferProgress {
            id: request.id.clone(),
            cut: request.cut,
            kind: if request.cut { "move" } else { "copy" }.into(),
            done_files: 0,
            done_bytes: 0,
            total_files: measured.files,
            total_bytes: measured.bytes,
            finished: false,
            error: None,
        };
        let mut context = TransferContext {
            request,
            controls,
            emit,
            progress,
            summary: TransferSummary::default(),
        };
        emit(&context.progress);
        let mut errors = Vec::new();
        for source in &request.sources {
            if let Err(error) = context.transfer_source(source) {
                if is_cancelled(&request.id, controls) {
                    context.summary.cancelled = true;
                    break;
                }
                errors.push(format!("{source}: {error}"));
            }
        }
        record_undo(request, &context.summary, undo);
        context.progress.finished = true;
        let error = errors.join("\n");
        if !error.is_empty() {
            context.progress.error = Some(error.clone());
        }
        emit(&context.progress);
        context.summary.errors = errors;
        Ok(context.summary)
    })();
    if let Ok(mut cancelled) = controls.cancelled.lock() {
        cancelled.remove(&request.id);
    }
    if let Ok(mut paused) = controls.paused.lock() {
        paused.remove(&request.id);
    }
    result
}

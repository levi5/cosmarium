use crate::operations::undo::{UndoStack, UndoStep};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

#[derive(Clone, Default)]
pub struct TransferCancels(pub Arc<Mutex<HashSet<String>>>);

#[derive(Deserialize)]
pub struct ConflictResolution {
    pub name: String,
    pub action: String,
}

#[derive(Deserialize)]
pub struct TransferRequest {
    pub id: String,
    pub sources: Vec<String>,
    pub dest: String,
    pub cut: bool,
    pub resolutions: Vec<ConflictResolution>,
}

#[derive(Serialize)]
pub struct TransferConflict {
    pub name: String,
    pub is_dir: bool,
}

#[derive(Serialize)]
pub struct TransferScan {
    pub files: u64,
    pub bytes: u64,
    pub conflicts: Vec<TransferConflict>,
}

#[derive(Serialize, Clone)]
pub struct TransferProgress {
    pub id: String,
    pub cut: bool,
    pub kind: String,
    pub done_files: u64,
    pub total_files: u64,
    pub done_bytes: u64,
    pub total_bytes: u64,
    pub finished: bool,
    pub error: Option<String>,
}

#[derive(Serialize)]
pub struct TransferSummary {
    pub copied: u64,
    pub skipped: u64,
    pub cancelled: bool,
}

#[derive(Clone, Copy, Default)]
pub struct SourceSize {
    pub files: u64,
    pub bytes: u64,
}

impl SourceSize {
    pub fn zero() -> Self {
        Self::default()
    }

    fn add_leaf(&mut self, metadata: &std::fs::Metadata) {
        self.files += 1;
        self.bytes = self.bytes.saturating_add(metadata.len());
    }

    pub fn merge(&mut self, other: SourceSize) {
        self.files += other.files;
        self.bytes = self.bytes.saturating_add(other.bytes);
    }
}

fn is_real_directory(metadata: &std::fs::Metadata) -> bool {
    metadata.is_dir() && !metadata.file_type().is_symlink()
}

pub fn scan_source(root: &Path) -> SourceSize {
    let mut total = SourceSize::zero();
    let Ok(metadata) = root.symlink_metadata() else {
        return total;
    };
    if !is_real_directory(&metadata) {
        total.add_leaf(&metadata);
        return total;
    }

    let mut stack = vec![root.to_path_buf()];
    while let Some(current) = stack.pop() {
        let Ok(reader) = std::fs::read_dir(&current) else {
            continue;
        };
        for entry in reader.filter_map(Result::ok) {
            let path = entry.path();
            let Ok(child_metadata) = path.symlink_metadata() else {
                continue;
            };
            if !is_real_directory(&child_metadata) {
                total.add_leaf(&child_metadata);
                continue;
            }
            stack.push(path);
        }
    }
    total
}

pub fn scan_sources(sources: &[String]) -> SourceSize {
    let mut total = SourceSize::zero();
    for source in sources {
        total.merge(scan_source(Path::new(source)));
    }
    total
}

pub fn measure_all(paths: &[PathBuf]) -> SourceSize {
    let mut total = SourceSize::zero();
    for path in paths {
        total.merge(scan_source(path));
    }
    total
}

fn split_file_name(file_name: &str) -> (&str, Option<&str>) {
    match file_name.rfind('.').filter(|&index| index > 0) {
        Some(index) => (&file_name[..index], Some(&file_name[index + 1..])),
        None => (file_name, None),
    }
}

fn numbered_copy_name(stem: &str, extension: Option<&str>, counter: u32) -> String {
    match extension {
        Some(extension) => format!("{stem} (copy {counter}).{extension}"),
        None => format!("{stem} (copy {counter})"),
    }
}

fn unique_target(dest: &Path, file_name: &str) -> PathBuf {
    let candidate = dest.join(file_name);
    if !candidate.exists() {
        return candidate;
    }
    let (stem, extension) = split_file_name(file_name);
    let mut counter = 1u32;
    loop {
        let numbered = numbered_copy_name(stem, extension, counter);
        let candidate = dest.join(numbered);
        if !candidate.exists() {
            return candidate;
        }
        counter += 1;
        if counter > 9999 {
            return dest.join(format!("{stem} (copy {counter}-{stem})"));
        }
    }
}

fn remove_target(target: &Path) -> Result<(), String> {
    if !target.exists() {
        return Ok(());
    }
    let metadata = target
        .symlink_metadata()
        .map_err(|error| error.to_string())?;
    let removal = if is_real_directory(&metadata) {
        std::fs::remove_dir_all(target)
    } else {
        std::fs::remove_file(target)
    };
    removal.map_err(|error| error.to_string())
}

fn conflict_for(source_path: &Path, dest_path: &Path) -> Option<TransferConflict> {
    let name = source_path.file_name().and_then(|name| name.to_str())?;
    dest_path.join(name).exists().then(|| TransferConflict {
        name: name.to_string(),
        is_dir: source_path.is_dir(),
    })
}

fn validate_transfer(sources: &[String], dest_path: &Path) -> Result<(), String> {
    if !dest_path.is_dir() {
        return Err("The destination is not a directory.".into());
    }
    if sources.is_empty() {
        return Err("Nothing selected.".into());
    }
    Ok(())
}

fn find_nested_source(sources: &[String], dest_path: &Path) -> Result<(), String> {
    for source in sources {
        let source_path = PathBuf::from(source);
        if !source_path.exists() {
            return Err(format!("Not found: {source}"));
        }
        let nests_in_itself = source_path.is_dir() && dest_path.starts_with(&source_path);
        if nests_in_itself {
            return Err("Cannot copy a folder into itself.".into());
        }
    }
    Ok(())
}

pub fn scan_transfer(sources: &[String], dest: &str) -> Result<TransferScan, String> {
    let dest_path = PathBuf::from(dest);
    validate_transfer(sources, &dest_path)?;
    find_nested_source(sources, &dest_path)?;

    let measured = scan_sources(sources);
    let conflicts = sources
        .iter()
        .filter_map(|source| conflict_for(Path::new(source), &dest_path))
        .collect();

    Ok(TransferScan {
        files: measured.files,
        bytes: measured.bytes,
        conflicts,
    })
}

pub fn cancel_transfer(id: String, cancels: &TransferCancels) -> Result<(), String> {
    cancels
        .0
        .lock()
        .map(|mut set| {
            set.insert(id);
        })
        .map_err(|_| "Internal error.".to_string())
}

pub fn is_cancelled(id: &str, cancels: &TransferCancels) -> bool {
    cancels
        .0
        .lock()
        .map(|set| set.contains(id))
        .unwrap_or(false)
}

fn emit_progress(app: &AppHandle, state: &TransferProgress) {
    let _ = app.emit(crate::events::TRANSFER_PROGRESS, state);
}

fn copy_file_counted(
    source: &Path,
    target: &Path,
    progress: &mut TransferProgress,
    app: &AppHandle,
) -> Result<(), String> {
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let size = source.metadata().map(|meta| meta.len()).unwrap_or(0);
    std::fs::copy(source, target).map_err(|error| error.to_string())?;
    progress.done_files += 1;
    progress.done_bytes = progress.done_bytes.saturating_add(size);
    emit_progress(app, progress);
    Ok(())
}

fn copy_tree(
    source: &Path,
    target: &Path,
    progress: &mut TransferProgress,
    app: &AppHandle,
    id: &str,
    cancels: &TransferCancels,
    errors: &mut Vec<String>,
) -> bool {
    let mut stack = vec![(source.to_path_buf(), target.to_path_buf())];
    while let Some((from_dir, to_dir)) = stack.pop() {
        if is_cancelled(id, cancels) {
            return true;
        }
        if let Err(error) = std::fs::create_dir_all(&to_dir) {
            errors.push(error.to_string());
            continue;
        }
        let Ok(reader) = std::fs::read_dir(&from_dir) else {
            continue;
        };
        for entry in reader.filter_map(Result::ok) {
            if is_cancelled(id, cancels) {
                return true;
            }
            let from = entry.path();
            let to = to_dir.join(entry.file_name());
            let Ok(metadata) = from.symlink_metadata() else {
                continue;
            };
            if is_real_directory(&metadata) {
                stack.push((from, to));
                continue;
            }
            if let Err(error) = copy_file_counted(&from, &to, progress, app) {
                errors.push(format!("{}: {error}", from.to_string_lossy()));
            }
        }
    }
    false
}

#[derive(Default)]
struct TransferRun {
    copied: u64,
    skipped: u64,
    cancelled: bool,
    errors: Vec<String>,
    touched: Vec<(String, String)>,
}

impl TransferRun {
    fn record_success(&mut self, source: &str, target: &Path) {
        self.copied += 1;
        self.touched
            .push((source.to_string(), target.to_string_lossy().into_owned()));
    }

    fn summary(&self) -> TransferSummary {
        TransferSummary {
            copied: self.copied,
            skipped: self.skipped,
            cancelled: self.cancelled,
        }
    }
}

enum SourceOutcome {
    Copied,
    Skipped,
    Cancelled,
}

struct TransferContext<'a> {
    app: &'a AppHandle,
    request: &'a TransferRequest,
    cancels: &'a TransferCancels,
    dest: &'a Path,
    resolutions: HashMap<&'a str, &'a str>,
    progress: TransferProgress,
    run: TransferRun,
}

impl<'a> TransferContext<'a> {
    fn new(
        app: &'a AppHandle,
        request: &'a TransferRequest,
        cancels: &'a TransferCancels,
        dest: &'a Path,
    ) -> Self {
        let measured = scan_sources(&request.sources);
        let resolutions = request
            .resolutions
            .iter()
            .map(|item| (item.name.as_str(), item.action.as_str()))
            .collect();
        let progress = TransferProgress {
            id: request.id.clone(),
            cut: request.cut,
            kind: transfer_kind_label(request.cut),
            done_files: 0,
            total_files: measured.files,
            total_bytes: measured.bytes,
            done_bytes: 0,
            finished: false,
            error: None,
        };
        Self {
            app,
            request,
            cancels,
            dest,
            resolutions,
            progress,
            run: TransferRun::default(),
        }
    }

    fn is_cancelled(&self) -> bool {
        is_cancelled(&self.request.id, self.cancels)
    }

    fn emit(&self) {
        emit_progress(self.app, &self.progress);
    }

    fn add_measured(&mut self, measured: SourceSize) {
        self.progress.done_files += measured.files;
        self.progress.done_bytes = self.progress.done_bytes.saturating_add(measured.bytes);
    }

    fn action_for(&self, name: &str) -> &str {
        self.resolutions.get(name).copied().unwrap_or("skip")
    }

    fn resolve_conflict(&mut self, name: &str) -> Option<PathBuf> {
        let existing = self.dest.join(name);
        if !existing.exists() {
            return Some(existing);
        }
        match self.action_for(name) {
            "replace" => remove_target(&existing).ok().map(|()| existing),
            "keep_both" => Some(unique_target(self.dest, name)),
            _ => None,
        }
    }

    fn move_by_rename(&mut self, source_path: &Path, target: &Path, source: &str) -> bool {
        if !self.request.cut || std::fs::rename(source_path, target).is_err() {
            return false;
        }
        let measured = scan_source(target);
        self.add_measured(measured);
        self.run.record_success(source, target);
        self.emit();
        true
    }

    fn copy_directory(&mut self, source: &str, source_path: &Path, target: &Path) -> SourceOutcome {
        let was_cancelled = copy_tree(
            source_path,
            target,
            &mut self.progress,
            self.app,
            &self.request.id,
            self.cancels,
            &mut self.run.errors,
        );
        if was_cancelled {
            return SourceOutcome::Cancelled;
        }
        self.run.record_success(source, target);
        if self.request.cut {
            let _ = remove_target(source_path);
        }
        SourceOutcome::Copied
    }

    fn copy_single_file(&mut self, source: &str, source_path: &Path, target: &Path, name: &str) {
        match copy_file_counted(source_path, target, &mut self.progress, self.app) {
            Ok(()) => {
                self.run.record_success(source, target);
                if self.request.cut {
                    let _ = std::fs::remove_file(source_path);
                }
            }
            Err(error) => self.run.errors.push(format!("{name}: {error}")),
        }
    }

    fn transfer_source(&mut self, source: &str) -> SourceOutcome {
        let source_path = PathBuf::from(source);
        let Some(name) = file_name_of(&source_path) else {
            self.run.skipped += 1;
            return SourceOutcome::Skipped;
        };
        let is_same_parent = source_path.parent().map(|parent| parent == self.dest) == Some(true);
        if is_same_parent {
            self.run.skipped += 1;
            return SourceOutcome::Skipped;
        }
        let Some(target) = self.resolve_conflict(&name) else {
            self.run.skipped += 1;
            return SourceOutcome::Skipped;
        };
        if self.move_by_rename(&source_path, &target, source) {
            return SourceOutcome::Copied;
        }

        if source_path.is_dir() {
            let outcome = self.copy_directory(source, &source_path, &target);
            self.emit();
            return outcome;
        }
        self.copy_single_file(source, &source_path, &target, &name);
        self.emit();
        SourceOutcome::Copied
    }

    fn run_all(&mut self) -> TransferRun {
        self.emit();
        let request = self.request;
        for source in &request.sources {
            let should_stop = self.is_cancelled()
                || matches!(self.transfer_source(source), SourceOutcome::Cancelled);
            if should_stop {
                self.run.cancelled = true;
                break;
            }
        }
        self.emit();
        std::mem::take(&mut self.run)
    }
}

fn file_name_of(path: &Path) -> Option<String> {
    path.file_name()
        .and_then(|name| name.to_str())
        .map(str::to_string)
}

fn transfer_kind_label(is_cut: bool) -> String {
    if is_cut { "move" } else { "copy" }.to_string()
}

fn push_undo_step(undo: &UndoStack, request: &TransferRequest, run: &TransferRun) {
    if run.touched.is_empty() {
        return;
    }
    let targets: Vec<String> = run
        .touched
        .iter()
        .map(|(_, target)| target.clone())
        .collect();
    let sources: Vec<String> = run
        .touched
        .iter()
        .map(|(source, _)| source.clone())
        .collect();
    let step = if request.cut {
        UndoStep::MoveBack {
            from: sources,
            to: targets,
            count: run.copied as usize,
        }
    } else {
        UndoStep::RemoveCopies {
            paths: targets,
            count: run.copied as usize,
        }
    };
    undo.push(step);
}

fn release_cancel(cancels: &TransferCancels, id: &str) {
    if let Ok(mut pending) = cancels.0.lock() {
        pending.remove(id);
    }
}

pub fn transfer_entries(
    app: &AppHandle,
    request: TransferRequest,
    cancels: &TransferCancels,
    undo: &UndoStack,
) -> Result<TransferSummary, String> {
    let dest = PathBuf::from(&request.dest);
    validate_transfer(&request.sources, &dest)?;

    let mut context = TransferContext::new(app, &request, cancels, &dest);
    let run = context.run_all();

    push_undo_step(undo, &request, &run);
    release_cancel(cancels, &request.id);

    context.progress.finished = true;
    let failure = run.errors.join("\n");
    if failure.is_empty() {
        emit_progress(app, &context.progress);
        return Ok(run.summary());
    }
    context.progress.error = Some(failure.clone());
    emit_progress(app, &context.progress);
    Err(failure)
}

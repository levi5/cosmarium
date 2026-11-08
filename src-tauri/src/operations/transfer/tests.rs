use super::*;
use tempfile::TempDir;

fn request(root: &TempDir, cut: bool) -> TransferRequest {
    std::fs::create_dir_all(root.path().join("source")).unwrap();
    std::fs::create_dir_all(root.path().join("destination")).unwrap();
    TransferRequest {
        id: "test".into(),
        sources: vec![root.path().join("source").to_string_lossy().into_owned()],
        dest: root
            .path()
            .join("destination")
            .to_string_lossy()
            .into_owned(),
        cut,
        resolutions: Vec::new(),
    }
}

#[test]
fn copy_and_undo_keep_the_original() {
    let root = TempDir::new().unwrap();
    let request = request(&root, false);
    std::fs::write(root.path().join("source/file"), b"data").unwrap();
    let undo = UndoStack::with_remover(|paths| {
        for path in paths {
            std::fs::remove_dir_all(path).map_err(|error| error.to_string())?;
        }
        Ok(())
    });
    let summary = execute(&request, &TransferCancels::default(), &undo, &|_| {}).unwrap();
    assert_eq!(summary.copied, 1);
    assert_eq!(
        std::fs::read(root.path().join("destination/source/file")).unwrap(),
        b"data"
    );
    undo.undo().unwrap();
    assert!(root.path().join("source/file").exists());
    assert!(!root.path().join("destination/source").exists());
}

#[test]
fn paused_transfer_resumes_without_writing_before_resume() {
    let root = TempDir::new().unwrap();
    let request = request(&root, false);
    std::fs::write(root.path().join("source/file"), b"data").unwrap();
    let controls = TransferCancels::default();
    controls.paused.lock().unwrap().insert("test".into());
    let worker_controls = controls.clone();
    let (sender, receiver) = std::sync::mpsc::channel();
    let worker = std::thread::spawn(move || {
        execute(&request, &worker_controls, &UndoStack::new(), &|progress| {
            if progress.done_bytes == 0 {
                sender.send(()).unwrap();
            }
        })
    });
    receiver
        .recv_timeout(std::time::Duration::from_secs(5))
        .unwrap();
    assert!(!root.path().join("destination/source").exists());
    controls.paused.lock().unwrap().remove("test");
    let summary = worker.join().unwrap().unwrap();
    assert_eq!(summary.copied, 1);
    assert_eq!(
        std::fs::read(root.path().join("destination/source/file")).unwrap(),
        b"data"
    );
}

#[test]
fn move_and_undo_restore_the_original_location() {
    let root = TempDir::new().unwrap();
    let request = request(&root, true);
    std::fs::write(root.path().join("source/file"), b"data").unwrap();
    let undo = UndoStack::new();
    execute(&request, &TransferCancels::default(), &undo, &|_| {}).unwrap();
    assert!(!root.path().join("source").exists());
    undo.undo().unwrap();
    assert_eq!(
        std::fs::read(root.path().join("source/file")).unwrap(),
        b"data"
    );
}

#[test]
fn cancellation_removes_the_partial_copy_and_keeps_source() {
    let root = TempDir::new().unwrap();
    let request = request(&root, false);
    std::fs::write(root.path().join("source/file"), vec![1; 3 * 1024 * 1024]).unwrap();
    let controls = TransferCancels::default();
    let summary = execute(&request, &controls, &UndoStack::new(), &|progress| {
        if progress.done_bytes > 0 {
            cancel_transfer("test".into(), &controls).unwrap();
        }
    })
    .unwrap();
    assert!(summary.cancelled);
    assert_eq!(summary.copied, 0);
    assert!(!root.path().join("destination/source").exists());
    assert!(root.path().join("source/file").exists());
}

#[test]
fn recursive_destination_is_rejected_even_with_parent_components() {
    let root = TempDir::new().unwrap();
    let mut request = request(&root, false);
    std::fs::create_dir(root.path().join("source/nested")).unwrap();
    request.dest = root
        .path()
        .join("source/nested/..")
        .to_string_lossy()
        .into_owned();
    assert!(execute(
        &request,
        &TransferCancels::default(),
        &UndoStack::new(),
        &|_| {}
    )
    .is_err());
    assert!(root.path().join("source").exists());
}

#[cfg(unix)]
#[test]
fn failed_cross_volume_copy_keeps_the_source_tree() {
    let root = TempDir::new().unwrap();
    let request = request(&root, true);
    std::fs::write(root.path().join("source/file"), b"data").unwrap();
    std::os::unix::fs::symlink("file", root.path().join("source/link")).unwrap();
    let controls = TransferCancels::default();
    let emit = |_: &TransferProgress| {};
    let mut context = TransferContext {
        request: &request,
        controls: &controls,
        emit: &emit,
        summary: TransferSummary::default(),
        progress: TransferProgress {
            cancelled: false,
            id: "test".into(),
            cut: true,
            kind: "move".into(),
            done_files: 0,
            total_files: 2,
            done_bytes: 0,
            total_bytes: 8,
            finished: false,
            error: None,
        },
    };
    assert!(context
        .copy(
            Path::new(&request.sources[0]),
            &root.path().join("destination/source")
        )
        .is_err());
    assert_eq!(
        std::fs::read(root.path().join("source/file")).unwrap(),
        b"data"
    );
    assert!(root.path().join("source/link").symlink_metadata().is_ok());
    assert!(!root.path().join("destination/source").exists());
}

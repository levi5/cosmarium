use super::*;
use tempfile::TempDir;

#[test]
fn cancelled_replacement_preserves_the_existing_destination() {
    let root = TempDir::new().unwrap();
    let source = root.path().join("source");
    let destination = root.path().join("destination");
    std::fs::create_dir(&source).unwrap();
    std::fs::create_dir(&destination).unwrap();
    std::fs::write(source.join("file"), vec![1; 3 * 1024 * 1024]).unwrap();
    std::fs::write(destination.join("file"), b"original destination").unwrap();
    let request = TransferRequest {
        id: "replace".into(),
        sources: vec![source.join("file").to_string_lossy().into_owned()],
        dest: destination.to_string_lossy().into_owned(),
        cut: false,
        resolutions: vec![ConflictResolution {
            name: "file".into(),
            action: "replace".into(),
        }],
    };
    let controls = TransferCancels::default();
    let result = execute(&request, &controls, &UndoStack::new(), &|progress| {
        if progress.done_bytes > 0 {
            cancel_transfer("replace".into(), &controls).unwrap();
        }
    })
    .unwrap();
    assert!(result.cancelled);
    assert_eq!(
        std::fs::read(destination.join("file")).unwrap(),
        b"original destination"
    );
    assert!(source.join("file").exists());
    assert_eq!(std::fs::read_dir(&destination).unwrap().count(), 1);
}

#[test]
fn move_cleanup_preserves_new_source_entries() {
    let root = TempDir::new().unwrap();
    let source = root.path().join("source");
    let target = root.path().join("target");
    std::fs::create_dir(&source).unwrap();
    std::fs::create_dir(&target).unwrap();
    std::fs::write(source.join("copied"), b"data").unwrap();
    std::fs::write(target.join("copied"), b"data").unwrap();
    std::fs::write(source.join("new"), b"new work").unwrap();
    assert!(cleanup::remove_copied_source(&source, &target).is_err());
    assert_eq!(std::fs::read(source.join("new")).unwrap(), b"new work");
    assert_eq!(std::fs::read(target.join("copied")).unwrap(), b"data");
}

#[test]
fn move_cleanup_preserves_changed_source_files() {
    let root = TempDir::new().unwrap();
    let source = root.path().join("source");
    let target = root.path().join("target");
    std::fs::write(&source, b"edited").unwrap();
    std::fs::write(&target, b"copied").unwrap();
    assert!(cleanup::remove_copied_source(&source, &target).is_err());
    assert_eq!(std::fs::read(source).unwrap(), b"edited");
}

#[test]
fn rename_never_replaces_an_existing_entry() {
    let root = TempDir::new().unwrap();
    let source = root.path().join("source");
    let target = root.path().join("target");
    std::fs::write(&source, b"source").unwrap();
    std::fs::write(&target, b"target").unwrap();
    assert!(without_replacement(&source, &target).is_err());
    assert_eq!(std::fs::read(source).unwrap(), b"source");
    assert_eq!(std::fs::read(target).unwrap(), b"target");
}

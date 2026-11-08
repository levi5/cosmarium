use crate::filesystem::{
    duplicates,
    entries::{search_entries, SearchQuery},
};
use crate::operations::{
    archive,
    batch_rename::{self, RenameItem},
    move_back,
};
use std::io::Write;
use tempfile::TempDir;

#[test]
fn create_and_rename_do_not_overwrite_existing_files() {
    let root = TempDir::new().unwrap();
    std::fs::write(root.path().join("existing.txt"), b"preserve").unwrap();
    std::fs::write(root.path().join("source.txt"), b"source").unwrap();
    assert!(
        crate::operations::mutate::create_file(root.path().to_str().unwrap(), "existing.txt")
            .is_err()
    );
    assert!(
        crate::operations::mutate::rename_entry(&path(&root, "source.txt"), "existing.txt")
            .is_err()
    );
    assert_eq!(
        std::fs::read(root.path().join("existing.txt")).unwrap(),
        b"preserve"
    );
    assert_eq!(
        std::fs::read(root.path().join("source.txt")).unwrap(),
        b"source"
    );
}

#[cfg(unix)]
#[test]
fn create_and_rename_reject_dangling_destination_symlinks() {
    let root = TempDir::new().unwrap();
    std::fs::write(root.path().join("source.txt"), b"source").unwrap();
    std::os::unix::fs::symlink(
        root.path().join("missing.txt"),
        root.path().join("link.txt"),
    )
    .unwrap();
    assert!(
        crate::operations::mutate::create_file(root.path().to_str().unwrap(), "link.txt").is_err()
    );
    assert!(
        crate::operations::mutate::rename_entry(&path(&root, "source.txt"), "link.txt").is_err()
    );
    assert!(root.path().join("link.txt").is_symlink());
    assert!(!root.path().join("missing.txt").exists());
    assert!(root.path().join("source.txt").exists());
}

#[test]
fn cancelled_trash_preserves_pending_files_and_reports_cancellation() {
    let app = tauri::test::mock_builder()
        .build(tauri::test::mock_context(tauri::test::noop_assets()))
        .unwrap();
    let root = TempDir::new().unwrap();
    std::fs::write(root.path().join("keep.txt"), b"keep").unwrap();
    let controls = crate::operations::transfer::TransferCancels::default();
    crate::operations::transfer::cancel_transfer("cancelled".into(), &controls).unwrap();
    let summary = crate::operations::mutate::trash_entries(
        app.handle(),
        &[path(&root, "keep.txt")],
        &controls,
        "cancelled",
    )
    .unwrap();
    assert!(summary.cancelled);
    assert!(summary.removed.is_empty());
    assert!(summary.errors.is_empty());
    assert!(root.path().join("keep.txt").exists());
}

fn path(root: &TempDir, name: &str) -> String {
    root.path().join(name).to_string_lossy().into_owned()
}

#[test]
fn trash_ignores_items_that_vanished_before_deletion() {
    let app = tauri::test::mock_builder()
        .build(tauri::test::mock_context(tauri::test::noop_assets()))
        .unwrap();
    let root = TempDir::new().unwrap();
    let controls = crate::operations::transfer::TransferCancels::default();
    let missing = path(&root, "gone.txt");
    let summary = crate::operations::mutate::trash_entries(
        app.handle(),
        &[missing.clone()],
        &controls,
        "vanished",
    )
    .unwrap();
    assert_eq!(summary.removed, vec![missing]);
    assert!(summary.errors.is_empty());
    assert!(!summary.cancelled);
}

#[test]
fn zip_round_trip_preserves_contents_and_empty_directories() {
    let root = TempDir::new().unwrap();
    std::fs::create_dir_all(root.path().join("input/empty")).unwrap();
    std::fs::write(root.path().join("input/test.txt"), b"hello").unwrap();
    let zip = archive::compress(
        &[path(&root, "input")],
        root.path().to_str().unwrap(),
        "test.zip",
    )
    .unwrap();
    archive::extract(&zip, root.path().to_str().unwrap(), "output").unwrap();
    assert_eq!(
        std::fs::read(root.path().join("output/input/test.txt")).unwrap(),
        b"hello"
    );
    assert!(root.path().join("output/input/empty").is_dir());
}

#[test]
fn zip_rejects_overwrites_and_self_inclusion() {
    let root = TempDir::new().unwrap();
    std::fs::write(root.path().join("existing.zip"), b"original").unwrap();
    std::fs::write(root.path().join("file.txt"), b"data").unwrap();
    assert!(archive::compress(
        &[path(&root, "file.txt")],
        root.path().to_str().unwrap(),
        "existing.zip"
    )
    .is_err());
    assert_eq!(
        std::fs::read(root.path().join("existing.zip")).unwrap(),
        b"original"
    );
    assert!(archive::compress(
        &[root.path().to_string_lossy().into_owned()],
        root.path().to_str().unwrap(),
        "nested.zip"
    )
    .is_err());
}

#[test]
fn zip_rejects_path_traversal_and_cleans_only_its_output() {
    let root = TempDir::new().unwrap();
    let output = std::fs::File::create(root.path().join("bad.zip")).unwrap();
    let mut zip = zip::ZipWriter::new(output);
    zip.start_file("../escape.txt", zip::write::SimpleFileOptions::default())
        .unwrap();
    zip.write_all(b"unsafe").unwrap();
    zip.finish().unwrap();
    assert!(archive::extract(
        &path(&root, "bad.zip"),
        root.path().to_str().unwrap(),
        "output"
    )
    .is_err());
    assert!(!root.path().join("escape.txt").exists());
    assert!(!root.path().join("output").exists());
    assert!(root.path().join("bad.zip").exists());
}

#[test]
fn batch_rename_validates_every_target_before_mutating() {
    let root = TempDir::new().unwrap();
    std::fs::write(root.path().join("a.txt"), b"a").unwrap();
    std::fs::write(root.path().join("b.txt"), b"b").unwrap();
    let result = batch_rename::execute(&[
        RenameItem {
            path: path(&root, "a.txt"),
            new_name: "new.txt".into(),
        },
        RenameItem {
            path: path(&root, "b.txt"),
            new_name: "a.txt".into(),
        },
    ]);
    assert!(result.is_err());
    assert!(root.path().join("a.txt").exists());
    assert!(!root.path().join("new.txt").exists());
}

#[test]
fn batch_rename_and_undo_preserve_files() {
    let root = TempDir::new().unwrap();
    std::fs::write(root.path().join("a.txt"), b"a").unwrap();
    let entries = batch_rename::execute(&[RenameItem {
        path: path(&root, "a.txt"),
        new_name: "new.txt".into(),
    }])
    .unwrap();
    move_back::execute(&[path(&root, "a.txt")], &[entries[0].path.clone()]).unwrap();
    assert_eq!(std::fs::read(root.path().join("a.txt")).unwrap(), b"a");
}

#[test]
fn undo_does_not_overwrite_a_new_file() {
    let root = TempDir::new().unwrap();
    std::fs::write(root.path().join("a.txt"), b"new data").unwrap();
    std::fs::write(root.path().join("moved.txt"), b"old data").unwrap();
    assert!(move_back::execute(&[path(&root, "a.txt")], &[path(&root, "moved.txt")]).is_err());
    assert_eq!(
        std::fs::read(root.path().join("a.txt")).unwrap(),
        b"new data"
    );
}

#[test]
fn undo_skips_sources_that_no_longer_exist() {
    let root = TempDir::new().unwrap();
    move_back::execute(&[path(&root, "a.txt")], &[path(&root, "gone.txt")]).unwrap();
    assert!(!root.path().join("a.txt").exists());

    std::fs::write(root.path().join("moved.txt"), b"data").unwrap();
    move_back::execute(
        &[path(&root, "a.txt"), path(&root, "moved-back.txt")],
        &[path(&root, "gone.txt"), path(&root, "moved.txt")],
    )
    .unwrap();
    assert!(!root.path().join("a.txt").exists());
    assert_eq!(
        std::fs::read(root.path().join("moved-back.txt")).unwrap(),
        b"data"
    );
}

#[test]
fn duplicates_compare_contents_not_only_names_or_sizes() {
    let root = TempDir::new().unwrap();
    for (name, content) in [("a", "same"), ("b", "same"), ("c", "diff")] {
        std::fs::write(root.path().join(name), content).unwrap();
    }
    let groups = duplicates::find(root.path().to_str().unwrap()).unwrap();
    assert_eq!(groups.len(), 1);
    assert_eq!(groups[0].paths, vec![path(&root, "a"), path(&root, "b")]);
}

#[test]
fn recursive_search_finds_folders_and_matches_content() {
    let root = TempDir::new().unwrap();
    std::fs::create_dir(root.path().join("folder")).unwrap();
    std::fs::write(root.path().join("folder/a.txt"), "needle").unwrap();
    let mut query = SearchQuery {
        root: root.path().to_string_lossy().into_owned(),
        max_depth: 8,
        limit: 100,
        kind: "folder".into(),
        ..Default::default()
    };
    assert_eq!(search_entries(&query).unwrap().len(), 1);
    query.kind = "file".into();
    query.content = Some("needle".into());
    assert_eq!(search_entries(&query).unwrap().len(), 1);
    query.max_size = Some(1);
    assert!(search_entries(&query).unwrap().is_empty());
}

use std::path::PathBuf;
use tauri::{ipc::Channel, AppHandle, Window};

#[tauri::command]
pub fn drag_copy_modifier(window: Window) -> Result<bool, String> {
    #[cfg(target_os = "linux")]
    {
        use gtk::{gdk, prelude::*};
        let display = window
            .gtk_window()
            .map_err(|error| error.to_string())?
            .display();
        let keymap = gdk::Keymap::for_display(&display).ok_or("Keyboard state unavailable.")?;
        let state = gdk::ModifierType::from_bits_truncate(keymap.modifier_state());
        Ok(state.intersects(
            gdk::ModifierType::CONTROL_MASK
                | gdk::ModifierType::META_MASK
                | gdk::ModifierType::SUPER_MASK,
        ))
    }
    #[cfg(target_os = "windows")]
    {
        let _ = window;
        #[link(name = "user32")]
        unsafe extern "system" {
            fn GetAsyncKeyState(key: i32) -> i16;
        }
        Ok(unsafe { GetAsyncKeyState(0x11) } < 0)
    }
    #[cfg(target_os = "macos")]
    {
        let _ = window;
        #[link(name = "CoreGraphics", kind = "framework")]
        unsafe extern "C" {
            fn CGEventSourceFlagsState(state: i32) -> u64;
        }
        let flags = unsafe { CGEventSourceFlagsState(0) };
        Ok(flags & ((1 << 18) | (1 << 19) | (1 << 20)) != 0)
    }
    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        let _ = window;
        Ok(false)
    }
}

#[tauri::command]
pub async fn start_file_drag(
    app: AppHandle,
    window: Window,
    paths: Vec<String>,
    copy: bool,
    on_end: Channel<bool>,
) -> Result<(), String> {
    let paths = super::off_thread(move || validate_paths(paths)).await?;
    let (tx, rx) = std::sync::mpsc::channel();
    app.run_on_main_thread(move || {
        let result = start_native_drag(&window, paths, copy, on_end);
        let _ = tx.send(result);
    })
    .map_err(|error| error.to_string())?;
    super::off_thread(move || rx.recv().map_err(|error| error.to_string())?).await
}

#[cfg(target_os = "linux")]
fn file_uris(paths: Vec<PathBuf>) -> Result<Vec<String>, String> {
    paths
        .into_iter()
        .map(|path| {
            tauri::Url::from_file_path(path)
                .map(|url| url.to_string())
                .map_err(|_| "Invalid file URI.".into())
        })
        .collect()
}

#[cfg(target_os = "linux")]
fn start_native_drag(
    window: &Window,
    paths: Vec<PathBuf>,
    copy: bool,
    on_end: Channel<bool>,
) -> Result<(), String> {
    use gtk::{gdk, glib, prelude::*};
    use std::{
        cell::{Cell, RefCell},
        rc::Rc,
    };

    let uris = file_uris(paths)?;
    let window = window.gtk_window().map_err(|error| error.to_string())?;
    let handlers = Rc::new(RefCell::new(Vec::<glib::SignalHandlerId>::new()));
    let failed = Rc::new(Cell::new(false));
    let action = native_drag_action(copy);
    window.drag_source_set(gdk::ModifierType::BUTTON1_MASK, &[], action);
    window.drag_source_add_uri_targets();
    handlers
        .borrow_mut()
        .push(window.connect_drag_data_get(move |_, _, data, _, _| {
            let uris: Vec<&str> = uris.iter().map(String::as_str).collect();
            data.set_uris(&uris);
        }));
    let failed_flag = failed.clone();
    handlers
        .borrow_mut()
        .push(window.connect_drag_failed(move |_, _, _| {
            failed_flag.set(true);
            glib::Propagation::Proceed
        }));
    let end_handlers = handlers.clone();
    handlers
        .borrow_mut()
        .push(window.connect_drag_end(move |window, _| {
            for handler in end_handlers.borrow_mut().drain(..) {
                window.disconnect(handler);
            }
            window.drag_source_unset();
            let _ = on_end.send(!failed.get());
        }));
    let context = window
        .drag_source_get_target_list()
        .and_then(|targets| window.drag_begin_with_coordinates(&targets, action, 1, None, -1, -1));
    if let Some(context) = context {
        if let Ok(icon) = gtk::gdk_pixbuf::Pixbuf::from_read(std::io::Cursor::new(include_bytes!(
            "../../icons/32x32.png"
        ))) {
            context.drag_set_icon_pixbuf(&icon, 0, 0);
        }
        Ok(())
    } else {
        for handler in handlers.borrow_mut().drain(..) {
            window.disconnect(handler);
        }
        window.drag_source_unset();
        Err("Failed to start file drag.".into())
    }
}

#[cfg(target_os = "linux")]
fn native_drag_action(copy: bool) -> gtk::gdk::DragAction {
    if copy {
        gtk::gdk::DragAction::COPY
    } else {
        gtk::gdk::DragAction::MOVE
    }
}

#[cfg(not(target_os = "linux"))]
fn start_native_drag(
    window: &Window,
    paths: Vec<PathBuf>,
    copy: bool,
    on_end: Channel<bool>,
) -> Result<(), String> {
    drag::start_drag(
        window,
        drag::DragItem::Files(paths),
        drag::Image::Raw(include_bytes!("../../icons/32x32.png").to_vec()),
        move |result, _| {
            let _ = on_end.send(matches!(result, drag::DragResult::Dropped));
        },
        drag::Options {
            mode: if copy {
                drag::DragMode::Copy
            } else {
                drag::DragMode::Move
            },
            ..Default::default()
        },
    )
    .map_err(|error| error.to_string())
}

fn validate_paths(paths: Vec<String>) -> Result<Vec<PathBuf>, String> {
    if paths.is_empty() || paths.len() > 10_000 {
        return Err("Select between 1 and 10000 items.".into());
    }
    paths
        .into_iter()
        .map(|path| {
            let path = PathBuf::from(path);
            if !path.is_absolute() {
                return Err("Drag paths must be absolute.".into());
            }
            let metadata = path.symlink_metadata().map_err(|error| error.to_string())?;
            if !metadata.is_file() && !metadata.is_dir() && !metadata.file_type().is_symlink() {
                return Err("Only files and folders can be dragged.".into());
            }
            Ok(path)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(target_os = "linux")]
    #[test]
    fn native_drag_moves_by_default_and_copies_only_when_requested() {
        assert_eq!(native_drag_action(false), gtk::gdk::DragAction::MOVE);
        assert_eq!(native_drag_action(true), gtk::gdk::DragAction::COPY);
    }

    #[test]
    fn validates_drag_sources() {
        assert!(validate_paths(vec![]).is_err());
        assert!(validate_paths(vec!["relative.txt".into()]).is_err());
        let root = tempfile::tempdir().unwrap();
        let file = root.path().join("file.txt");
        std::fs::write(&file, "data").unwrap();
        assert_eq!(
            validate_paths(vec![file.to_string_lossy().into_owned()]).unwrap(),
            vec![file]
        );
        assert!(validate_paths(vec![root
            .path()
            .join("missing")
            .to_string_lossy()
            .into_owned()])
        .is_err());
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn encodes_file_uri_reserved_characters() {
        let paths = file_uris(vec![PathBuf::from("/tmp/a b#c%.txt")]).unwrap();
        assert_eq!(paths[0], "file:///tmp/a%20b%23c%25.txt");
    }
}

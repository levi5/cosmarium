use std::path::Path;
#[cfg(not(target_os = "windows"))]
use std::process::{Command, Stdio};

const DEBUG_ENV: &str = "COSMARIUM_OPEN_DEBUG";
const DEBUG_LOG: &str = "cosmarium-open.log";

fn debug_enabled() -> bool {
    std::env::var(DEBUG_ENV).is_ok_and(|value| value != "0")
}

#[cfg(not(target_os = "windows"))]
fn silent_command(program: &str) -> Command {
    let mut command = Command::new(program);
    command
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    command
}

fn log(line: &str) {
    use std::io::Write;
    if !debug_enabled() {
        return;
    }
    let Ok(mut file) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(std::env::temp_dir().join(DEBUG_LOG))
    else {
        return;
    };
    let _ = writeln!(file, "{line}");
}

#[cfg(not(target_os = "windows"))]
fn watch_exit_status(path: String, mut child: std::process::Child) {
    std::thread::spawn(move || match child.wait() {
        Ok(status) if status.success() => log(&format!("OK: '{path}' dispatched")),
        Ok(status) => log(&format!(
            "FAILED: '{path}' exit {:?} (is a handler registered?)",
            status.code()
        )),
        Err(error) => log(&format!("error waiting for the opener: {error}")),
    });
}

#[cfg(target_os = "windows")]
mod shell32 {
    use core::ffi::c_void;

    unsafe extern "system" {
        pub fn ShellExecuteW(
            hwnd: *mut c_void,
            operation: *const u16,
            file: *const u16,
            parameters: *const u16,
            directory: *const u16,
            show_cmd: i32,
        ) -> *mut c_void;
    }
}

#[cfg(target_os = "windows")]
fn open_native(target: &std::path::Path, absolute: &str) -> Result<(), String> {
    let _ = target;
    const SW_SHOWNORMAL: i32 = 1;
    let operation: Vec<u16> = "open\0".encode_utf16().collect();
    let file: Vec<u16> = absolute.encode_utf16().chain(std::iter::once(0)).collect();
    log(&format!("opening: {absolute}"));
    let result = unsafe {
        shell32::ShellExecuteW(
            core::ptr::null_mut(),
            operation.as_ptr(),
            file.as_ptr(),
            core::ptr::null(),
            core::ptr::null(),
            SW_SHOWNORMAL,
        )
    };
    if (result as isize) <= 32 {
        let message = "Failed to launch the default application. Check that an application is registered for this file type.";
        log(&format!("ERROR: {message}"));
        return Err(message.into());
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn open_native(target: &std::path::Path, absolute: &str) -> Result<(), String> {
    let _ = target;
    log(&format!("opening: {absolute}"));
    let child = match silent_command("xdg-open").arg(absolute).spawn() {
        Ok(child) => child,
        Err(error) => {
            log(&format!("xdg-open unavailable ({error}); trying gio open"));
            return spawn_fallback(&["gio", "open", absolute]);
        }
    };

    watch_exit_status(absolute.to_string(), child);
    Ok(())
}

pub fn open_with_default(path: &str) -> Result<(), String> {
    let target = Path::new(path);
    if !target.exists() {
        log(&format!("ERROR: '{path}' does not exist"));
        return Err("This file no longer exists.".into());
    }

    let absolute = std::fs::canonicalize(target)
        .map(|resolved| resolved.to_string_lossy().into_owned())
        .unwrap_or_else(|_| path.to_string());

    open_native(target, &absolute)
}

#[cfg(not(target_os = "windows"))]
fn spawn_fallback(args: &[&str]) -> Result<(), String> {
    let program = args[0];
    match silent_command(program).args(&args[1..]).spawn() {
        Ok(child) => {
            log(&format!("OK via fallback: {program} (pid {})", child.id()));
            Ok(())
        }
        Err(error) => {
            let message = format!(
                "Failed to launch the default application ({program}: {error}). \
                 Check that an application is registered for this file type."
            );
            log(&format!("ERRO: {message}"));
            Err(message)
        }
    }
}

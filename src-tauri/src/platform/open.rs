use std::path::Path;
use std::process::{Command, Stdio};

const DEBUG_ENV: &str = "COSMARIUM_OPEN_DEBUG";
const DEBUG_LOG: &str = "cosmarium-open.log";

fn debug_enabled() -> bool {
    std::env::var(DEBUG_ENV).is_ok_and(|value| value != "0")
}

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

fn watch_exit_status(path: String, mut child: std::process::Child) {
    std::thread::spawn(move || match child.wait() {
        Ok(status) if status.success() => log(&format!("OK: '{path}' despachado")),
        Ok(status) => log(&format!(
            "FALHOU: '{path}' exit {:?} (handler registrado?)",
            status.code()
        )),
        Err(error) => log(&format!("ERRO ao esperar xdg-open: {error}")),
    });
}

pub fn open_with_default(path: &str) -> Result<(), String> {
    let target = Path::new(path);
    if !target.exists() {
        log(&format!("ERRO: '{path}' nao existe"));
        return Err("This file no longer exists.".into());
    }

    let absolute = std::fs::canonicalize(target)
        .map(|resolved| resolved.to_string_lossy().into_owned())
        .unwrap_or_else(|_| path.to_string());

    log(&format!("abrindo: {absolute}"));

    let child = match silent_command("xdg-open").arg(&absolute).spawn() {
        Ok(child) => child,
        Err(error) => {
            log(&format!(
                "xdg-open indisponivel ({error}); tentando gio open"
            ));
            return spawn_fallback(&["gio", "open", &absolute]);
        }
    };

    watch_exit_status(absolute, child);
    Ok(())
}

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

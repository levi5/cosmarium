use std::process::{Command, Stdio};

pub fn open(path: &str) -> Result<(), String> {
    let directory = std::fs::canonicalize(path).map_err(|error| error.to_string())?;
    if !directory.is_dir() {
        return Err("Choose a folder.".into());
    }
    #[cfg(target_os = "windows")]
    let programs = ["wt.exe", "powershell.exe"];
    #[cfg(target_os = "macos")]
    let programs = ["open"];
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    let programs = [
        "x-terminal-emulator",
        "gnome-terminal",
        "konsole",
        "xfce4-terminal",
        "xterm",
    ];
    for program in programs {
        let mut command = Command::new(program);
        match program {
            "wt.exe" => {
                command.arg("--startingDirectory").arg(&directory);
            }
            "gnome-terminal" | "xfce4-terminal" => {
                command.arg("--working-directory").arg(&directory);
            }
            "konsole" => {
                command.arg("--workdir").arg(&directory);
            }
            "powershell.exe" => {
                command.arg("-NoExit");
            }
            _ => {}
        }
        command
            .current_dir(&directory)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        #[cfg(target_os = "macos")]
        command.arg("-a").arg("Terminal").arg(&directory);
        if let Ok(mut child) = command.spawn() {
            std::thread::spawn(move || {
                let _ = child.wait();
            });
            return Ok(());
        }
    }
    Err("No terminal application was found. Install a terminal and try again.".into())
}

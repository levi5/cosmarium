use std::path::Path;

pub fn without_replacement(source: &Path, target: &Path) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        rustix::fs::renameat_with(
            rustix::fs::CWD,
            source,
            rustix::fs::CWD,
            target,
            rustix::fs::RenameFlags::NOREPLACE,
        )
        .map_err(|error| error.to_string())
    }
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::ffi::OsStrExt;
        #[link(name = "kernel32")]
        unsafe extern "system" {
            fn MoveFileW(source: *const u16, target: *const u16) -> i32;
        }
        let source: Vec<_> = source
            .as_os_str()
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        let target: Vec<_> = target
            .as_os_str()
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        if source[..source.len() - 1].contains(&0) || target[..target.len() - 1].contains(&0) {
            return Err("Invalid path.".into());
        }
        if unsafe { MoveFileW(source.as_ptr(), target.as_ptr()) } == 0 {
            Err(std::io::Error::last_os_error().to_string())
        } else {
            Ok(())
        }
    }
    #[cfg(target_os = "macos")]
    {
        use std::os::unix::ffi::OsStrExt;
        unsafe extern "C" {
            fn renamex_np(
                source: *const std::ffi::c_char,
                target: *const std::ffi::c_char,
                flags: u32,
            ) -> i32;
        }
        let source = std::ffi::CString::new(source.as_os_str().as_bytes())
            .map_err(|error| error.to_string())?;
        let target = std::ffi::CString::new(target.as_os_str().as_bytes())
            .map_err(|error| error.to_string())?;
        const RENAME_EXCL: u32 = 4;
        if unsafe { renamex_np(source.as_ptr(), target.as_ptr(), RENAME_EXCL) } == 0 {
            Ok(())
        } else {
            Err(std::io::Error::last_os_error().to_string())
        }
    }
    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        match target.symlink_metadata() {
            Ok(_) => return Err(format!("Already exists: {}", target.display())),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(error.to_string()),
        }
        std::fs::rename(source, target).map_err(|error| error.to_string())
    }
}

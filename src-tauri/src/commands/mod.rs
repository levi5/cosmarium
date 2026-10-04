pub mod fs_read;
pub mod fs_write;
pub mod ops_transfer;
pub mod system;
pub mod trash;

pub async fn off_thread<T, F>(work: F) -> Result<T, String>
where
    F: FnOnce() -> Result<T, String> + Send + 'static,
    T: Send + 'static,
{
    match tauri::async_runtime::spawn_blocking(work).await {
        Ok(result) => result,
        Err(join_error) => Err(join_error.to_string()),
    }
}

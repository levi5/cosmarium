use serde::Serialize;
use std::path::Path;
use sysinfo::Disks;

fn is_container_volume(file_system: &str, mount_point: &Path) -> bool {
    let container_roots = [
        "/var/lib/docker",
        "/var/lib/containerd",
        "/var/lib/containers/storage",
    ];
    matches!(file_system, "overlay" | "overlayfs" | "aufs")
        || container_roots
            .iter()
            .any(|root| mount_point.starts_with(root))
        || mount_point.components().any(|part| {
            matches!(
                part.as_os_str().to_str(),
                Some("overlay2" | "overlay-containers")
            )
        })
}

#[derive(Serialize)]
pub struct Volume {
    pub name: String,
    pub mount_point: String,
    pub total_space: u64,
    pub available_space: u64,
}

pub fn get_volumes() -> Vec<Volume> {
    Disks::new_with_refreshed_list()
        .list()
        .iter()
        .filter(|disk| {
            !is_container_volume(&disk.file_system().to_string_lossy(), disk.mount_point())
        })
        .map(|disk| Volume {
            name: disk.name().to_string_lossy().into_owned(),
            mount_point: disk.mount_point().to_string_lossy().into_owned(),
            total_space: disk.total_space(),
            available_space: disk.available_space(),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::is_container_volume;
    use std::path::Path;

    #[test]
    fn hides_container_mounts() {
        for (fs, path) in [
            ("overlay", "/"),
            ("aufs", "/mnt/container"),
            ("ext4", "/var/lib/docker/overlay2/abc/merged"),
            (
                "ext4",
                "/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs",
            ),
            ("ext4", "/home/user/.local/share/docker/overlay2/abc/merged"),
        ] {
            assert!(is_container_volume(fs, Path::new(path)), "{path}");
        }
    }

    #[test]
    fn keeps_regular_drives() {
        for path in ["/", "/home", "/media/user/Backup", "/mnt/docker-backups"] {
            assert!(!is_container_volume("ext4", Path::new(path)), "{path}");
        }
    }
}

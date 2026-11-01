import { useState } from 'react'
import type { FileEntry } from '../../types/explorer'

export function useInspection() {
  const [preview, setPreview] = useState<FileEntry | null>(null)
  const [propertiesTarget, setPropertiesTarget] = useState<FileEntry | null>(null)
  const [tagTarget, setTagTarget] = useState<FileEntry | null>(null)
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null)
  return {
    preview,
    setPreview,
    propertiesTarget,
    setPropertiesTarget,
    tagTarget,
    setTagTarget,
    deleteTagId,
    setDeleteTagId,
    hasDialog: Boolean(preview || propertiesTarget || tagTarget || deleteTagId)
  }
}

export type Inspection = ReturnType<typeof useInspection>

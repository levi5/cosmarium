import { useState } from 'react'
import { createTranslator } from '../../lib/i18n'
import { usePreferences } from '../../lib/preferences'
import { useDriveAliasStore } from '../../stores/driveAliasStore'
import type { Volume } from '../../types/explorer'
import { Button } from '../base/Button'
import { Icon } from '../base/Icon'
import { PromptDialog } from '../PromptDialog'

export function DriveAliasButton({ volume, className = '' }: { volume: Volume; className?: string }) {
  const [open, setOpen] = useState(false)
  const { language } = usePreferences()
  const t = createTranslator(language)
  const alias = useDriveAliasStore((state) => state.aliases[volume.mount_point] ?? '')
  const setAlias = useDriveAliasStore((state) => state.setAlias)
  return (
    <>
      <Button
        variant="ghost"
        className={className}
        title={t('driveAlias')}
        aria-label={`${t('driveAlias')}: ${alias || volume.name || volume.mount_point}`}
        onClick={() => setOpen(true)}
      >
        <Icon name="rename" size={14} />
      </Button>
      {open && (
        <PromptDialog
          title={t('driveAlias')}
          placeholder={t('driveAliasHint')}
          initialValue={alias}
          allowEmpty
          confirmLabel={t('save')}
          cancelLabel={t('cancel')}
          onClose={() => setOpen(false)}
          onSubmit={(value) => {
            setAlias(volume.mount_point, value)
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

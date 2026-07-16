import { Group, Modal, Stack, Text } from '@mantine/core'

import { PrimaryButton, SecondaryButton } from '../buttons'

export interface ConfirmDialogProps {
  readonly opened: boolean
  readonly title: string
  readonly message: string
  readonly confirmLabel?: string
  readonly cancelLabel?: string
  readonly destructive?: boolean
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

export function ConfirmDialog({
  opened,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      centered
      onClose={onCancel}
      opened={opened}
      title={title}
      transitionProps={{ transition: 'pop', duration: 150 }}
    >
      <Stack>
        <Text>{message}</Text>
        <Group grow justify="flex-end">
          <SecondaryButton onClick={onCancel}>{cancelLabel}</SecondaryButton>
          <PrimaryButton
            color={destructive ? 'red' : undefined}
            onClick={onConfirm}
          >
            {confirmLabel}
          </PrimaryButton>
        </Group>
      </Stack>
    </Modal>
  )
}

export interface ResumeSessionDialogProps {
  readonly opened: boolean
  readonly gameName: string
  readonly detail?: string
  readonly onResume: () => void
  readonly onDiscard: () => void
}

export function ResumeSessionDialog({
  opened,
  gameName,
  detail,
  onResume,
  onDiscard,
}: ResumeSessionDialogProps) {
  return (
    <Modal
      centered
      closeOnClickOutside={false}
      onClose={() => undefined}
      opened={opened}
      title="Resume previous game"
      withCloseButton={false}
    >
      <Stack>
        <Text>
          Continue <strong>{gameName}</strong>?
        </Text>
        {detail ? <Text c="dimmed">{detail}</Text> : null}
        <PrimaryButton onClick={onResume}>Resume game</PrimaryButton>
        <SecondaryButton color="red" onClick={onDiscard}>
          Discard game
        </SecondaryButton>
      </Stack>
    </Modal>
  )
}

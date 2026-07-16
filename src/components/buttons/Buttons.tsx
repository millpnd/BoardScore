import {
  ActionIcon,
  Button,
  type ActionIconProps,
  type ButtonProps,
} from '@mantine/core'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

type NativeButtonProps = ComponentPropsWithoutRef<'button'>
export type BoardButtonProps = ButtonProps & NativeButtonProps

export function PrimaryButton({ children, ...props }: BoardButtonProps) {
  return <Button {...props}>{children}</Button>
}

export function SecondaryButton({ children, ...props }: BoardButtonProps) {
  return (
    <Button color="gray" variant="light" {...props}>
      {children}
    </Button>
  )
}

export type IconButtonProps = ActionIconProps &
  NativeButtonProps & {
    readonly label: string
    readonly children: ReactNode
  }

export function IconButton({ label, children, ...props }: IconButtonProps) {
  return (
    <ActionIcon aria-label={label} size="input-lg" variant="light" {...props}>
      {children}
    </ActionIcon>
  )
}

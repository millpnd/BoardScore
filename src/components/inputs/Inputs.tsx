import {
  NumberInput as MantineNumberInput,
  TextInput,
  type NumberInputProps,
  type TextInputProps,
} from '@mantine/core'
import { Search } from 'lucide-react'

export function NumberInput(props: NumberInputProps) {
  return (
    <MantineNumberInput
      clampBehavior="strict"
      inputMode="decimal"
      size="lg"
      {...props}
    />
  )
}

export function PlayerNameInput({
  label = 'Player name',
  maxLength = 40,
  ...props
}: TextInputProps) {
  return (
    <TextInput
      autoComplete="off"
      label={label}
      maxLength={maxLength}
      size="lg"
      {...props}
    />
  )
}

export function SearchInput({
  label = 'Search games',
  placeholder = 'Search games',
  ...props
}: TextInputProps) {
  return (
    <TextInput
      label={label}
      leftSection={<Search aria-hidden size={18} />}
      placeholder={placeholder}
      size="lg"
      type="search"
      {...props}
    />
  )
}

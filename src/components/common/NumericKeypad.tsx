import { Button, Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core'
import { Delete } from 'lucide-react'
import type { KeyboardEvent } from 'react'

export interface NumericKeypadProps {
  readonly value: string
  readonly onChange: (value: string) => void
  readonly onSubmit?: () => void
  readonly label?: string
  readonly allowNegative?: boolean
  readonly disabled?: boolean
}

const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

export function NumericKeypad({
  value,
  onChange,
  onSubmit,
  label = 'Score',
  allowNegative = true,
  disabled = false,
}: NumericKeypadProps) {
  const appendDigit = (digit: string) => {
    if (value === '0') onChange(digit)
    else if (value === '-0') onChange(`-${digit}`)
    else onChange(`${value}${digit}`)
  }

  const toggleSign = () => {
    if (value.startsWith('-')) onChange(value.slice(1))
    else onChange(value ? `-${value}` : '-')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    if (/^\d$/.test(event.key)) appendDigit(event.key)
    else if (event.key === 'Backspace') onChange(value.slice(0, -1))
    else if (event.key === 'Delete' || event.key === 'Escape') onChange('')
    else if (event.key === '-' && allowNegative) toggleSign()
    else if (event.key === 'Enter' && onSubmit) onSubmit()
    else return
    event.preventDefault()
  }

  return (
    <Paper
      aria-label={`${label} numeric keypad`}
      className="numeric-keypad"
      onKeyDown={handleKeyDown}
      p="md"
      role="group"
      tabIndex={-1}
      withBorder
    >
      <Stack gap="sm">
        <Text c="dimmed" fw={600} size="sm">
          {label}
        </Text>
        <Text
          aria-live="polite"
          className="keypad-display"
          data-empty={!value || undefined}
          role="status"
        >
          {value || '0'}
        </Text>
        <SimpleGrid cols={3} spacing="xs">
          {digits.map((digit) => (
            <Button
              disabled={disabled}
              key={digit}
              onClick={() => appendDigit(digit)}
              variant="light"
            >
              {digit}
            </Button>
          ))}
          <Button
            aria-label="Toggle negative"
            disabled={disabled || !allowNegative}
            onClick={toggleSign}
            variant="light"
          >
            ±
          </Button>
          <Button
            disabled={disabled}
            onClick={() => appendDigit('0')}
            variant="light"
          >
            0
          </Button>
          <Button
            aria-label="Backspace"
            disabled={disabled}
            onClick={() => onChange(value.slice(0, -1))}
            variant="light"
          >
            <Delete aria-hidden size={24} />
          </Button>
        </SimpleGrid>
        <Group grow>
          <Button
            color="gray"
            disabled={disabled}
            onClick={() => onChange('')}
            variant="light"
          >
            Clear
          </Button>
          {onSubmit ? (
            <Button
              disabled={disabled || value === '' || value === '-'}
              onClick={onSubmit}
            >
              Done
            </Button>
          ) : null}
        </Group>
      </Stack>
    </Paper>
  )
}

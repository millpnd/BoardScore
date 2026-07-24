import { Button, Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core'
import { Delete } from 'lucide-react'
import { forwardRef } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'

export interface NumericKeypadProps {
  readonly value: string
  readonly onChange: (value: string) => void
  readonly onSubmit?: () => void
  readonly label?: string
  readonly allowNegative?: boolean
  readonly disabled?: boolean
}

const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

const trimLeadingZeros = (value: string): string =>
  value.replace(/^0+(?=\d)/, '')

export const NumericKeypad = forwardRef<HTMLInputElement, NumericKeypadProps>(
  function NumericKeypad(
    {
      value,
      onChange,
      onSubmit,
      label = 'Score',
      allowNegative = true,
      disabled = false,
    },
    ref,
  ) {
    const appendDigit = (digit: string) => {
      if (disabled) return
      if (value === '0') onChange(digit)
      else if (value === '-0') onChange(`-${digit}`)
      else onChange(`${value}${digit}`)
    }

    const toggleSign = () => {
      if (disabled || !allowNegative) return
      if (value.startsWith('-')) onChange(value.slice(1))
      else onChange(value ? `-${value}` : '-')
    }

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
      if (disabled) return
      const rawValue = event.currentTarget.value
      const negative = allowNegative && rawValue.trimStart().startsWith('-')
      const numericValue = trimLeadingZeros(rawValue.replace(/\D/g, ''))
      onChange(`${negative ? '-' : ''}${numericValue}`)
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return
      if (event.key === 'Enter' && onSubmit) {
        event.preventDefault()
        onSubmit()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        onChange('')
      }
    }

    return (
      <Paper
        aria-label={`${label} numeric keypad`}
        className="numeric-keypad"
        p="md"
        role="group"
        withBorder
      >
        <Stack gap="sm">
          <Text c="dimmed" fw={600} size="sm">
            {label}
          </Text>
          <input
            aria-label={label}
            className="keypad-display keypad-input"
            disabled={disabled}
            inputMode="numeric"
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            pattern={allowNegative ? '-?[0-9]*' : '[0-9]*'}
            placeholder="0"
            ref={ref}
            type="text"
            value={value}
          />
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
              +/-
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
  },
)

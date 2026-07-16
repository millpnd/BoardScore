import {
  Button,
  Card,
  createTheme,
  type MantineColorsTuple,
} from '@mantine/core'

const boardBlue: MantineColorsTuple = [
  '#edf4ff',
  '#d9e6ff',
  '#b0caff',
  '#84acff',
  '#6393ff',
  '#4f83ff',
  '#437bff',
  '#3268e4',
  '#275dcd',
  '#164fb5',
]

const tableGreen: MantineColorsTuple = [
  '#edfff5',
  '#d8f9e7',
  '#aeefcd',
  '#81e5b1',
  '#5dde9a',
  '#45da8c',
  '#36d783',
  '#25bf70',
  '#17aa62',
  '#009253',
]

export const boardScoreTheme = createTheme({
  primaryColor: 'boardBlue',
  primaryShade: { light: 7, dark: 5 },
  colors: { boardBlue, tableGreen },
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  headings: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    fontWeight: '750',
  },
  defaultRadius: 'lg',
  radius: {
    xs: '0.375rem',
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
  },
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  shadows: {
    xs: '0 1px 2px rgb(15 23 42 / 0.08)',
    sm: '0 2px 8px rgb(15 23 42 / 0.10)',
    md: '0 8px 24px rgb(15 23 42 / 0.12)',
    lg: '0 16px 40px rgb(15 23 42 / 0.16)',
    xl: '0 24px 64px rgb(15 23 42 / 0.20)',
  },
  breakpoints: { xs: '30em', sm: '48em', md: '64em', lg: '74em', xl: '90em' },
  components: {
    Button: Button.extend({
      defaultProps: { radius: 'lg', size: 'lg' },
      styles: { root: { minHeight: 'var(--boardscore-touch-target)' } },
    }),
    Card: Card.extend({
      defaultProps: { radius: 'lg', padding: 'lg', withBorder: true },
    }),
  },
})

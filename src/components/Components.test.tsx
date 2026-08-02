// @vitest-environment jsdom

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dice5, Users } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import {
  AppLayout,
  BackButton,
  BottomActionBar,
  CardSection,
  ColorSchemeToggle,
  EmptyState,
  Footer,
  GameCard,
  GameList,
  GameListItem,
  Header,
  IconButton,
  LoadingIndicator,
  NumberInput,
  PageContainer,
  PlayerCard,
  PlayerList,
  PlayerListItem,
  PlayerNameInput,
  PrimaryButton,
  RoundIndicator,
  ScoreCard,
  SearchInput,
  SecondaryButton,
  Toolbar,
  WinnerBadge,
} from './index'

describe('component library', () => {
  it('renders accessible buttons and forwards interactions', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    renderWithTheme(
      <>
        <PrimaryButton onClick={onClick}>Continue</PrimaryButton>
        <SecondaryButton>Cancel</SecondaryButton>
        <IconButton label="Settings" onClick={onClick}>
          <Dice5 />
        </IconButton>
      </>,
    )

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('renders interactive and static cards with supplied display data', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    renderWithTheme(
      <>
        <GameCard
          description="Word game"
          icon={<Dice5 />}
          meta="2–4 players"
          name="Scrabble"
          onSelect={onSelect}
          selected
        />
        <GameCard description="Static game" icon={<Dice5 />} name="Qwirkle" />
        <PlayerCard highlighted name="Mill" score={42} subtitle="Leader" />
        <ScoreCard
          accent="positive"
          detail="Round 2"
          label="Score"
          value="+12"
        />
      </>,
    )

    await user.click(screen.getByRole('button', { name: /Scrabble/ }))
    expect(onSelect).toHaveBeenCalledOnce()
    expect(screen.getByRole('article')).toHaveTextContent('Qwirkle')
    expect(screen.getByText('Leader')).toBeVisible()
    expect(screen.getByText('+12')).toBeVisible()
  })

  it('provides semantic responsive lists', () => {
    renderWithTheme(
      <>
        <GameList ariaLabel="Games">
          <GameListItem>Game one</GameListItem>
        </GameList>
        <PlayerList ariaLabel="Players">
          <PlayerListItem>Mill</PlayerListItem>
        </PlayerList>
      </>,
    )

    expect(screen.getByRole('list', { name: 'Games' })).toHaveClass('game-list')
    expect(screen.getByRole('list', { name: 'Players' })).toHaveClass(
      'unstyled-list',
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('renders labelled touch-sized inputs', () => {
    renderWithTheme(
      <>
        <PlayerNameInput />
        <SearchInput />
        <NumberInput label="Points" />
      </>,
    )

    expect(
      screen.getByRole('textbox', { name: 'Player name' }),
    ).toHaveAttribute('maxlength', '40')
    expect(
      screen.getByRole('searchbox', { name: 'Search games' }),
    ).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Points' })).toHaveAttribute(
      'inputmode',
      'decimal',
    )
  })

  it('renders status and empty-state indicators', () => {
    renderWithTheme(
      <>
        <WinnerBadge />
        <RoundIndicator current={2} total={5} />
        <RoundIndicator current={3} />
        <EmptyState
          description="Add someone to begin"
          icon={<Users />}
          title="No players"
        />
        <LoadingIndicator label="Restoring session" />
      </>,
    )

    expect(screen.getByText('Winner')).toBeVisible()
    expect(screen.getByLabelText('Round 2 of 5')).toBeVisible()
    expect(screen.getByLabelText('Round 3')).toBeVisible()
    expect(screen.getByText('No players')).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('Restoring session')
  })

  it('composes responsive layout and navigation landmarks', async () => {
    const onBack = vi.fn()
    const user = userEvent.setup()
    renderWithTheme(
      <AppLayout
        bottomAction={
          <BottomActionBar>
            <PrimaryButton>Save</PrimaryButton>
          </BottomActionBar>
        }
        footer={<Footer>Footer text</Footer>}
        header={
          <Header
            actions={<ColorSchemeToggle />}
            leading={<BackButton onClick={onBack} />}
            subtitle="Subtitle"
            title="Title"
          />
        }
      >
        <PageContainer>
          <CardSection labelledBy="section-title">
            <h2 id="section-title">Section</h2>
            <Toolbar>
              <span>Action</span>
            </Toolbar>
          </CardSection>
        </PageContainer>
      </AppLayout>,
    )

    expect(screen.getByRole('banner')).toHaveTextContent('Title')
    expect(screen.getByRole('main')).toHaveTextContent('Section')
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Footer text')
    await user.click(screen.getByRole('button', { name: 'Go back' }))
    expect(onBack).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'Use dark theme' }))
    expect(
      screen.getByRole('button', { name: 'Use system theme' }),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Use system theme' }))
    expect(screen.getByRole('button', { name: 'Use dark theme' })).toBeVisible()
  })
})

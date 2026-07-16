# PROJECTSPEC.md

# BoardScore

Version: 1.0 (MVP)

---

# Product Vision

BoardScore is a lightweight web application that replaces paper and spreadsheet score sheets for board games.

Rather than building a separate scorer for every game, BoardScore provides a configurable scoring engine powered by reusable game templates.

The application should be simple enough that players spend their time playing the board game—not learning the scoring application.

---

# Mission

Replace paper scoring with a fast, intuitive, and reliable digital scoring experience.

---

# Success Criteria

The MVP is successful when:

* Players no longer need paper or spreadsheets to score supported games.
* A new user can start scoring within 30 seconds.
* An active game is never lost because of an accidental refresh or browser close.
* The application supports at least 10 popular board games through reusable templates.

---

# Target Users

* Families
* Friends
* Casual board gamers
* Hobby board gamers
* Board game cafés (future)

---

# Core Product Principles

## Fast

Entering scores should always be faster than writing on paper.

## Simple

Avoid unnecessary configuration during gameplay.

## Reliable

No active game should ever be lost.

## Reversible

Every scoring action must be undoable.

## Configurable

Games should be defined through templates instead of hardcoded logic.

---

# MVP Scope

## Included

### Built-in Game Templates

The MVP should include templates for games such as:

* Scrabble
* Qwirkle
* Flip 7
* Sushi Go
* Azul
* Yahtzee
* Skyjo
* Phase 10
* Sequence
* Five Crowns

### Player Management

* Minimum of 2 players
* Unlimited players
* Add players
* Edit player names
* Remove players
* Reuse players for another game

### Scoring Modes

Support:

* Running Total
* Per Round

### Winner Calculation

Automatically determine the winner.

Initial winner rule:

* Highest Score Wins

The architecture should support additional winner rules in the future.

### Undo

Undo the latest scoring action.

### Session Recovery

Automatically save the current game after every meaningful change.

If an unfinished game exists when the application starts, prompt the user to:

* Resume Previous Game
* Discard Previous Game

### Reset

After a game:

* Reset scores
* Keep existing players
* Edit players
* Start another game

### Custom Templates

Allow users to create and manage custom game templates stored locally.

---

# Out of Scope (MVP)

The following are intentionally excluded:

* User accounts
* Cloud synchronization
* Multiplayer across devices
* Match history
* Statistics
* Sharing
* PDF export
* Images
* AI-assisted scoring
* Tournament mode
* Expansion packs
* Multiple score categories

---

# Technical Stack

Frontend

* React
* TypeScript
* Vite

UI

* Mantine
* Tailwind CSS

State Management

* Zustand

Routing

* React Router

Forms

* React Hook Form

Icons

* Lucide React

Testing

* Vitest
* React Testing Library

PWA

* vite-plugin-pwa

Storage

* Local Storage

Hosting

* Vercel

Alternative Hosting

* GitHub Pages

Target Monthly Cost

* $0

---

# Architecture

The application should follow a layered architecture.

Presentation Layer

↓

State Management

↓

Business Engines

↓

Storage

Business logic must remain independent from React and storage.

---

# Business Engines

The application should contain the following business engines:

* TemplateEngine
* ScoreEngine
* WinnerEngine
* UndoEngine
* SessionEngine

Each engine should be independently testable.

---

# Domain Models

Core models include:

* GameTemplate
* GameSession
* Player
* Round
* ScoreEvent

Scores are represented as immutable ScoreEvents.

Totals are calculated by the ScoreEngine.

Totals must never be stored directly.

# GameTemplate
-------------
id: string
name: string
description: string
icon: string
minimumPlayers: number
maximumPlayers: number | null
scoringType: RunningTotal | PerRound
winnerRule: HighestScore | LowestScore
roundConfiguration:
  type: Unlimited | Fixed
  totalRounds?: number
theme?: string
isBuiltIn: boolean
version: number

---

# Storage Strategy

Built-in templates are stored as JSON files.

Custom templates are stored in Local Storage.

The active game session is automatically persisted in Local Storage.

Completed games are discarded.

Storage should be abstracted so Local Storage can later be replaced by an API.

---

# User Flow

Home

↓

Select Game

↓

Player Setup

↓

Scoring

↓

Winner

↓

Play Again

or

Return Home

---

# UI Guidelines

The application is designed primarily for a phone or tablet placed in the center of a table.

The interface should emphasize:

* Large touch targets
* Large typography
* Minimal typing
* Fast score entry
* Responsive layouts
* High contrast

---

# Development Roadmap

Phase 1

* Project setup

Phase 2

* Domain models

Phase 3

* Business engines

Phase 4

* State management

Phase 5

* Local Storage

Phase 6

* UI implementation

Phase 7

* Built-in templates

Phase 8

* Custom templates

Phase 9

* Testing

Phase 10

* Polish and PWA improvements

---

# Future Roadmap

Version 2

* User accounts
* Cloud synchronization
* Statistics
* Match history
* Shared templates

Version 3

* Multiplayer devices
* Community templates
* Tournament mode
* Multiple score categories

---

# Definition of Done

The MVP is complete when users can:

1. Select a game template.
2. Add two or more players.
3. Score an entire game.
4. Undo mistakes.
5. Automatically calculate totals.
6. Automatically determine the winner.
7. Recover an unfinished game.
8. Reset scores while keeping players.
9. Create custom templates.
10. Deploy the application to Vercel or GitHub Pages without a backend.

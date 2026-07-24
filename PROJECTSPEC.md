# PROJECTSPEC.md

# BoardScore

Version: 1.1 (MVP)

---

# Product Vision

BoardScore is an offline-first browser-based scoring application that replaces paper score sheets and spreadsheets for tabletop games.

Rather than building a dedicated scorer for every game, BoardScore uses a reusable scoring engine powered by configurable game templates.

The application is designed for a single shared phone or tablet placed in the center of the table, allowing players to focus on the game instead of scorekeeping.

---

# Mission

Provide the fastest, simplest, and most reliable way to keep score for tabletop games without requiring accounts, internet connectivity during play, or separate apps for every game.

---

# Success Criteria

The MVP is successful when:

* Players no longer need paper or spreadsheets.
* A new game can start within 30 seconds.
* Active games automatically recover after normal refreshes or browser restarts.
* Gameplay continues without internet after the application has been loaded.
* At least 10 popular board games are supported through reusable templates.

---

# Target Users

* Families
* Friends
* Casual board gamers
* Hobby board gamers
* Board game meetups
* Board game cafés (future)

---

# Core Product Principles

## Fast

Entering scores must always be faster than writing on paper.

## Simple

Avoid unnecessary setup during gameplay.

## Reliable

Recover active games automatically.

## Reversible

Every scoring action must be undoable.

## Configurable

Games are defined through templates rather than hardcoded logic.

---

# Offline-First

BoardScore is an offline-first Progressive Web App.

After the application has been loaded successfully at least once:

* scoring works without an internet connection;
* built-in templates remain available;
* the application shell is cached locally;
* active games remain playable;
* custom templates remain available;
* player lists remain available;
* user preferences remain available.

Internet access is required only for:

* the initial application download;
* application updates;
* future online features.

Offline support does not include synchronization across browsers or devices.

---

# MVP Scope

## Included

### Built-in Game Templates

The MVP includes templates for:

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

* Minimum 2 players
* Unlimited players
* Add players
* Edit players
* Remove players
* Reuse previous players

### Scoring

Support:

* Running Total
* Per Round

### Winner Rules

Support:

* Highest Score Wins
* Lowest Score Wins

The architecture must allow additional winner rules without modifying engine logic.

### Undo

Undo the latest scoring action.

### Session Recovery

Automatically save the active game after every meaningful change.

When the application starts:

* Resume previous game
* Discard previous game

Recovery is guaranteed for normal refreshes, browser restarts, and temporary connectivity loss.

Recovery does not guarantee persistence after browser storage has been manually cleared.

### Reset

After a completed game:

* Reset scores
* Keep players
* Edit players
* Start another game

### Custom Templates

Users can create and manage custom templates stored locally.

---

# Out of Scope (MVP)

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

Primary:

* Vercel

Alternative:

* GitHub Pages

Target Monthly Cost:

* $0

---

# Architecture

The application follows a layered architecture:

Presentation

↓

State Management

↓

Business Engines

↓

Storage

Business logic must remain independent of React and storage implementations.

---

# Business Engines

The application consists of:

* TemplateEngine
* ScoreEngine
* WinnerEngine
* UndoEngine
* SessionEngine

Each engine must:

* be framework independent;
* be implemented in pure TypeScript;
* be independently testable.

---

# Domain Models

Core models:

* GameTemplate
* GameSession
* Player
* Round
* ScoreEvent

## ScoreEvent

Every scoring action is stored as an immutable ScoreEvent.

Totals are always calculated by ScoreEngine.

Totals must never be stored directly.

## GameTemplate

Fields include:

* id
* name
* description
* icon
* minimumPlayers
* maximumPlayers
* scoringType
* winnerRule
* roundConfiguration
* theme
* isBuiltIn
* version

---

# Storage Strategy

The MVP is completely client-side.

Built-in templates are bundled with the application.

Store locally:

* active game session;
* reusable player list;
* custom templates;
* user preferences.

Completed games are discarded after reset.

Business logic depends only on a storage abstraction so Local Storage can later be replaced by IndexedDB or a REST API without changing engine logic.

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

Designed primarily for a shared phone or tablet.

Prioritize:

* large touch targets;
* large typography;
* minimal typing;
* minimal dialogs;
* fast score entry;
* responsive layouts;
* high contrast.

---

# Non-Functional Requirements

BoardScore should:

* load within two seconds on a modern mobile connection;
* respond instantly to score updates;
* minimize unnecessary React re-renders;
* work well on common phone and tablet sizes;
* avoid requiring a keyboard during normal gameplay;
* function entirely without a backend.

---

# Development Roadmap

## Phase 1

Project setup

## Phase 2

Domain models

## Phase 3

Business engines

## Phase 4

State management

## Phase 5

Storage

## Phase 6

UI

## Phase 7

Built-in templates

## Phase 8

Custom templates

## Phase 9

Testing

## Phase 10

Polish and PWA improvements

---

# Future Enhancements

## Cloud Features

* User accounts
* Cloud synchronization
* Match history

## Community

* Shared templates
* Community templates

## Analytics

* Statistics
* Game history

## Competitive Play

* Tournament mode
* Multiplayer across devices
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
10. Continue scoring without internet after the application has been loaded.
11. Install the application as a Progressive Web App.
12. Deploy to Vercel or GitHub Pages without requiring a backend.

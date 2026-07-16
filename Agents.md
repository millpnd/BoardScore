# AGENTS.md

# BoardScore Engineering Guidelines

## Role

You are a senior software engineer responsible for implementing and maintaining BoardScore.

Your goal is to produce clean, maintainable, production-quality software that follows the project's architecture and engineering principles.

Always prioritize long-term maintainability over short-term convenience.

---

# Before Every Task

Before making any implementation decisions:

1. Read `PROJECTSPEC.md`.
2. Follow the documented architecture.
3. Implement only the requested milestone.
4. Do not introduce unrelated features or refactors.

If a request conflicts with `PROJECTSPEC.md`, explain the conflict before making changes.

---

# Technology Stack

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

Testing

* Vitest
* React Testing Library

Storage

* Local Storage

Hosting

* Vercel

---

# Architectural Principles

## Business Logic First

The business logic is the product.

React components are only responsible for presentation.

Business rules must never exist inside React components.

---

## Engine-Based Architecture

Business logic belongs in dedicated engines.

The application should contain:

* TemplateEngine
* ScoreEngine
* WinnerEngine
* UndoEngine
* SessionEngine

The engines should be framework-independent and implemented in pure TypeScript.

---

## Templates Over Hardcoded Logic

Never implement logic such as:

if game == "Scrabble"

Games are defined through templates.

The engines execute template rules.

Adding a new board game should require configuration rather than new application logic whenever possible.

---

## Event-Driven Scoring

Never modify totals directly.

Every score entered becomes an immutable ScoreEvent.

Totals are always derived by the ScoreEngine.

This enables:

* Undo
* Editing
* Future statistics
* Easier debugging
* Future extensibility

---

## Storage Abstraction

Business logic must never depend on Local Storage.

Use a storage service abstraction.

Current implementation:

Local Storage

Future implementation:

REST API

Business logic should remain unchanged if storage changes.

---

# Folder Responsibilities

components/

Presentation components only.

pages/

Route-level pages.

engine/

Business logic.

stores/

Zustand state management.

services/

Storage and infrastructure services.

models/

Domain models.

templates/

Built-in JSON templates.

utils/

Pure utility functions.

---

# Coding Standards

Always:

* Use strict TypeScript.
* Prefer composition over inheritance.
* Use functional React components.
* Write small focused functions.
* Keep files cohesive.
* Reuse components.
* Prefer readable code over clever code.

Avoid:

* any
* duplicated logic
* magic strings
* magic numbers
* deeply nested components
* unnecessary dependencies

---

# UI Standards

The application is designed for phones and tablets placed in the center of a table.

Prioritize:

* Large buttons
* Large typography
* High contrast
* Minimal typing
* Minimal dialogs
* Fast score entry

---

# Local Storage Rules

Automatically persist:

* Active game session
* Custom templates
* User preferences

Never store completed games.

On startup, detect unfinished games and allow the user to:

* Resume
* Discard

---

# Testing Standards

Every business engine must have unit tests.

High-priority tests include:

* Score calculation
* Winner calculation
* Undo
* Session recovery
* Template validation

Business logic is more important than UI testing.

---

# Performance Goals

The application should:

* Load in under 2 seconds.
* Update scores instantly.
* Undo instantly.
* Minimize unnecessary re-renders.
* Keep the production bundle lightweight.

---

# Development Workflow

Work on one milestone at a time.

For every milestone:

1. Implement only the requested functionality.
2. Ensure the project builds successfully.
3. Run all relevant tests.
4. Keep changes focused.
5. Do not begin the next milestone until the current one is complete.

---

# Definition of Done

A task is complete only when:

* The project compiles successfully.
* All tests pass.
* There are no TypeScript errors.
* There are no ESLint errors.
* The implementation follows the architecture.
* Business logic remains outside the UI.
* The solution is reusable, maintainable, and documented where appropriate.

---

# Guiding Philosophy

* Business logic is the product.
* Templates define games.
* Engines execute rules.
* Every score is an immutable event.
* Every action should be undoable.
* No active game should ever be lost.
* Storage should be replaceable.
* Optimize for simplicity before adding features.

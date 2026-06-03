# Feature Specification: Fix Kanban Board Creation Button

**Feature Branch**: `002-fix-create-board`

**Created**: 2026-06-03

**Status**: Draft

**Input**: User description: "Ik wil in mijn app een kanbanboard aanmaken. Maar er gebeurt niets wanneer ik op de knop druk. ook in developer tools wordt er niets aangeroepen."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a New Kanban Board (Priority: P1)

A user on the boards overview page clicks "Nieuw bord", fills in a board name, and confirms. The new board is created with default columns and immediately appears in the board list.

**Why this priority**: This is the core broken flow — the button exists but does nothing. Without this, users cannot create new boards at all.

**Independent Test**: Can be fully tested by clicking the "Nieuw bord" button on `/boards`, entering a name, clicking "Aanmaken", and verifying the new board appears in the list.

**Acceptance Scenarios**:

1. **Given** the user is on the boards overview page, **When** they click "Nieuw bord", **Then** a dialog opens with a text input for the board name
2. **Given** the dialog is open, **When** the user types a name and clicks "Aanmaken" (or presses Enter), **Then** the board is created with four default columns (Backlog, Doing, Review, Done) and appears in the board list
3. **Given** the dialog is open, **When** the user clicks "Annuleren" or closes the dialog, **Then** no board is created and the dialog disappears

---

### User Story 2 - Error Handling on Board Creation Failure (Priority: P2)

When board creation fails (e.g., network error, server error), the user sees a clear error message and can retry.

**Why this priority**: Users need feedback when something goes wrong; silent failures erode trust.

**Independent Test**: Can be tested by simulating a server error and verifying a toast/notification appears.

**Acceptance Scenarios**:

1. **Given** the user submits a board name, **When** the server returns an error, **Then** a toast notification displays the error message and the dialog remains open
2. **Given** the user is not authenticated, **When** they try to create a board, **Then** a clear "Niet ingelogd" error message is shown

---

### User Story 3 - Board List Refreshes After Creation (Priority: P3)

After successfully creating a board, the boards overview page reflects the new board without requiring a manual page refresh.

**Why this priority**: Immediate visual confirmation that the action succeeded; delayed feedback confuses users.

**Independent Test**: Create a board and verify the board card appears in the grid without manual refresh.

**Acceptance Scenarios**:

1. **Given** the user creates a board successfully, **When** the dialog closes, **Then** the new board card is visible in the boards grid within 2 seconds

---

### Edge Cases

- What happens when the user submits an empty board name? The "Aanmaken" button must be disabled when the name field is empty.
- What happens when the user submits a name with only whitespace? The name must be trimmed before submission; if trimmed name is empty, creation must not proceed.
- What happens when the user rapidly clicks "Aanmaken" multiple times? Duplicate creation must be prevented (the button must be disabled during submission).
- What happens when the user presses Enter in the name field? This must trigger creation (same as clicking "Aanmaken").

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The "Nieuw bord" button on the boards overview page MUST open a dialog when clicked
- **FR-002**: The dialog MUST contain a text input for the board name with auto-focus
- **FR-003**: The "Aanmaken" button MUST be disabled when the board name is empty or whitespace-only
- **FR-004**: The system MUST create a new board with the entered name and four default columns (Backlog, Doing, Review, Done) when the user confirms
- **FR-005**: The system MUST display an error notification when board creation fails
- **FR-006**: The board list MUST refresh automatically after a board is successfully created
- **FR-007**: The dialog MUST close after successful creation
- **FR-008**: The creation button in the dialog MUST be disabled during submission to prevent duplicate creation
- **FR-009**: The dead `CreateBoardDialog` import in `KanbanBoard.tsx` MUST be removed

### Key Entities

- **Board**: A kanban board with a name, owned by the authenticated user, containing columns
- **Column**: A vertical lane within a board (Backlog, Doing, Review, Done by default), ordered by position

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a new kanban board in under 10 seconds from clicking the button to seeing it in the list
- **SC-002**: The "Nieuw bord" button triggers a visible response (dialog opening) within 500ms of clicking
- **SC-003**: 100% of successful board creations result in the board appearing in the list without manual page refresh
- **SC-004**: 100% of failed board creations show a user-visible error message

## Assumptions

- The existing `CreateBoardDialog` component's interface is suitable for the fix (it already handles name input, Enter key, and dialog open/close)
- The existing `createBoard` server action's interface is suitable (it already inserts board + columns and revalidates the path)
- The boards overview page is a Next.js server component and cannot directly handle client-side events; a client component wrapper is needed
- Board names do not need to be unique per user
- The toast notification system already exists in the app and works correctly
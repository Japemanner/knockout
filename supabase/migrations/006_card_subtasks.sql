-- Add parent_id for card subtask hierarchy
-- Single-level nesting: a card can be a subtask of another card
-- ON DELETE SET NULL: when parent is deleted, subtasks become top-level

ALTER TABLE kk_cards ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES kk_cards(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_kk_cards_parent_id ON kk_cards(parent_id);

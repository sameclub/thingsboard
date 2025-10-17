-- Adds optional section column to calculated_field
ALTER TABLE IF EXISTS calculated_field
    ADD COLUMN IF NOT EXISTS section varchar(255);


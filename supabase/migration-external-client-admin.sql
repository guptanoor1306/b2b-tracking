-- Add External Client Admin channel role
-- Run in Supabase SQL Editor

ALTER TABLE profile_channels DROP CONSTRAINT IF EXISTS profile_channels_channel_role_check;
ALTER TABLE profile_channels ADD CONSTRAINT profile_channels_channel_role_check
  CHECK (channel_role IN (
    'Channel Admin',
    'Channel Team',
    'Agency',
    'Zerodha Viewer',
    'External Client Admin'
  ));

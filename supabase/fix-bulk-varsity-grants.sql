-- Fix bulk Varsity grants from early migrations
-- Run in Supabase SQL Editor

-- 1. Preview: who has multiple channels (review before deleting)
SELECT
  p.name,
  p.email,
  p.role,
  array_agg(c.name ORDER BY c.sort_order) AS channels
FROM profile_channels pc
JOIN profiles p ON p.id = pc.profile_id
JOIN channels c ON c.slug = pc.channel_slug
GROUP BY p.id, p.name, p.email, p.role
ORDER BY p.name;

-- 2. Remove Abhishek (or any user) from Varsity if they should only be on Zerodha Online
-- Replace email below, then uncomment and run:
--
-- DELETE FROM profile_channels
-- WHERE channel_slug = 'varsity'
--   AND profile_id = (
--     SELECT id FROM profiles WHERE email ILIKE 'abhishek@learnapp.com' LIMIT 1
--   );

-- 3. Optional: remove Varsity from anyone who has Zerodha Online but should NOT have Varsity
-- ONLY run after reviewing step 1. Excludes users who need both (add their emails to NOT IN).
--
-- DELETE FROM profile_channels pc
-- USING profiles p
-- WHERE pc.profile_id = p.id
--   AND pc.channel_slug = 'varsity'
--   AND EXISTS (
--     SELECT 1 FROM profile_channels zo
--     WHERE zo.profile_id = p.id AND zo.channel_slug = 'zerodha-online'
--   )
--   AND p.email NOT IN (
--     'pulkit@learnapp.com'  -- users who legitimately need BOTH channels
--   );

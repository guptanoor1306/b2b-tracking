-- Clean orphaned channel memberships (profile row deleted manually)
DELETE FROM profile_channels pc
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = pc.profile_id);

-- Optional: list auth users with no profile (recreate from Channel settings after this)
-- SELECT u.id, u.email FROM auth.users u
-- LEFT JOIN public.profiles p ON p.id = u.id
-- WHERE p.id IS NULL;

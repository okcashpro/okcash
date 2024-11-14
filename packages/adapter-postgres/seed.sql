
INSERT INTO public.accounts (id, name, email, "avatarUrl", details)
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Agent', 'default@agent.com', '', '{}'::jsonb);

INSERT INTO public.rooms (id)
VALUES ('00000000-0000-0000-0000-000000000000');

INSERT INTO public.participants (id, "userId", "roomId")
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');

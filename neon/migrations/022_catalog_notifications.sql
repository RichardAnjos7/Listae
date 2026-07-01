-- Preferências de notificação: moderação do catálogo (admin) e resultado da revisão (usuário)

alter table public.notification_preferences
  add column if not exists catalog_moderation boolean not null default true,
  add column if not exists catalog_review boolean not null default true;

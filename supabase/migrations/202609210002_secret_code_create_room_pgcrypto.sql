create extension if not exists pgcrypto;

alter function public.secret_code_create_room(text, smallint, jsonb)
set search_path = public, extensions;

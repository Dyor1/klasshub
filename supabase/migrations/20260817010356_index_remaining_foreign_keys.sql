-- Advisor follow-up: two FKs still lacked a covering index.
create index invitations_accepted_by_idx on public.invitations (accepted_by);
create index student_guardians_school_idx on public.student_guardians (school_id);

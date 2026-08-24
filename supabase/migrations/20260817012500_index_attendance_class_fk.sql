-- attendance_class_date_idx is (class_id, date) so it does not cover the
-- composite FK on (class_id, school_id).
create index attendance_class_school_idx on public.attendance (class_id, school_id);

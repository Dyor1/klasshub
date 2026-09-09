import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { PageHeader, EmptyState, Table, Chip, Avatar, btnGhost } from "@/components/ui";
import {
  FilterBar,
  SearchField,
  SelectField,
  FilterActions,
  ResultCount,
} from "@/components/Filters";
import { searchClauses, displayTerm } from "@/lib/search";
import StudentForm from "./StudentForm";
import BulkActions, { SelectAll, BULK_FORM_ID } from "./BulkActions";
import { deleteStudent } from "./actions";

export const metadata = { title: "Students — KlassHub" };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    class?: string;
    q?: string;
    gender?: string;
    status?: string;
  }>;
}) {
  // Whitelisted rather than cast. A query string is caller-controlled, and an
  // unrecognised value should fall back to "no filter" instead of being handed
  // to PostgREST as an enum it will reject with a 400.
  const STATUSES = ["active", "graduated", "withdrawn", "suspended"] as const;
  const GENDERS = ["male", "female"] as const;

  const sp = await searchParams;
  const classFilter = sp.class ?? "";
  const term = displayTerm(sp.q);
  const gender = GENDERS.find((g) => g === sp.gender);
  const status = STATUSES.find((s) => s === sp.status);
  const isFiltered = Boolean(classFilter || term || gender || status);

  const viewer = await requireViewer();
  const supabase = await createClient();

  const [{ data: classes }, studentsRes, { count: total }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, academic_year")
      .order("academic_year", { ascending: false })
      .order("name"),
    (async () => {
      let q = supabase
        .from("students")
        .select("id, admission_number, surname, first_name, other_names, gender, status, class_id")
        .order("surname");

      // Narrowed in SQL rather than in the browser: RLS still bounds the rows
      // to this school, and PostgREST would cap a fetch-everything approach at
      // 1000 pupils without saying so.
      if (classFilter) q = q.eq("class_id", classFilter);
      if (gender) q = q.eq("gender", gender);
      if (status) q = q.eq("status", status);

      for (const clause of searchClauses(["surname", "first_name", "other_names", "admission_number"], term)) q = q.or(clause);

      return q;
    })(),
    // The unfiltered size, so "12 of 340" reads as a narrow filter rather than
    // an empty school.
    supabase.from("students").select("id", { count: "exact", head: true }),
  ]);

  const students = studentsRes.data;
  const classById = new Map((classes ?? []).map((c) => [c.id, c.name]));

  return (
    <>
      <PageHeader
        title="Students"
        subtitle={
          viewer.isStaff
            ? "Everyone enrolled at your school."
            : "Your student record."
        }
        action={
          viewer.isStaff ? (
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/dashboard/students/import" className={btnGhost}>
                Import CSV
              </Link>
              <StudentForm classes={classes ?? []} />
            </div>
          ) : undefined
        }
      />

      {viewer.isStaff && (
        <FilterBar>
          <SearchField
            defaultValue={term}
            placeholder="Name or admission number…"
          />
          <SelectField
            name="class"
            label="Class"
            defaultValue={classFilter}
            allLabel="All classes"
            options={(classes ?? []).map((c) => ({ value: c.id, label: c.name }))}
          />
          <SelectField
            name="gender"
            label="Gender"
            defaultValue={gender ?? ""}
            allLabel="Any"
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
            ]}
          />
          <SelectField
            name="status"
            label="Status"
            defaultValue={status ?? ""}
            allLabel="Any"
            options={[
              { value: "active", label: "Active" },
              { value: "graduated", label: "Graduated" },
              { value: "withdrawn", label: "Withdrawn" },
              { value: "suspended", label: "Suspended" },
            ]}
          />
          <FilterActions clearHref="/dashboard/students" isFiltered={isFiltered} />
        </FilterBar>
      )}

      {viewer.isStaff && students && students.length > 0 && (
        <BulkActions classes={(classes ?? []).map((c) => ({ id: c.id, name: c.name }))} />
      )}

      {viewer.isStaff && students && students.length > 0 && (
        <ResultCount
          shown={students.length}
          total={total ?? undefined}
          noun="student"
          term={term || undefined}
        />
      )}

      {!students || students.length === 0 ? (
        <EmptyState
          title="No students found"
          hint={
            viewer.isStaff
              ? isFiltered
                ? "Nothing matches these filters. Try clearing one."
                : "Enrol your first student to get started."
              : "Your record hasn't been linked yet — ask your school administrator."
          }
        />
      ) : (
        <Table
          head={
            viewer.isStaff
              ? [<SelectAll key="all" />, "Admission no.", "Name", "Class", "Gender", "Status", ""]
              : ["Admission no.", "Name", "Class", "Gender", "Status"]
          }
        >
          {students.map((s) => (
            <tr key={s.id} className="hover:bg-hover">
              {viewer.isStaff && (
                <td className="px-4 py-3">
                  {/* Belongs to the bulk form above via `form`, not by being
                      nested in it — the delete form in the last cell means a
                      wrapping form would be a form inside a form. */}
                  <input
                    type="checkbox"
                    form={BULK_FORM_ID}
                    name="student_id"
                    value={s.id}
                    aria-label={`Select ${s.surname} ${s.first_name}`}
                    className="h-4 w-4 rounded border-line accent-brand-500"
                  />
                </td>
              )}
              <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                {s.admission_number}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={`${s.surname} ${s.first_name}`} />
                  <span className="font-medium text-ink">
                    {[s.surname, s.first_name, s.other_names].filter(Boolean).join(" ")}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-ink-muted">
                {s.class_id
                  ? classById.get(s.class_id) ?? "—"
                  : <span className="text-ink-subtle">Unassigned</span>}
              </td>
              <td className="px-4 py-3 capitalize text-ink-muted">
                {s.gender ?? <span className="text-ink-subtle">—</span>}
              </td>
              <td className="px-4 py-3">
                <Chip tone={s.status === "active" ? "green" : "slate"}>{s.status}</Chip>
              </td>
              {viewer.isStaff && (
                <td className="px-4 py-3 text-right">
                  <form action={deleteStudent}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="inline-flex min-h-11 items-center rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </form>
                </td>
              )}
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}

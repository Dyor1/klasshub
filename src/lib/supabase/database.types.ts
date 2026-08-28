export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          audience: Database["public"]["Enums"]["announcement_audience"]
          body: string
          class_id: string | null
          created_at: string
          created_by: string | null
          id: string
          school_id: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["announcement_audience"]
          body: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          school_id: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["announcement_audience"]
          body?: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          school_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_class_id_school_id_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "announcements_created_by_school_id_fkey"
            columns: ["created_by", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "announcements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          body: string | null
          feedback: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          is_late: boolean
          school_id: string
          score: number | null
          student_id: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          body?: string | null
          feedback?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_late?: boolean
          school_id: string
          score?: number | null
          student_id: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          body?: string | null
          feedback?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_late?: boolean
          school_id?: string
          score?: number | null
          student_id?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_graded_by_school_id_fkey"
            columns: ["graded_by", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "assignment_submissions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_school_id_fkey"
            columns: ["student_id", "school_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      assignments: {
        Row: {
          academic_year: string
          allow_file: boolean
          allow_text: boolean
          class_id: string
          created_at: string
          due_at: string | null
          id: string
          instructions: string | null
          max_score: number
          school_id: string
          status: Database["public"]["Enums"]["assignment_status"]
          subject_id: string | null
          teacher_id: string | null
          term: Database["public"]["Enums"]["term"]
          title: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          allow_file?: boolean
          allow_text?: boolean
          class_id: string
          created_at?: string
          due_at?: string | null
          id?: string
          instructions?: string | null
          max_score?: number
          school_id: string
          status?: Database["public"]["Enums"]["assignment_status"]
          subject_id?: string | null
          teacher_id?: string | null
          term: Database["public"]["Enums"]["term"]
          title: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          allow_file?: boolean
          allow_text?: boolean
          class_id?: string
          created_at?: string
          due_at?: string | null
          id?: string
          instructions?: string | null
          max_score?: number
          school_id?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          subject_id?: string | null
          teacher_id?: string | null
          term?: Database["public"]["Enums"]["term"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_class_id_school_id_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_subject_id_school_id_fkey"
            columns: ["subject_id", "school_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "assignments_teacher_id_school_id_fkey"
            columns: ["teacher_id", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      attendance: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          recorded_by: string | null
          remarks: string | null
          school_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date: string
          id?: string
          recorded_by?: string | null
          remarks?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          recorded_by?: string | null
          remarks?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_school_id_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "attendance_recorded_by_school_id_fkey"
            columns: ["recorded_by", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_school_id_fkey"
            columns: ["student_id", "school_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      cbt_answers: {
        Row: {
          answered_at: string
          id: string
          is_correct: boolean | null
          question_id: string
          school_id: string
          selected: Database["public"]["Enums"]["cbt_option"] | null
          session_id: string
        }
        Insert: {
          answered_at?: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          school_id: string
          selected?: Database["public"]["Enums"]["cbt_option"] | null
          session_id: string
        }
        Update: {
          answered_at?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          school_id?: string
          selected?: Database["public"]["Enums"]["cbt_option"] | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cbt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "cbt_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_answers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cbt_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cbt_exams: {
        Row: {
          academic_year: string
          class_id: string
          closes_at: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          instructions: string | null
          opens_at: string | null
          reveal_score: boolean
          school_id: string
          shuffle_questions: boolean
          status: Database["public"]["Enums"]["cbt_status"]
          subject_id: string | null
          term: Database["public"]["Enums"]["term"]
          title: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          class_id: string
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          instructions?: string | null
          opens_at?: string | null
          reveal_score?: boolean
          school_id: string
          shuffle_questions?: boolean
          status?: Database["public"]["Enums"]["cbt_status"]
          subject_id?: string | null
          term: Database["public"]["Enums"]["term"]
          title: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          class_id?: string
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          instructions?: string | null
          opens_at?: string | null
          reveal_score?: boolean
          school_id?: string
          shuffle_questions?: boolean
          status?: Database["public"]["Enums"]["cbt_status"]
          subject_id?: string | null
          term?: Database["public"]["Enums"]["term"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cbt_exams_class_id_school_id_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "cbt_exams_created_by_school_id_fkey"
            columns: ["created_by", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "cbt_exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_exams_subject_id_school_id_fkey"
            columns: ["subject_id", "school_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      cbt_questions: {
        Row: {
          correct_option: Database["public"]["Enums"]["cbt_option"]
          created_at: string
          exam_id: string
          id: string
          marks: number
          option_a: string
          option_b: string
          option_c: string | null
          option_d: string | null
          question_number: number
          question_text: string
          school_id: string
          updated_at: string
        }
        Insert: {
          correct_option: Database["public"]["Enums"]["cbt_option"]
          created_at?: string
          exam_id: string
          id?: string
          marks?: number
          option_a: string
          option_b: string
          option_c?: string | null
          option_d?: string | null
          question_number: number
          question_text: string
          school_id: string
          updated_at?: string
        }
        Update: {
          correct_option?: Database["public"]["Enums"]["cbt_option"]
          created_at?: string
          exam_id?: string
          id?: string
          marks?: number
          option_a?: string
          option_b?: string
          option_c?: string | null
          option_d?: string | null
          question_number?: number
          question_text?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cbt_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "cbt_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_questions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      cbt_sessions: {
        Row: {
          created_at: string
          exam_id: string
          expires_at: string
          id: string
          percentage: number | null
          school_id: string
          score: number | null
          started_at: string
          status: Database["public"]["Enums"]["cbt_session_status"]
          student_id: string
          submitted_at: string | null
          total_marks: number | null
        }
        Insert: {
          created_at?: string
          exam_id: string
          expires_at: string
          id?: string
          percentage?: number | null
          school_id: string
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["cbt_session_status"]
          student_id: string
          submitted_at?: string | null
          total_marks?: number | null
        }
        Update: {
          created_at?: string
          exam_id?: string
          expires_at?: string
          id?: string
          percentage?: number | null
          school_id?: string
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["cbt_session_status"]
          student_id?: string
          submitted_at?: string | null
          total_marks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cbt_sessions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "cbt_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_sessions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cbt_sessions_student_id_school_id_fkey"
            columns: ["student_id", "school_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      class_notes: {
        Row: {
          academic_year: string
          class_id: string
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          school_id: string
          subject_id: string | null
          term: Database["public"]["Enums"]["term"] | null
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          academic_year: string
          class_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          school_id: string
          subject_id?: string | null
          term?: Database["public"]["Enums"]["term"] | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          academic_year?: string
          class_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          school_id?: string
          subject_id?: string | null
          term?: Database["public"]["Enums"]["term"] | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_notes_class_id_school_id_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "class_notes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_notes_subject_id_school_id_fkey"
            columns: ["subject_id", "school_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "class_notes_uploaded_by_school_id_fkey"
            columns: ["uploaded_by", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year: string
          capacity: number | null
          class_teacher_id: string | null
          created_at: string
          grade_level: string
          id: string
          name: string
          school_id: string
          section: string | null
          updated_at: string
        }
        Insert: {
          academic_year: string
          capacity?: number | null
          class_teacher_id?: string | null
          created_at?: string
          grade_level: string
          id?: string
          name: string
          school_id: string
          section?: string | null
          updated_at?: string
        }
        Update: {
          academic_year?: string
          capacity?: number | null
          class_teacher_id?: string | null
          created_at?: string
          grade_level?: string
          id?: string
          name?: string
          school_id?: string
          section?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_class_teacher_id_school_id_fkey"
            columns: ["class_teacher_id", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_time: string | null
          id: string
          location: string | null
          school_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          location?: string | null
          school_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          location?: string | null
          school_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_school_id_fkey"
            columns: ["created_by", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_items: {
        Row: {
          academic_year: string
          amount: number
          class_id: string | null
          created_at: string
          id: string
          is_optional: boolean
          name: string
          school_id: string
          sort_order: number
          term: Database["public"]["Enums"]["term"]
          updated_at: string
        }
        Insert: {
          academic_year: string
          amount: number
          class_id?: string | null
          created_at?: string
          id?: string
          is_optional?: boolean
          name: string
          school_id: string
          sort_order?: number
          term: Database["public"]["Enums"]["term"]
          updated_at?: string
        }
        Update: {
          academic_year?: string
          amount?: number
          class_id?: string | null
          created_at?: string
          id?: string
          is_optional?: boolean
          name?: string
          school_id?: string
          sort_order?: number
          term?: Database["public"]["Enums"]["term"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_items_class_id_school_id_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "fee_items_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_bands: {
        Row: {
          created_at: string
          grade: string
          id: string
          max_score: number
          min_score: number
          remark: string | null
          school_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          grade: string
          id?: string
          max_score: number
          min_score: number
          remark?: string | null
          school_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          grade?: string
          id?: string
          max_score?: number
          min_score?: number
          remark?: string | null
          school_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "grade_bands_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["user_role"]
          school_id: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["user_role"]
          school_id: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_school_id_fkey"
            columns: ["invited_by", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "invitations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          amount: number
          description: string
          id: string
          invoice_id: string
          school_id: string
          sort_order: number
        }
        Insert: {
          amount: number
          description: string
          id?: string
          invoice_id: string
          school_id: string
          sort_order?: number
        }
        Update: {
          amount?: number
          description?: string
          id?: string
          invoice_id?: string
          school_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          academic_year: string
          class_id: string | null
          created_at: string
          discount: number
          id: string
          issued_at: string
          issued_by: string | null
          note: string | null
          school_id: string
          student_id: string
          term: Database["public"]["Enums"]["term"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          academic_year: string
          class_id?: string | null
          created_at?: string
          discount?: number
          id?: string
          issued_at?: string
          issued_by?: string | null
          note?: string | null
          school_id: string
          student_id: string
          term: Database["public"]["Enums"]["term"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          academic_year?: string
          class_id?: string | null
          created_at?: string
          discount?: number
          id?: string
          issued_at?: string
          issued_by?: string | null
          note?: string | null
          school_id?: string
          student_id?: string
          term?: Database["public"]["Enums"]["term"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_class_id_school_id_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "invoices_issued_by_school_id_fkey"
            columns: ["issued_by", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "invoices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_student_id_school_id_fkey"
            columns: ["student_id", "school_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      lesson_notes: {
        Row: {
          academic_year: string
          admin_feedback: string | null
          class_id: string | null
          created_at: string
          description: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string
          status: Database["public"]["Enums"]["lesson_note_status"]
          subject_id: string | null
          teacher_id: string
          term: Database["public"]["Enums"]["term"]
          topic: string
          updated_at: string
          week_number: number | null
        }
        Insert: {
          academic_year: string
          admin_feedback?: string | null
          class_id?: string | null
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["lesson_note_status"]
          subject_id?: string | null
          teacher_id: string
          term: Database["public"]["Enums"]["term"]
          topic: string
          updated_at?: string
          week_number?: number | null
        }
        Update: {
          academic_year?: string
          admin_feedback?: string | null
          class_id?: string | null
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["lesson_note_status"]
          subject_id?: string | null
          teacher_id?: string
          term?: Database["public"]["Enums"]["term"]
          topic?: string
          updated_at?: string
          week_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_notes_class_id_school_id_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "lesson_notes_reviewed_by_school_id_fkey"
            columns: ["reviewed_by", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "lesson_notes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_notes_subject_id_school_id_fkey"
            columns: ["subject_id", "school_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "lesson_notes_teacher_id_school_id_fkey"
            columns: ["teacher_id", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      message_outbox: {
        Row: {
          attempts: number
          body: string
          channel: Database["public"]["Enums"]["message_channel"]
          claimed_at: string | null
          destination: string
          error: string | null
          id: string
          notification_id: string | null
          provider: string | null
          provider_ref: string | null
          queued_at: string
          recipient_id: string | null
          school_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["message_status"]
          subject: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          body: string
          channel: Database["public"]["Enums"]["message_channel"]
          claimed_at?: string | null
          destination: string
          error?: string | null
          id?: string
          notification_id?: string | null
          provider?: string | null
          provider_ref?: string | null
          queued_at?: string
          recipient_id?: string | null
          school_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          subject?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          body?: string
          channel?: Database["public"]["Enums"]["message_channel"]
          claimed_at?: string | null
          destination?: string
          error?: string | null
          id?: string
          notification_id?: string | null
          provider?: string | null
          provider_ref?: string | null
          queued_at?: string
          recipient_id?: string | null
          school_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_outbox_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_outbox_recipient_id_school_id_fkey"
            columns: ["recipient_id", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "message_outbox_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email_enabled: boolean
          profile_id: string
          school_id: string
          sms_enabled: boolean
          updated_at: string
        }
        Insert: {
          email_enabled?: boolean
          profile_id: string
          school_id: string
          sms_enabled?: boolean
          updated_at?: string
        }
        Update: {
          email_enabled?: boolean
          profile_id?: string
          school_id?: string
          sms_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_routes: {
        Row: {
          email: boolean
          kind: Database["public"]["Enums"]["notification_kind"]
          school_id: string
          sms: boolean
          updated_at: string
        }
        Insert: {
          email?: boolean
          kind: Database["public"]["Enums"]["notification_kind"]
          school_id: string
          sms?: boolean
          updated_at?: string
        }
        Update: {
          email?: boolean
          kind?: Database["public"]["Enums"]["notification_kind"]
          school_id?: string
          sms?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_routes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          link: string | null
          read_at: string | null
          recipient_id: string
          school_id: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          link?: string | null
          read_at?: string | null
          recipient_id: string
          school_id: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          link?: string | null
          read_at?: string | null
          recipient_id?: string
          school_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_school_id_fkey"
            columns: ["recipient_id", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "notifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_attempts: {
        Row: {
          amount: number
          channel: string | null
          created_at: string
          id: string
          initiated_by: string | null
          invoice_id: string
          paid_at: string | null
          paystack_ref: string | null
          reference: string
          school_id: string
          status: Database["public"]["Enums"]["payment_attempt_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          channel?: string | null
          created_at?: string
          id?: string
          initiated_by?: string | null
          invoice_id: string
          paid_at?: string | null
          paystack_ref?: string | null
          reference: string
          school_id: string
          status?: Database["public"]["Enums"]["payment_attempt_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          channel?: string | null
          created_at?: string
          id?: string
          initiated_by?: string | null
          invoice_id?: string
          paid_at?: string | null
          paystack_ref?: string | null
          reference?: string
          school_id?: string
          status?: Database["public"]["Enums"]["payment_attempt_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_initiated_by_school_id_fkey"
            columns: ["initiated_by", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "payment_attempts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attempts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attempts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attempts_student_id_school_id_fkey"
            columns: ["student_id", "school_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          paid_at: string
          receipt_no: string
          recorded_by: string | null
          reference: string | null
          school_id: string
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          paid_at?: string
          receipt_no: string
          recorded_by?: string | null
          reference?: string | null
          school_id: string
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          paid_at?: string
          receipt_no?: string
          recorded_by?: string | null
          reference?: string | null
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_school_id_fkey"
            columns: ["recorded_by", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_school_id_fkey"
            columns: ["student_id", "school_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          school_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          school_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          academic_year: string
          ca_max: number
          ca_score: number
          class_id: string
          created_at: string
          exam_max: number
          exam_score: number
          grade: string | null
          id: string
          percentage: number | null
          position: number | null
          published: boolean
          recorded_by: string | null
          remarks: string | null
          school_id: string
          student_id: string
          subject_id: string
          term: Database["public"]["Enums"]["term"]
          total_score: number | null
          updated_at: string
        }
        Insert: {
          academic_year: string
          ca_max?: number
          ca_score?: number
          class_id: string
          created_at?: string
          exam_max?: number
          exam_score?: number
          grade?: string | null
          id?: string
          percentage?: number | null
          position?: number | null
          published?: boolean
          recorded_by?: string | null
          remarks?: string | null
          school_id: string
          student_id: string
          subject_id: string
          term: Database["public"]["Enums"]["term"]
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          academic_year?: string
          ca_max?: number
          ca_score?: number
          class_id?: string
          created_at?: string
          exam_max?: number
          exam_score?: number
          grade?: string | null
          id?: string
          percentage?: number | null
          position?: number | null
          published?: boolean
          recorded_by?: string | null
          remarks?: string | null
          school_id?: string
          student_id?: string
          subject_id?: string
          term?: Database["public"]["Enums"]["term"]
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_class_id_school_id_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "results_recorded_by_school_id_fkey"
            columns: ["recorded_by", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_student_id_school_id_fkey"
            columns: ["student_id", "school_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "results_subject_id_school_id_fkey"
            columns: ["subject_id", "school_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          id: string
          name: string
          pass_mark: number
          plan: Database["public"]["Enums"]["school_plan"]
          slug: string
          trial_ends_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          pass_mark?: number
          plan?: Database["public"]["Enums"]["school_plan"]
          slug: string
          trial_ends_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          pass_mark?: number
          plan?: Database["public"]["Enums"]["school_plan"]
          slug?: string
          trial_ends_at?: string
        }
        Relationships: []
      }
      student_guardians: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          profile_id: string
          relationship: string | null
          school_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          profile_id: string
          relationship?: string | null
          school_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          profile_id?: string
          relationship?: string | null
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_guardians_profile_id_school_id_fkey"
            columns: ["profile_id", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "student_guardians_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_student_id_school_id_fkey"
            columns: ["student_id", "school_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      student_transport: {
        Row: {
          board_status: Database["public"]["Enums"]["board_status"]
          board_updated_at: string | null
          created_at: string
          id: string
          pickup_point: string | null
          route_id: string
          school_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          board_status?: Database["public"]["Enums"]["board_status"]
          board_updated_at?: string | null
          created_at?: string
          id?: string
          pickup_point?: string | null
          route_id: string
          school_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          board_status?: Database["public"]["Enums"]["board_status"]
          board_updated_at?: string | null
          created_at?: string
          id?: string
          pickup_point?: string | null
          route_id?: string
          school_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_transport_route_id_school_id_fkey"
            columns: ["route_id", "school_id"]
            isOneToOne: false
            referencedRelation: "transport_routes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "student_transport_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transport_student_id_school_id_fkey"
            columns: ["student_id", "school_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          admission_date: string
          admission_number: string
          class_id: string | null
          created_at: string
          date_of_birth: string | null
          first_name: string
          gender: string | null
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          other_names: string | null
          photo_url: string | null
          profile_id: string | null
          school_id: string
          status: Database["public"]["Enums"]["student_status"]
          surname: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          admission_date?: string
          admission_number: string
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name: string
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          other_names?: string | null
          photo_url?: string | null
          profile_id?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["student_status"]
          surname: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          admission_date?: string
          admission_number?: string
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          other_names?: string | null
          photo_url?: string | null
          profile_id?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["student_status"]
          surname?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_school_id_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "students_profile_id_school_id_fkey"
            columns: ["profile_id", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable: {
        Row: {
          academic_year: string
          class_id: string
          created_at: string
          day_of_week: Database["public"]["Enums"]["weekday"]
          end_time: string
          id: string
          period_label: string | null
          room: string | null
          school_id: string
          start_time: string
          subject_id: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          academic_year: string
          class_id: string
          created_at?: string
          day_of_week: Database["public"]["Enums"]["weekday"]
          end_time: string
          id?: string
          period_label?: string | null
          room?: string | null
          school_id: string
          start_time: string
          subject_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          academic_year?: string
          class_id?: string
          created_at?: string
          day_of_week?: Database["public"]["Enums"]["weekday"]
          end_time?: string
          id?: string
          period_label?: string | null
          room?: string | null
          school_id?: string
          start_time?: string
          subject_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_class_id_school_id_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "timetable_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_subject_id_school_id_fkey"
            columns: ["subject_id", "school_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "timetable_teacher_id_school_id_fkey"
            columns: ["teacher_id", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      transport_routes: {
        Row: {
          capacity: number | null
          created_at: string
          driver_name: string | null
          driver_phone: string | null
          id: string
          name: string
          pickup_points: string[]
          school_id: string
          status: Database["public"]["Enums"]["route_status"]
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          name: string
          pickup_points?: string[]
          school_id: string
          status?: Database["public"]["Enums"]["route_status"]
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          name?: string
          pickup_points?: string[]
          school_id?: string
          status?: Database["public"]["Enums"]["route_status"]
          updated_at?: string
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_routes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      attendance_daily: {
        Row: {
          absent: number | null
          date: string | null
          excused: number | null
          late: number | null
          marked: number | null
          present: number | null
          school_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_monthly: {
        Row: {
          absent: number | null
          class_id: string | null
          excused: number | null
          late: number | null
          marked: number | null
          month: string | null
          present: number | null
          school_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_school_id_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      class_subject_performance: {
        Row: {
          academic_year: string | null
          avg_percentage: number | null
          class_id: string | null
          entries: number | null
          highest_percentage: number | null
          lowest_percentage: number | null
          passed: number | null
          published_count: number | null
          school_id: string | null
          subject_id: string | null
          term: Database["public"]["Enums"]["term"] | null
        }
        Relationships: [
          {
            foreignKeyName: "results_class_id_school_id_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_subject_id_school_id_fkey"
            columns: ["subject_id", "school_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      class_term_summary: {
        Row: {
          academic_year: string | null
          avg_percentage: number | null
          class_id: string | null
          entries: number | null
          passed: number | null
          published_count: number | null
          school_id: string | null
          students: number | null
          term: Database["public"]["Enums"]["term"] | null
        }
        Relationships: [
          {
            foreignKeyName: "results_class_id_school_id_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_summary: {
        Row: {
          academic_year: string | null
          billed: number | null
          class_id: string | null
          collected: number | null
          invoices: number | null
          outstanding: number | null
          paid_in_full: number | null
          part_paid: number | null
          school_id: string | null
          term: Database["public"]["Enums"]["term"] | null
          unpaid: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_class_id_school_id_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "invoices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_distribution: {
        Row: {
          academic_year: string | null
          class_id: string | null
          entries: number | null
          grade: string | null
          school_id: string | null
          term: Database["public"]["Enums"]["term"] | null
        }
        Relationships: [
          {
            foreignKeyName: "results_class_id_school_id_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_balances: {
        Row: {
          academic_year: string | null
          amount_paid: number | null
          balance: number | null
          class_id: string | null
          created_at: string | null
          discount: number | null
          id: string | null
          issued_at: string | null
          issued_by: string | null
          note: string | null
          payment_status: string | null
          school_id: string | null
          student_id: string | null
          term: Database["public"]["Enums"]["term"] | null
          total_amount: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_class_id_school_id_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "invoices_issued_by_school_id_fkey"
            columns: ["issued_by", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "invoices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_student_id_school_id_fkey"
            columns: ["student_id", "school_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      message_delivery_log: {
        Row: {
          attempts: number | null
          channel: Database["public"]["Enums"]["message_channel"] | null
          error: string | null
          id: string | null
          provider: string | null
          queued_at: string | null
          recipient_id: string | null
          school_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["message_status"] | null
        }
        Insert: {
          attempts?: number | null
          channel?: Database["public"]["Enums"]["message_channel"] | null
          error?: string | null
          id?: string | null
          provider?: string | null
          queued_at?: string | null
          recipient_id?: string | null
          school_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"] | null
        }
        Update: {
          attempts?: number | null
          channel?: Database["public"]["Enums"]["message_channel"] | null
          error?: string | null
          id?: string | null
          provider?: string | null
          queued_at?: string | null
          recipient_id?: string | null
          school_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "message_outbox_recipient_id_school_id_fkey"
            columns: ["recipient_id", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "message_outbox_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      results_ranked: {
        Row: {
          academic_year: string | null
          ca_max: number | null
          ca_score: number | null
          class_id: string | null
          created_at: string | null
          exam_max: number | null
          exam_score: number | null
          grade: string | null
          id: string | null
          percentage: number | null
          position: number | null
          published: boolean | null
          recorded_by: string | null
          remarks: string | null
          school_id: string | null
          student_id: string | null
          subject_cohort: number | null
          subject_id: string | null
          subject_position: number | null
          term: Database["public"]["Enums"]["term"] | null
          total_score: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "results_class_id_school_id_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "results_recorded_by_school_id_fkey"
            columns: ["recorded_by", "school_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_student_id_school_id_fkey"
            columns: ["student_id", "school_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "results_subject_id_school_id_fkey"
            columns: ["subject_id", "school_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
      student_term_summary: {
        Row: {
          academic_year: string | null
          avg_percentage: number | null
          class_id: string | null
          highest_percentage: number | null
          lowest_percentage: number | null
          published_count: number | null
          school_id: string | null
          student_id: string | null
          subjects_failed: number | null
          subjects_passed: number | null
          subjects_taken: number | null
          term: Database["public"]["Enums"]["term"] | null
          total_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "results_class_id_school_id_fkey"
            columns: ["class_id", "school_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_student_id_school_id_fkey"
            columns: ["student_id", "school_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "school_id"]
          },
        ]
      }
    }
    Functions: {
      cbt_answer: {
        Args: {
          p_question_id: string
          p_selected: Database["public"]["Enums"]["cbt_option"]
          p_session_id: string
        }
        Returns: undefined
      }
      cbt_paper: {
        Args: { p_session_id: string }
        Returns: {
          marks: number
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question_id: string
          question_number: number
          question_text: string
          selected: Database["public"]["Enums"]["cbt_option"]
        }[]
      }
      cbt_start: { Args: { p_exam_id: string }; Returns: string }
      cbt_submit: {
        Args: { p_session_id: string }
        Returns: {
          percentage: number
          revealed: boolean
          score: number
          total_marks: number
        }[]
      }
      claim_outbox_batch: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          body: string
          channel: Database["public"]["Enums"]["message_channel"]
          destination: string
          id: string
          subject: string
        }[]
      }
      create_payment_attempt: {
        Args: { p_invoice_id: string }
        Returns: {
          amount: number
          payer_email: string
          reference: string
        }[]
      }
      enqueue_email: {
        Args: { p_body: string; p_subject: string; p_to: string }
        Returns: string
      }
      fail_payment_attempt: {
        Args: {
          p_reference: string
          p_status?: Database["public"]["Enums"]["payment_attempt_status"]
        }
        Returns: string
      }
      generate_invoices: {
        Args: {
          p_academic_year: string
          p_class_id: string
          p_term: Database["public"]["Enums"]["term"]
        }
        Returns: {
          created: number
          skipped: number
        }[]
      }
      invitation_preview: {
        Args: { p_token: string }
        Returns: {
          expires_at: string
          invited_email: string
          invited_role: Database["public"]["Enums"]["user_role"]
          school_name: string
        }[]
      }
      record_paystack_payment: {
        Args: {
          p_amount_kobo: number
          p_channel?: string
          p_paystack_ref: string
          p_reference: string
        }
        Returns: string
      }
      replace_grade_bands: { Args: { p_bands: Json }; Returns: undefined }
      send_fee_reminders: {
        Args: {
          p_academic_year: string
          p_term: Database["public"]["Enums"]["term"]
        }
        Returns: {
          recipients: number
          students: number
        }[]
      }
    }
    Enums: {
      announcement_audience: "everyone" | "staff" | "students" | "parents"
      assignment_status: "draft" | "published" | "closed"
      attendance_status: "present" | "absent" | "late" | "excused"
      board_status: "not_boarded" | "boarded" | "dropped_off"
      cbt_option: "a" | "b" | "c" | "d"
      cbt_session_status: "in_progress" | "submitted" | "expired"
      cbt_status: "draft" | "published" | "closed"
      lesson_note_status: "draft" | "submitted" | "approved" | "rejected"
      message_channel: "email" | "sms"
      message_status: "queued" | "sending" | "sent" | "failed" | "skipped"
      notification_kind:
        | "announcement"
        | "result"
        | "attendance"
        | "fees"
        | "lesson_note"
        | "general"
      payment_attempt_status: "pending" | "success" | "failed" | "abandoned"
      payment_method:
        | "cash"
        | "transfer"
        | "pos"
        | "online"
        | "cheque"
        | "waiver"
      route_status: "active" | "inactive"
      school_plan: "trial" | "starter" | "standard" | "group"
      student_status: "active" | "graduated" | "withdrawn" | "suspended"
      term: "first" | "second" | "third"
      user_role: "admin" | "teacher" | "student" | "parent"
      weekday:
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      announcement_audience: ["everyone", "staff", "students", "parents"],
      assignment_status: ["draft", "published", "closed"],
      attendance_status: ["present", "absent", "late", "excused"],
      board_status: ["not_boarded", "boarded", "dropped_off"],
      cbt_option: ["a", "b", "c", "d"],
      cbt_session_status: ["in_progress", "submitted", "expired"],
      cbt_status: ["draft", "published", "closed"],
      lesson_note_status: ["draft", "submitted", "approved", "rejected"],
      message_channel: ["email", "sms"],
      message_status: ["queued", "sending", "sent", "failed", "skipped"],
      notification_kind: [
        "announcement",
        "result",
        "attendance",
        "fees",
        "lesson_note",
        "general",
      ],
      payment_attempt_status: ["pending", "success", "failed", "abandoned"],
      payment_method: ["cash", "transfer", "pos", "online", "cheque", "waiver"],
      route_status: ["active", "inactive"],
      school_plan: ["trial", "starter", "standard", "group"],
      student_status: ["active", "graduated", "withdrawn", "suspended"],
      term: ["first", "second", "third"],
      user_role: ["admin", "teacher", "student", "parent"],
      weekday: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ],
    },
  },
} as const

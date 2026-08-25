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
    PostgrestVersion: "14.15"
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
          receipt_no?: string
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          school_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          school_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
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
          plan: Database["public"]["Enums"]["school_plan"]
          slug: string
          trial_ends_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          plan?: Database["public"]["Enums"]["school_plan"]
          slug: string
          trial_ends_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
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
    }
    Views: {
      invoice_balances: {
        Row: {
          academic_year: string
          amount_paid: number
          balance: number
          class_id: string | null
          created_at: string
          discount: number
          id: string
          issued_at: string
          issued_by: string | null
          note: string | null
          payment_status: string
          school_id: string
          student_id: string
          term: Database["public"]["Enums"]["term"]
          total_amount: number
          updated_at: string
        }
        Relationships: []
      }
      results_ranked: {
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
          subject_cohort: number
          subject_id: string
          subject_position: number
          term: Database["public"]["Enums"]["term"]
          total_score: number | null
          updated_at: string
        }
        Relationships: []
      }
    }
    Functions: {
      invitation_preview: {
        Args: { p_token: string }
        Returns: {
          school_name: string
          invited_email: string
          invited_role: Database["public"]["Enums"]["user_role"]
          expires_at: string
        }[]
      }
      replace_grade_bands: {
        Args: { p_bands: Json }
        Returns: undefined
      }
      cbt_start: { Args: { p_exam_id: string }; Returns: string }
      cbt_paper: {
        Args: { p_session_id: string }
        Returns: {
          question_id: string
          question_number: number
          question_text: string
          option_a: string
          option_b: string
          option_c: string | null
          option_d: string | null
          marks: number
          selected: Database["public"]["Enums"]["cbt_option"] | null
        }[]
      }
      cbt_answer: {
        Args: {
          p_session_id: string
          p_question_id: string
          p_selected: Database["public"]["Enums"]["cbt_option"]
        }
        Returns: undefined
      }
      cbt_submit: {
        Args: { p_session_id: string }
        Returns: {
          score: number
          total_marks: number
          percentage: number
          revealed: boolean
        }[]
      }
      send_fee_reminders: {
        Args: {
          p_term: Database["public"]["Enums"]["term"]
          p_academic_year: string
        }
        Returns: { students: number; recipients: number }[]
      }
      generate_invoices: {
        Args: {
          p_class_id: string
          p_term: Database["public"]["Enums"]["term"]
          p_academic_year: string
        }
        Returns: { created: number; skipped: number }[]
      }
    }
    Enums: {
      announcement_audience: "everyone" | "staff" | "students" | "parents"
      attendance_status: "present" | "absent" | "late" | "excused"
      cbt_option: "a" | "b" | "c" | "d"
      cbt_session_status: "in_progress" | "submitted" | "expired"
      cbt_status: "draft" | "published" | "closed"
      board_status: "not_boarded" | "boarded" | "dropped_off"
      route_status: "active" | "inactive"
      lesson_note_status: "draft" | "submitted" | "approved" | "rejected"
      notification_kind:
        | "announcement"
        | "result"
        | "attendance"
        | "fees"
        | "lesson_note"
        | "general"
      payment_method:
        | "cash"
        | "transfer"
        | "pos"
        | "online"
        | "cheque"
        | "waiver"
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
      attendance_status: ["present", "absent", "late", "excused"],
      cbt_option: ["a", "b", "c", "d"],
      cbt_session_status: ["in_progress", "submitted", "expired"],
      cbt_status: ["draft", "published", "closed"],
      board_status: ["not_boarded", "boarded", "dropped_off"],
      route_status: ["active", "inactive"],
      lesson_note_status: ["draft", "submitted", "approved", "rejected"],
      notification_kind: ["announcement","result","attendance","fees","lesson_note","general"],
      payment_method: ["cash", "transfer", "pos", "online", "cheque", "waiver"],
      school_plan: ["trial", "starter", "standard", "group"],
      student_status: ["active", "graduated", "withdrawn", "suspended"],
      term: ["first", "second", "third"],
      user_role: ["admin", "teacher", "student", "parent"],
      weekday: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
    },
  },
} as const

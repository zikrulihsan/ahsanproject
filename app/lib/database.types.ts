/**
 * The shape of the database, as the migrations in `supabase/migrations/` define
 * it. Written by hand rather than generated, so it stays readable — keep it in
 * step when you change a migration.
 */
export type ProjectRow = {
  id: number;
  slug: string;
  title: string;
  tagline: string;
  owner_id: string;
  stage: string;
  problem: string;
  solution: string;
  audience: string;
  doc_url: string;
  live_url: string;
  repo_url: string;
  tags: string[];
  accent: string;
  glyph: string;
  created_at: string;
  updated_at: string;
};

export type ProjectOverviewRow = Omit<ProjectRow, "updated_at"> & {
  owner_username: string;
  owner_name: string;
  seat_count: number;
  open_seat_count: number;
  active_member_count: number;
  boost_count: number;
  comment_count: number;
};

export type ProfileRow = {
  id: string;
  username: string;
  name: string;
  headline: string;
  bio: string;
  website: string;
  github: string;
  created_at: string;
};

export type SeatRow = {
  id: number;
  project_id: number;
  role: string;
  brief: string;
  status: string;
  user_id: string | null;
  pitch: string;
  created_at: string;
};

export type CommentRow = {
  id: number;
  project_id: number;
  author_id: string;
  body: string;
  created_at: string;
};

export type BoostRow = {
  project_id: number;
  user_id: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string; username: string; name: string };
        Update: Partial<Omit<ProfileRow, "id" | "created_at">>;
      };
      projects: {
        Row: ProjectRow;
        Insert: Omit<ProjectRow, "id" | "created_at" | "updated_at"> & { id?: never };
        Update: Partial<Omit<ProjectRow, "id" | "owner_id" | "created_at">>;
      };
      seats: {
        Row: SeatRow;
        Insert: Omit<SeatRow, "id" | "created_at" | "user_id" | "pitch" | "status"> &
          Partial<Pick<SeatRow, "status" | "user_id" | "pitch">>;
        Update: Partial<Omit<SeatRow, "id" | "project_id" | "created_at">>;
      };
      comments: {
        Row: CommentRow;
        Insert: Omit<CommentRow, "id" | "created_at">;
        Update: Partial<Pick<CommentRow, "body">>;
      };
      boosts: {
        Row: BoostRow;
        Insert: Omit<BoostRow, "created_at">;
        Update: never;
      };
    };
    Views: {
      project_overview: { Row: ProjectOverviewRow };
    };
    Functions: {
      apply_for_seat: { Args: { seat_id: number; pitch: string }; Returns: undefined };
      decide_seat: { Args: { seat_id: number; accept: boolean }; Returns: undefined };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

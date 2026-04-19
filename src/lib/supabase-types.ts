export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          college: string | null;
          branch: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          college?: string | null;
          branch?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          college?: string | null;
          branch?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          profile: Json;
          report_data: Json;
          risk_score: number | null;
          plan: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          profile: Json;
          report_data: Json;
          risk_score?: number | null;
          plan?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          profile?: Json;
          report_data?: Json;
          risk_score?: number | null;
          plan?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          user_id: string | null;
          report_id: string | null;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          razorpay_signature: string | null;
          plan: string;
          amount: number;
          status: string;
          token: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          report_id?: string | null;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          plan: string;
          amount: number;
          status?: string;
          token?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          report_id?: string | null;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          plan?: string;
          amount?: number;
          status?: string;
          token?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      battles: {
        Row: {
          id: string;
          battle_id: string;
          creator_profile: Json | null;
          joiner_profile: Json | null;
          creator_report: Json | null;
          joiner_report: Json | null;
          winner: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          battle_id: string;
          creator_profile?: Json | null;
          joiner_profile?: Json | null;
          creator_report?: Json | null;
          joiner_report?: Json | null;
          winner?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          battle_id?: string;
          creator_profile?: Json | null;
          joiner_profile?: Json | null;
          creator_report?: Json | null;
          joiner_report?: Json | null;
          winner?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

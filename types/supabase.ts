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
      escolas: {
        Row: {
          id: string;
          nome: string;
          subtitulo: string | null;
          cnpj_ou_inep: string | null;
          modelo_ensino: string | null;
          cidade: string | null;
          plano_badge: string | null;
          logo_data_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          subtitulo?: string | null;
          cnpj_ou_inep?: string | null;
          modelo_ensino?: string | null;
          cidade?: string | null;
          plano_badge?: string | null;
          logo_data_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          subtitulo?: string | null;
          cnpj_ou_inep?: string | null;
          modelo_ensino?: string | null;
          cidade?: string | null;
          plano_badge?: string | null;
          logo_data_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      disciplinas: {
        Row: {
          id: string;
          escola_id: string;
          nome: string;
          codigo: string;
          cor_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          escola_id: string;
          nome: string;
          codigo: string;
          cor_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          escola_id?: string;
          nome?: string;
          codigo?: string;
          cor_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "disciplinas_escola_id_fkey";
            columns: ["escola_id"];
            isOneToOne: false;
            referencedRelation: "escolas";
            referencedColumns: ["id"];
          }
        ];
      };
      turmas: {
        Row: {
          id: string;
          escola_id: string;
          nome: string;
          turno: "Matutino" | "Vespertino" | "Noturno" | "Integral";
          matriz_curricular: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          escola_id: string;
          nome: string;
          turno: "Matutino" | "Vespertino" | "Noturno" | "Integral";
          matriz_curricular?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          escola_id?: string;
          nome?: string;
          turno?: "Matutino" | "Vespertino" | "Noturno" | "Integral";
          matriz_curricular?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "turmas_escola_id_fkey";
            columns: ["escola_id"];
            isOneToOne: false;
            referencedRelation: "escolas";
            referencedColumns: ["id"];
          }
        ];
      };
      professores: {
        Row: {
          id: string;
          escola_id: string;
          nome: string;
          vinculos: Json;
          indisponibilidades: Json;
          regras: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          escola_id: string;
          nome: string;
          vinculos?: Json;
          indisponibilidades?: Json;
          regras?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          escola_id?: string;
          nome?: string;
          vinculos?: Json;
          indisponibilidades?: Json;
          regras?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "professores_escola_id_fkey";
            columns: ["escola_id"];
            isOneToOne: false;
            referencedRelation: "escolas";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

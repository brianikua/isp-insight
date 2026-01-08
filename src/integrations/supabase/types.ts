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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          reseller_id: string | null
          router_id: string | null
          severity: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          reseller_id?: string | null
          router_id?: string | null
          severity?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          reseller_id?: string | null
          router_id?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      pppoe_sessions: {
        Row: {
          assigned_ip: string | null
          comment: string | null
          created_at: string
          id: string
          interface: string | null
          is_active: boolean | null
          last_updated_at: string
          profile: string | null
          reseller_id: string | null
          router_id: string
          rx_bytes: number | null
          rx_rate_bps: number | null
          tx_bytes: number | null
          tx_rate_bps: number | null
          uptime_seconds: number | null
          username: string
        }
        Insert: {
          assigned_ip?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          interface?: string | null
          is_active?: boolean | null
          last_updated_at?: string
          profile?: string | null
          reseller_id?: string | null
          router_id: string
          rx_bytes?: number | null
          rx_rate_bps?: number | null
          tx_bytes?: number | null
          tx_rate_bps?: number | null
          uptime_seconds?: number | null
          username: string
        }
        Update: {
          assigned_ip?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          interface?: string | null
          is_active?: boolean | null
          last_updated_at?: string
          profile?: string | null
          reseller_id?: string | null
          router_id?: string
          rx_bytes?: number | null
          rx_rate_bps?: number | null
          tx_bytes?: number | null
          tx_rate_bps?: number | null
          uptime_seconds?: number | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "pppoe_sessions_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pppoe_sessions_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reseller_user_mappings: {
        Row: {
          created_at: string
          id: string
          pppoe_username: string
          reseller_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pppoe_username: string
          reseller_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pppoe_username?: string
          reseller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_user_mappings_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      resellers: {
        Row: {
          bandwidth_cap_mbps: number | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          detection_rules: Json | null
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          bandwidth_cap_mbps?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          detection_rules?: Json | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          bandwidth_cap_mbps?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          detection_rules?: Json | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      routers: {
        Row: {
          created_at: string
          host: string
          id: string
          is_online: boolean | null
          last_seen_at: string | null
          name: string
          password: string
          port: number
          routeros_version: string | null
          site_name: string | null
          updated_at: string
          use_snmp: boolean | null
          username: string
        }
        Insert: {
          created_at?: string
          host: string
          id?: string
          is_online?: boolean | null
          last_seen_at?: string | null
          name: string
          password: string
          port?: number
          routeros_version?: string | null
          site_name?: string | null
          updated_at?: string
          use_snmp?: boolean | null
          username: string
        }
        Update: {
          created_at?: string
          host?: string
          id?: string
          is_online?: boolean | null
          last_seen_at?: string | null
          name?: string
          password?: string
          port?: number
          routeros_version?: string | null
          site_name?: string | null
          updated_at?: string
          use_snmp?: boolean | null
          username?: string
        }
        Relationships: []
      }
      usage_history: {
        Row: {
          avg_bandwidth_mbps: number | null
          id: string
          recorded_at: string
          reseller_id: string | null
          router_id: string | null
          session_count: number | null
          total_rx_bytes: number | null
          total_tx_bytes: number | null
        }
        Insert: {
          avg_bandwidth_mbps?: number | null
          id?: string
          recorded_at?: string
          reseller_id?: string | null
          router_id?: string | null
          session_count?: number | null
          total_rx_bytes?: number | null
          total_tx_bytes?: number | null
        }
        Update: {
          avg_bandwidth_mbps?: number | null
          id?: string
          recorded_at?: string
          reseller_id?: string | null
          router_id?: string | null
          session_count?: number | null
          total_rx_bytes?: number | null
          total_tx_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_history_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_history_router_id_fkey"
            columns: ["router_id"]
            isOneToOne: false
            referencedRelation: "routers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: "admin" | "readonly"
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
      user_role: ["admin", "readonly"],
    },
  },
} as const

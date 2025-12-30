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
      bills_to_pay: {
        Row: {
          amount: number
          created_at: string | null
          description: string
          due_date: string
          id: string
          is_paid: boolean | null
          notes: string | null
          paid_at: string | null
          recipient_name: string
          recipient_pix: string | null
          recipient_whatsapp: string | null
          seller_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description: string
          due_date: string
          id?: string
          is_paid?: boolean | null
          notes?: string | null
          paid_at?: string | null
          recipient_name: string
          recipient_pix?: string | null
          recipient_whatsapp?: string | null
          seller_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string
          due_date?: string
          id?: string
          is_paid?: boolean | null
          notes?: string | null
          paid_at?: string | null
          recipient_name?: string
          recipient_pix?: string | null
          recipient_whatsapp?: string | null
          seller_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      client_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          seller_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          seller_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          seller_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          category: string | null
          created_at: string | null
          device: string | null
          email: string | null
          expiration_date: string
          has_paid_apps: boolean | null
          id: string
          is_paid: boolean | null
          login: string | null
          name: string
          notes: string | null
          paid_apps_duration: string | null
          paid_apps_expiration: string | null
          password: string | null
          phone: string | null
          plan_id: string | null
          plan_name: string | null
          plan_price: number | null
          premium_password: string | null
          referral_code: string | null
          seller_id: string
          server_id: string | null
          server_name: string | null
          telegram: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          device?: string | null
          email?: string | null
          expiration_date: string
          has_paid_apps?: boolean | null
          id?: string
          is_paid?: boolean | null
          login?: string | null
          name: string
          notes?: string | null
          paid_apps_duration?: string | null
          paid_apps_expiration?: string | null
          password?: string | null
          phone?: string | null
          plan_id?: string | null
          plan_name?: string | null
          plan_price?: number | null
          premium_password?: string | null
          referral_code?: string | null
          seller_id: string
          server_id?: string | null
          server_name?: string | null
          telegram?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          device?: string | null
          email?: string | null
          expiration_date?: string
          has_paid_apps?: boolean | null
          id?: string
          is_paid?: boolean | null
          login?: string | null
          name?: string
          notes?: string | null
          paid_apps_duration?: string | null
          paid_apps_expiration?: string | null
          password?: string | null
          phone?: string | null
          plan_id?: string | null
          plan_name?: string | null
          plan_price?: number | null
          premium_password?: string | null
          referral_code?: string | null
          seller_id?: string
          server_id?: string | null
          server_name?: string | null
          telegram?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number | null
          discount_type: Database["public"]["Enums"]["discount_type"] | null
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_plan_value: number | null
          name: string
          seller_id: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number | null
          discount_type?: Database["public"]["Enums"]["discount_type"] | null
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_plan_value?: number | null
          name: string
          seller_id: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number | null
          discount_type?: Database["public"]["Enums"]["discount_type"] | null
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_plan_value?: number | null
          name?: string
          seller_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempt_at: string
          email: string
          id: string
          ip_address: string | null
          success: boolean
        }
        Insert: {
          attempt_at?: string
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Update: {
          attempt_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean
        }
        Relationships: []
      }
      message_history: {
        Row: {
          client_id: string
          id: string
          message_content: string
          message_type: string
          phone: string
          seller_id: string
          sent_at: string | null
          template_id: string | null
        }
        Insert: {
          client_id: string
          id?: string
          message_content: string
          message_type: string
          phone: string
          seller_id: string
          sent_at?: string | null
          template_id?: string | null
        }
        Update: {
          client_id?: string
          id?: string
          message_content?: string
          message_type?: string
          phone?: string
          seller_id?: string
          sent_at?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_history_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      panel_clients: {
        Row: {
          assigned_at: string | null
          client_id: string
          id: string
          panel_id: string
          seller_id: string
        }
        Insert: {
          assigned_at?: string | null
          client_id: string
          id?: string
          panel_id: string
          seller_id: string
        }
        Update: {
          assigned_at?: string | null
          client_id?: string
          id?: string
          panel_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "panel_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panel_clients_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "shared_panels"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          duration_days: number
          id: string
          is_active: boolean | null
          name: string
          price: number
          screens: number | null
          seller_id: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          screens?: number | null
          seller_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          screens?: number | null
          seller_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          is_permanent: boolean | null
          needs_password_update: boolean | null
          pix_key: string | null
          subscription_expires_at: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          is_permanent?: boolean | null
          needs_password_update?: boolean | null
          pix_key?: string | null
          subscription_expires_at?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          is_permanent?: boolean | null
          needs_password_update?: boolean | null
          pix_key?: string | null
          subscription_expires_at?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          discount_percentage: number | null
          id: string
          referred_client_id: string
          referrer_client_id: string
          seller_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          referred_client_id: string
          referrer_client_id: string
          seller_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          referred_client_id?: string
          referrer_client_id?: string
          seller_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_client_id_fkey"
            columns: ["referred_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_client_id_fkey"
            columns: ["referrer_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      servers: {
        Row: {
          created_at: string | null
          credit_value: number | null
          id: string
          is_active: boolean | null
          is_credit_based: boolean | null
          monthly_cost: number | null
          name: string
          notes: string | null
          panel_url: string | null
          seller_id: string
          total_credits: number | null
          updated_at: string | null
          used_credits: number | null
        }
        Insert: {
          created_at?: string | null
          credit_value?: number | null
          id?: string
          is_active?: boolean | null
          is_credit_based?: boolean | null
          monthly_cost?: number | null
          name: string
          notes?: string | null
          panel_url?: string | null
          seller_id: string
          total_credits?: number | null
          updated_at?: string | null
          used_credits?: number | null
        }
        Update: {
          created_at?: string | null
          credit_value?: number | null
          id?: string
          is_active?: boolean | null
          is_credit_based?: boolean | null
          monthly_cost?: number | null
          name?: string
          notes?: string | null
          panel_url?: string | null
          seller_id?: string
          total_credits?: number | null
          updated_at?: string | null
          used_credits?: number | null
        }
        Relationships: []
      }
      shared_panels: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          iptv_per_credit: number | null
          is_active: boolean | null
          login: string | null
          monthly_cost: number
          name: string
          notes: string | null
          p2p_per_credit: number | null
          panel_type: string
          password: string | null
          seller_id: string
          total_slots: number
          updated_at: string | null
          url: string | null
          used_slots: number
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          iptv_per_credit?: number | null
          is_active?: boolean | null
          login?: string | null
          monthly_cost?: number
          name: string
          notes?: string | null
          p2p_per_credit?: number | null
          panel_type?: string
          password?: string | null
          seller_id: string
          total_slots?: number
          updated_at?: string | null
          url?: string | null
          used_slots?: number
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          iptv_per_credit?: number | null
          is_active?: boolean | null
          login?: string | null
          monthly_cost?: number
          name?: string
          notes?: string | null
          p2p_per_credit?: number | null
          panel_type?: string
          password?: string | null
          seller_id?: string
          total_slots?: number
          updated_at?: string | null
          url?: string | null
          used_slots?: number
        }
        Relationships: []
      }
      tutorials: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          order_index: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          youtube_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          youtube_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          youtube_url?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_templates: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          message: string
          name: string
          seller_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          message: string
          name: string
          seller_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          message?: string
          name?: string
          seller_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_login_attempts: { Args: never; Returns: undefined }
      create_default_plans_for_seller: {
        Args: { seller_uuid: string }
        Returns: undefined
      }
      create_default_templates_for_seller: {
        Args: { seller_uuid: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_blocked: { Args: { user_email: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "seller"
      discount_type: "percentage" | "fixed"
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
      app_role: ["admin", "seller"],
      discount_type: ["percentage", "fixed"],
    },
  },
} as const

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      banners: {
        Row: {
          active: boolean
          badge_text: string | null
          button_link: string | null
          button_text: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          position: number
          subtitle: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          badge_text?: string | null
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          position?: number
          subtitle?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          badge_text?: string | null
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          position?: number
          subtitle?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_percent: number
          expires_at: string | null
          first_order_only: boolean
          id: string
          min_items: number
          min_subtotal: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_percent: number
          expires_at?: string | null
          first_order_only?: boolean
          id?: string
          min_items?: number
          min_subtotal?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          first_order_only?: boolean
          id?: string
          min_items?: number
          min_subtotal?: number
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          balance: number
          total_earned: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          points: number
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          points: number
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          points?: number
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          order_id: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          order_id?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          order_id?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price: number
          product_id: string
          product_name: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price: number
          product_id: string
          product_name: string
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          product_id?: string
          product_name?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string
          coupon_code: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          discount: number
          id: string
          notes: string | null
          otp_attempts: number
          otp_code: string | null
          otp_expires_at: string | null
          payment_method: string
          payment_reference: string | null
          phone: string
          points_awarded: boolean
          points_discount: number
          points_earned: number
          points_used: number
          shipping_cost: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total_price: number
          updated_at: string
          user_id: string | null
          verification_method: string | null
          verified_at: string | null
        }
        Insert: {
          address: string
          coupon_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          discount?: number
          id?: string
          notes?: string | null
          otp_attempts?: number
          otp_code?: string | null
          otp_expires_at?: string | null
          payment_method?: string
          payment_reference?: string | null
          phone: string
          points_awarded?: boolean
          points_discount?: number
          points_earned?: number
          points_used?: number
          shipping_cost?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total_price: number
          updated_at?: string
          user_id?: string | null
          verification_method?: string | null
          verified_at?: string | null
        }
        Update: {
          address?: string
          coupon_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          discount?: number
          id?: string
          notes?: string | null
          otp_attempts?: number
          otp_code?: string | null
          otp_expires_at?: string | null
          payment_method?: string
          payment_reference?: string | null
          phone?: string
          points_awarded?: boolean
          points_discount?: number
          points_earned?: number
          points_used?: number
          shipping_cost?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total_price?: number
          updated_at?: string
          user_id?: string | null
          verification_method?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          featured: boolean
          id: string
          image_url: string | null
          name: string
          old_price: number | null
          price: number
          quantity: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          name: string
          old_price?: number | null
          price: number
          quantity?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          name?: string
          old_price?: number | null
          price?: number
          quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          featured_subtitle: string
          featured_title: string
          footer_contact: string
          footer_copyright: string
          footer_description: string
          footer_links: Json
          hero_badge: string
          hero_cta_primary: string
          hero_cta_secondary: string
          hero_description: string
          hero_features: Json
          hero_title: string
          hero_title_highlight: string
          id: boolean
          site_name: string
          site_tagline: string
          updated_at: string
        }
        Insert: {
          featured_subtitle?: string
          featured_title?: string
          footer_contact?: string
          footer_copyright?: string
          footer_description?: string
          footer_links?: Json
          hero_badge?: string
          hero_cta_primary?: string
          hero_cta_secondary?: string
          hero_description?: string
          hero_features?: Json
          hero_title?: string
          hero_title_highlight?: string
          id?: boolean
          site_name?: string
          site_tagline?: string
          updated_at?: string
        }
        Update: {
          featured_subtitle?: string
          featured_title?: string
          footer_contact?: string
          footer_copyright?: string
          footer_description?: string
          footer_links?: Json
          hero_badge?: string
          hero_cta_primary?: string
          hero_cta_secondary?: string
          hero_description?: string
          hero_features?: Json
          hero_title?: string
          hero_title_highlight?: string
          id?: boolean
          site_name?: string
          site_tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          free_shipping_threshold: number
          id: boolean
          loyalty_earn_per_amount: number
          loyalty_enabled: boolean
          loyalty_points_per_earn: number
          loyalty_redeem_points: number
          loyalty_redeem_value: number
          payment_cod_enabled: boolean
          payment_etisalat_enabled: boolean
          payment_etisalat_number: string
          payment_instapay_enabled: boolean
          payment_instapay_handle: string
          payment_orange_enabled: boolean
          payment_orange_number: string
          payment_vodafone_enabled: boolean
          payment_vodafone_number: string
          shipping_cost: number
          updated_at: string
        }
        Insert: {
          free_shipping_threshold?: number
          id?: boolean
          loyalty_earn_per_amount?: number
          loyalty_enabled?: boolean
          loyalty_points_per_earn?: number
          loyalty_redeem_points?: number
          loyalty_redeem_value?: number
          payment_cod_enabled?: boolean
          payment_etisalat_enabled?: boolean
          payment_etisalat_number?: string
          payment_instapay_enabled?: boolean
          payment_instapay_handle?: string
          payment_orange_enabled?: boolean
          payment_orange_number?: string
          payment_vodafone_enabled?: boolean
          payment_vodafone_number?: string
          shipping_cost?: number
          updated_at?: string
        }
        Update: {
          free_shipping_threshold?: number
          id?: boolean
          loyalty_earn_per_amount?: number
          loyalty_enabled?: boolean
          loyalty_points_per_earn?: number
          loyalty_redeem_points?: number
          loyalty_redeem_value?: number
          payment_cod_enabled?: boolean
          payment_etisalat_enabled?: boolean
          payment_etisalat_number?: string
          payment_instapay_enabled?: boolean
          payment_instapay_handle?: string
          payment_orange_enabled?: boolean
          payment_orange_number?: string
          payment_vodafone_enabled?: boolean
          payment_vodafone_number?: string
          shipping_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_order_verification_status: {
        Args: { _order_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      place_order: {
        Args: {
          _address: string
          _coupon_code: string
          _customer_email?: string
          _customer_name: string
          _items: Json
          _notes: string
          _payment_method?: string
          _payment_reference?: string
          _phone: string
          _points_to_use?: number
        }
        Returns: string
      }
      verify_order_otp: {
        Args: { _code: string; _order_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      order_status:
        | "pending_verification"
        | "pending"
        | "confirmed"
        | "shipped"
        | "delivered"
        | "cancelled"
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
      app_role: ["admin", "user"],
      order_status: [
        "pending_verification",
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const

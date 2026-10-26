// Mismo formato que `npx supabase gen types typescript`. Regenerar si cambia supabase/migrations/.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'admin' | 'barbero' | 'cliente'
export type AppointmentStatus = 'confirmada' | 'completada' | 'no_presentado' | 'cancelada'

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          rol: UserRole
          nombre: string
          telefono: string
          email: string | null
          notas: string | null
          created_at: string
        }
        Insert: {
          id?: string
          rol?: UserRole
          nombre: string
          telefono: string
          email?: string | null
          notas?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          rol?: UserRole
          nombre?: string
          telefono?: string
          email?: string | null
          notas?: string | null
          created_at?: string
        }
        Relationships: []
      }
      barbers: {
        Row: {
          id: string
          nombre: string
          avatar_url: string | null
          especialidad: string | null
          activo: boolean
          created_at: string
          slug: string | null
          instagram: string | null
        }
        Insert: {
          id?: string
          nombre: string
          avatar_url?: string | null
          especialidad?: string | null
          activo?: boolean
          created_at?: string
          slug?: string | null
          instagram?: string | null
        }
        Update: {
          id?: string
          nombre?: string
          avatar_url?: string | null
          especialidad?: string | null
          activo?: boolean
          created_at?: string
          slug?: string | null
          instagram?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          id: string
          nombre: string
          duracion_min: number
          precio: number
          activo: boolean
          created_at: string
          orden: number | null
        }
        Insert: {
          id?: string
          nombre: string
          duracion_min: number
          precio: number
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          duracion_min?: number
          precio?: number
          activo?: boolean
          created_at?: string
          orden?: number | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          id: string
          barber_id: string
          client_id: string
          service_id: string
          start_time: string
          end_time: string
          status: AppointmentStatus
          recordatorios_enviados: number[]
          resena_enviada: boolean
          created_at: string
        }
        Insert: {
          id?: string
          barber_id: string
          client_id: string
          service_id: string
          start_time: string
          end_time: string
          status?: AppointmentStatus
          recordatorios_enviados?: number[]
          resena_enviada?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          barber_id?: string
          client_id?: string
          service_id?: string
          start_time?: string
          end_time?: string
          status?: AppointmentStatus
          recordatorios_enviados?: number[]
          resena_enviada?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'appointments_barber_id_fkey'
            columns: ['barber_id']
            isOneToOne: false
            referencedRelation: 'barbers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_service_id_fkey'
            columns: ['service_id']
            isOneToOne: false
            referencedRelation: 'services'
            referencedColumns: ['id']
          },
        ]
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      shop_settings: {
        Row: {
          id: number
          business_hours: Json | null
          hero_url: string | null
          logo_url: string | null
          google_review_url: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          business_hours?: Json | null
          hero_url?: string | null
          logo_url?: string | null
          google_review_url?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          business_hours?: Json | null
          hero_url?: string | null
          logo_url?: string | null
          google_review_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      time_off: {
        Row: {
          id: string
          barber_id: string | null
          start_time: string
          end_time: string
          motivo: string | null
          created_at: string
        }
        Insert: {
          id?: string
          barber_id?: string | null
          start_time: string
          end_time: string
          motivo?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          barber_id?: string | null
          start_time?: string
          end_time?: string
          motivo?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'time_off_barber_id_fkey'
            columns: ['barber_id']
            isOneToOne: false
            referencedRelation: 'barbers'
            referencedColumns: ['id']
          },
        ]
      }
      waitlist: {
        Row: { id: string; fecha: string; barber_id: string | null; service_id: string | null; nombre: string; telefono: string; created_at: string }
        Insert: { id?: string; fecha: string; barber_id?: string | null; service_id?: string | null; nombre: string; telefono: string; created_at?: string }
        Update: { id?: string; fecha?: string; barber_id?: string | null; service_id?: string | null; nombre?: string; telefono?: string; created_at?: string }
        Relationships: []
      }
      gallery_photos: {
        Row: { id: string; url: string; path: string; created_at: string; barber_id: string | null }
        Insert: { id?: string; url: string; path: string; created_at?: string; barber_id?: string | null }
        Update: { id?: string; url?: string; path?: string; created_at?: string; barber_id?: string | null }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      is_staff: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      book_appointment: {
        Args: {
          p_barber_id: string
          p_service_id: string
          p_start_time: string
          p_nombre: string
          p_telefono: string
        }
        Returns: string
      }
    }
    Enums: {
      user_role: UserRole
      appointment_status: AppointmentStatus
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database['public']
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']

export type Barber = Tables<'barbers'>
export type Service = Tables<'services'>
export type AppUser = Tables<'users'>
export type Appointment = Tables<'appointments'>
export type TimeOff = Tables<'time_off'>
export type GalleryPhoto = Tables<'gallery_photos'>
export type WaitlistEntry = Tables<'waitlist'>

// Cita con sus relaciones, tal como la pide el dashboard.
export type AppointmentWithRelations = Appointment & {
  barber: Pick<Barber, 'id' | 'nombre'> | null
  client: Pick<AppUser, 'id' | 'nombre' | 'telefono'> | null
  service: Pick<Service, 'id' | 'nombre' | 'duracion_min' | 'precio'> | null
}

import { supabase, supabaseAdmin } from './supabase'
import bcrypt from 'bcryptjs'

export interface User {
  id: string
  email: string
  name: string
  created_at: string
  whoop_connected: boolean
  isDemo?: boolean
}

export interface CreateUserData {
  email: string
  password: string
  name: string
}

export interface LoginData {
  email: string
  password: string
}

export class AuthService {
  // Instance method to get user by session token (for compatibility with new code)
  async getUser(sessionToken: string): Promise<User | null> {
    const { user } = await AuthService.getUserById(sessionToken);
    return user;
  }
  // Create a new user account
  static async createUser({ email, password, name }: CreateUserData): Promise<{ user: User | null; error: string | null }> {
    try {
      if (!supabaseAdmin) {
        return { user: null, error: 'Database not configured' }
      }

      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('email', email)
        .single()

      if (existingUser) {
        return { user: null, error: 'User with this email already exists' }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12)

      // Create user
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .insert({
          email,
          password_hash: hashedPassword,
          name,
          whoop_connected: false
        })
        .select('id, email, name, created_at, whoop_connected')
        .single()

      if (error) {
        console.error('Supabase error creating user:', error)
        return { user: null, error: error.message }
      }

      return { user, error: null }
    } catch (error) {
      console.error('Error creating user:', error)
      return { user: null, error: 'Failed to create user account' }
    }
  }

  // Login user
  static async loginUser({ email, password }: LoginData): Promise<{ user: User | null; error: string | null }> {
    try {
      if (!supabaseAdmin) {
        return { user: null, error: 'Database not configured' }
      }

      // Get user with password hash
      const { data: userData, error } = await supabaseAdmin
        .from('users')
        .select('id, email, name, created_at, whoop_connected, password_hash')
        .eq('email', email)
        .single()

      if (error || !userData) {
        return { user: null, error: 'Invalid email or password' }
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, userData.password_hash)
      if (!passwordMatch) {
        return { user: null, error: 'Invalid email or password' }
      }

      // Return user without password hash
      const { password_hash, ...user } = userData
      return { user, error: null }
    } catch (error) {
      console.error('Error logging in:', error)
      return { user: null, error: 'Login failed' }
    }
  }

  // Get user by ID
  static async getUserById(userId: string): Promise<{ user: User | null; error: string | null }> {
    try {
      if (!supabaseAdmin) {
        return { user: null, error: 'Database not configured' }
      }

      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('id, email, name, created_at, whoop_connected')
        .eq('id', userId)
        .single()

      if (error) {
        return { user: null, error: error.message }
      }

      return { user, error: null }
    } catch (error) {
      console.error('Error fetching user:', error)
      return { user: null, error: 'Failed to fetch user' }
    }
  }

  // Update user's Whoop connection status
  static async updateWhoopConnection(userId: string, connected: boolean): Promise<{ success: boolean; error: string | null }> {
    try {
      if (!supabaseAdmin) {
        return { success: false, error: 'Database not configured' }
      }

      const { error } = await supabaseAdmin
        .from('users')
        .update({ whoop_connected: connected })
        .eq('id', userId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Error updating Whoop connection:', error)
      return { success: false, error: 'Failed to update Whoop connection' }
    }
  }

  // Store Whoop tokens for user
  static async storeWhoopTokens(userId: string, accessToken: string, refreshToken?: string): Promise<{ success: boolean; error: string | null }> {
    try {
      if (!supabaseAdmin) {
        return { success: false, error: 'Database not configured' }
      }

      const tokenData = {
        user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Upsert (insert or update) tokens
      const { error } = await supabaseAdmin
        .from('whoop_tokens')
        .upsert(tokenData)

      if (error) {
        return { success: false, error: error.message }
      }

      // Update user's connection status
      await this.updateWhoopConnection(userId, true)

      return { success: true, error: null }
    } catch (error) {
      console.error('Error storing Whoop tokens:', error)
      return { success: false, error: 'Failed to store Whoop tokens' }
    }
  }

  // Get Whoop tokens for user
  static async getWhoopTokens(userId: string): Promise<{ accessToken: string | null; refreshToken: string | null; error: string | null }> {
    try {
      if (!supabaseAdmin) {
        return { accessToken: null, refreshToken: null, error: 'Database not configured' }
      }

      const { data: tokens, error } = await supabaseAdmin
        .from('whoop_tokens')
        .select('access_token, refresh_token')
        .eq('user_id', userId)
        .single()

      if (error) {
        return { accessToken: null, refreshToken: null, error: error.message }
      }

      return { 
        accessToken: tokens.access_token, 
        refreshToken: tokens.refresh_token, 
        error: null 
      }
    } catch (error) {
      console.error('Error fetching Whoop tokens:', error)
      return { accessToken: null, refreshToken: null, error: 'Failed to fetch Whoop tokens' }
    }
  }

  // Delete Whoop tokens (disconnect)
  static async deleteWhoopTokens(userId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      if (!supabaseAdmin) {
        return { success: false, error: 'Database not configured' }
      }

      const { error } = await supabaseAdmin
        .from('whoop_tokens')
        .delete()
        .eq('user_id', userId)

      if (error) {
        return { success: false, error: error.message }
      }

      // Update user's connection status
      await this.updateWhoopConnection(userId, false)

      return { success: true, error: null }
    } catch (error) {
      console.error('Error deleting Whoop tokens:', error)
      return { success: false, error: 'Failed to disconnect Whoop' }
    }
  }
}
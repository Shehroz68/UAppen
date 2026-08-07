import { createClient } from '@supabase/supabase-js';

// Supabase config - uses Expo's native EXPO_PUBLIC_ prefix
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate Supabase config
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration is missing! Please check your .env file.');
  console.error('Required variables: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simple response type (compatible with existing code)
export interface AuthResult {
  success: boolean;
  message: string;
  user?: any; // Supabase User type
}

// Sign up
export const signUp = async (email: string, password: string): Promise<AuthResult> => {
  try {
    // Validate email domain - only allow @umass.edu emails
    const emailDomain = email.toLowerCase().split('@')[1];
    if (emailDomain !== 'umass.edu') {
      return {
        success: false,
        message: 'Only UMass Amherst email addresses (@umass.edu) are allowed.',
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        message: error.message || 'Failed to create account',
      };
    }

    // Check if email confirmation is required
    if (data.user && !data.session) {
      return {
        success: true,
        message: 'Account created! Please check your email to confirm your account before signing in.',
        user: data.user,
      };
    }

    return {
      success: true,
      message: 'Account created successfully!',
      user: data.user,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to create account',
    };
  }
};

// Sign in
export const signIn = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Handle email not confirmed error
      if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
        return {
          success: false,
          message: 'Please check your email and confirm your account before signing in.',
        };
      }
      return {
        success: false,
        message: error.message || 'Failed to sign in',
      };
    }

    return {
      success: true,
      message: 'Signed in successfully!',
      user: data.user,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to sign in',
    };
  }
};

// Sign out
export const signOutUser = async (): Promise<AuthResult> => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        message: error.message || 'Failed to sign out',
      };
    }

    return {
      success: true,
      message: 'Signed out successfully',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to sign out',
    };
  }
};

// Reset password
export const resetPassword = async (email: string): Promise<AuthResult> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'uappen://reset-password', // Deep link for password reset
    });

    if (error) {
      return {
        success: false,
        message: error.message || 'Failed to send reset email',
      };
    }

    return {
      success: true,
      message: 'Password reset email sent!',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to send reset email',
    };
  }
};

// Resend confirmation email
export const resendConfirmationEmail = async (email: string): Promise<AuthResult> => {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      return {
        success: false,
        message: error.message || 'Failed to resend confirmation email',
      };
    }

    return {
      success: true,
      message: 'Confirmation email sent! Please check your inbox.',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to resend confirmation email',
    };
  }
};

// Get current user
export const getCurrentUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
};

// Export supabase client for advanced use cases
export { supabase };
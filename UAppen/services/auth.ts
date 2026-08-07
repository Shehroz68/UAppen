import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration is missing! Please check your .env file.');
  console.error('Required variables: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface AuthResult {
  success: boolean;
  message: string;
  user?: any;
}

export const signUp = async (email: string, password: string): Promise<AuthResult> => {
  try {
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

export const signIn = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
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

export const resetPassword = async (email: string): Promise<AuthResult> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'uappen://reset-password',
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

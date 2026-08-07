import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { resetPassword, signIn, signUp } from '../services/firebase';

type AuthMode = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    // Validate email domain - only allow @umass.edu emails (for sign up)
    if (mode === 'signup') {
      const emailDomain = email.toLowerCase().split('@')[1];
      if (emailDomain !== 'umass.edu') {
        setError('Only UMass Amherst email addresses (@umass.edu) are allowed.');
        return;
      }
    }

    // Password length validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (mode === 'signup') {
        const result = await signUp(email.trim(), password);
        if (result.success) {
          Alert.alert(
            'Account Created!',
            result.message || 'Please check your email to verify your account.',
            [
              {
                text: 'OK',
                onPress: () => {
                  setMode('signin');
                  setPassword('');
                },
              },
            ]
          );
        } else {
          setError(result.message || 'Failed to create account. Please try again.');
        }
      } else {
        const result = await signIn(email.trim(), password);
        if (result.success && result.user) {
          // Navigate to main app (tabs)
          router.replace('/(tabs)');
        } else {
          setError(result.message || 'Failed to sign in. Please try again.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail.trim()) {
      setError('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await resetPassword(resetEmail.trim());
      if (result.success) {
        Alert.alert(
          'Password Reset Email Sent',
          result.message || 'Please check your inbox for password reset instructions.',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowPasswordReset(false);
                setResetEmail('');
              },
            },
          ]
        );
      } else {
        setError(result.message || 'Failed to send password reset email.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError('');
    setPassword('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'signin'
                ? 'Sign in to continue'
                : 'Sign up to get started'}
            </Text>
          </View>

          {/* Password Reset Form */}
          {showPasswordReset ? (
            <View style={styles.form}>
              <Text style={styles.label}>Enter UMass Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#666"
                value={resetEmail}
                onChangeText={setResetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handlePasswordReset}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Email</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => {
                  setShowPasswordReset(false);
                  setResetEmail('');
                  setError('');
                }}
                disabled={loading}
              >
                <Text style={styles.linkText}>Back to {mode === 'signin' ? 'Sign In' : 'Sign Up'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Error Message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Form */}
              <View style={styles.form}>
                <Text style={styles.label}>Enter UMass Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#666"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#666"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError('');
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />

                {mode === 'signin' && (
                  <TouchableOpacity
                    style={styles.forgotPasswordButton}
                    onPress={() => {
                      setShowPasswordReset(true);
                      setError('');
                    }}
                    disabled={loading}
                  >
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleAuth}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {mode === 'signin' ? 'SIGN IN' : 'SIGN UP'}
                    </Text>
                  )}
                </TouchableOpacity>

                <View style={styles.toggleContainer}>
                  <Text style={styles.toggleText}>
                    {mode === 'signin'
                      ? "Don't have an account?"
                      : 'Already have an account?'}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      mode === 'signin' && styles.toggleButtonSignUp
                    ]}
                    onPress={toggleMode}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.toggleButtonText,
                      mode === 'signin' && styles.toggleButtonTextSignUp
                    ]}>
                      {mode === 'signin' ? 'SIGN UP' : 'SIGN IN'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  errorContainer: {
    backgroundColor: '#2A1A1A',
    borderWidth: 1,
    borderColor: '#891515',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#891515',
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#891515',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#891515',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 12,
  },
  toggleText: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: 'transparent',
    minWidth: 100,
  },
  toggleButtonSignUp: {
    backgroundColor: '#891515',
    borderColor: '#891515',
    shadowColor: '#891515',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  toggleButtonText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  toggleButtonTextSignUp: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  toggleLink: {
    color: '#891515',
    fontSize: 14,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#891515',
    fontSize: 14,
    fontWeight: '500',
  },
  backButton: {
    marginTop: 32,
    alignSelf: 'center',
  },
  backButtonText: {
    color: '#CCCCCC',
    fontSize: 14,
  },
});
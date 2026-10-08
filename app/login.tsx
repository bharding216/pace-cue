/**
 * Login screen — presented as a modal when the user taps an
 * authenticated feature (AI builder) without being signed in.
 *
 * Supports Apple Sign-In, Google Sign-In, and email OTP.
 * The app is fully functional without an account — this screen
 * only gates AI features.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../src/contexts/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../src/constants/theme';

type AuthMode = 'welcome' | 'email' | 'email-verify';

export default function LoginScreen() {
  const router = useRouter();
  const {
    signInWithApple,
    signInWithGoogle,
    signInWithOtp,
    verifyOtp,
    isAppleSignInAvailable,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('welcome');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAppleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithApple();
    setLoading(false);
    if (error) {
      Alert.alert('Sign In Failed', error.message);
    } else {
      router.back();
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);
    if (error) {
      Alert.alert('Sign In Failed', error.message);
    } else {
      router.back();
    }
  };

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    const { error } = await signInWithOtp(email.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setMode('email-verify');
    }
  };

  const handleVerifyCode = async () => {
    if (!otpCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code.');
      return;
    }
    setLoading(true);
    const { error } = await verifyOtp(email.trim(), otpCode.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Verification Failed', error.message);
    } else {
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Close button */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={28} color={Colors.textSecondary} />
        </TouchableOpacity>

        {/* Branding */}
        <View style={styles.brandContainer}>
          <Text style={styles.title}>PaceCue</Text>
          <Text style={styles.subtitle}>Create an account</Text>
          <Text style={styles.tagline}>
            Sign in to unlock AI workout building and cloud sync.
          </Text>
        </View>

        {/* ── Welcome Mode ──────────────────────────── */}
        {mode === 'welcome' && (
          <View style={styles.authButtons}>
            {isAppleSignInAvailable && (
              <TouchableOpacity
                style={[styles.socialButton, styles.appleButton]}
                onPress={handleAppleSignIn}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-apple" size={20} color="#000" />
                <Text style={styles.appleButtonText}>
                  Continue with Apple
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.socialButton, styles.googleButton]}
              onPress={handleGoogleSignIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-google" size={18} color={Colors.textPrimary} />
              <Text style={styles.googleButtonText}>
                Continue with Google
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, styles.emailButton]}
              onPress={() => setMode('email')}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Ionicons name="mail-outline" size={18} color={Colors.black} />
              <Text style={styles.emailButtonText}>
                Continue with Email
              </Text>
            </TouchableOpacity>

            {loading && (
              <ActivityIndicator
                color={Colors.primary}
                style={{ marginTop: Spacing.md }}
              />
            )}
          </View>
        )}

        {/* ── Email OTP Mode ────────────────────────── */}
        {mode === 'email' && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Enter your email</Text>
            <Text style={styles.formSubtitle}>
              We'll send you a sign-in code. No password needed.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              autoFocus
              placeholderTextColor={Colors.textMuted}
              returnKeyType="done"
              onSubmitEditing={handleSendCode}
            />

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSendCode}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.black} />
              ) : (
                <Text style={styles.primaryButtonText}>Send Code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode('welcome')}
              activeOpacity={0.6}
            >
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Email Verify Mode ─────────────────────── */}
        {mode === 'email-verify' && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Check your email</Text>
            <Text style={styles.formSubtitle}>
              Enter the 6-digit code sent to {email}
            </Text>

            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="000000"
              value={otpCode}
              onChangeText={(text) => {
                setOtpCode(text.replace(/[^0-9]/g, '').slice(0, 6));
              }}
              keyboardType="number-pad"
              autoFocus
              maxLength={6}
              placeholderTextColor={Colors.textMuted}
              returnKeyType="done"
              onSubmitEditing={handleVerifyCode}
            />

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleVerifyCode}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.black} />
              ) : (
                <Text style={styles.primaryButtonText}>Verify</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSendCode} activeOpacity={0.6}>
              <Text style={styles.resendText}>Resend code</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setOtpCode('');
                setMode('email');
              }}
              activeOpacity={0.6}
            >
              <Text style={styles.backText}>Change email</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footerText}>
          You can always use PaceCue without an account.{'\n'}
          Signing in unlocks AI features and cloud backup.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.xl,
    right: Spacing.lg,
    zIndex: 10,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl * 2,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  tagline: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  authButtons: {
    gap: Spacing.sm,
  },
  socialButton: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  appleButton: {
    backgroundColor: '#FFFFFF',
  },
  appleButtonText: {
    color: '#000000',
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
  },
  googleButtonText: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  emailButton: {
    backgroundColor: Colors.primary,
  },
  emailButtonText: {
    color: Colors.black,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  formContainer: {
    gap: Spacing.sm,
  },
  formTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  formSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  codeInput: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
    fontVariant: ['tabular-nums'],
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: Colors.black,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  resendText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  backText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  footerText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xl * 2,
    lineHeight: 18,
  },
});

import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useTranslation } from 'react-i18next';
import { signIn, signInWithApple } from '@/features/auth/services/authService';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert(t('auth.errorFieldsRequired'));
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      // useAuth in _layout.tsx will redirect to tabs
    } catch (err: any) {
      Alert.alert(t('auth.errorTitle'), t(mapAuthError(err?.message)));
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleSignIn() {
    setAppleLoading(true);
    try {
      await signInWithApple();
      // useAuth in _layout.tsx will redirect to tabs
    } catch (err: any) {
      // ERR_CANCELED = user dismissed the sheet — not an error
      if (err?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(t('auth.errorTitle'), t('auth.errorGeneric'));
      }
    } finally {
      setAppleLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>fridgy</Text>
            <Text style={styles.tagline}>{t('auth.tagline')}</Text>
          </View>

          {/* Apple Sign In — iOS only */}
          {Platform.OS === 'ios' && (
            <View style={styles.socialSection}>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={14}
                style={styles.appleBtn}
                onPress={handleAppleSignIn}
              />
              {appleLoading && (
                <ActivityIndicator style={styles.appleLoader} color="#111111" />
              )}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.orEmail')}</Text>
                <View style={styles.dividerLine} />
              </View>
            </View>
          )}

          {/* Email / Password form */}
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.email')}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="vous@example.com"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.password')}</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                textContentType="password"
              />
            </View>

            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>{t('auth.login')}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.noAccount')}</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.linkText}>{t('auth.register')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function mapAuthError(message?: string): string {
  if (!message) return 'auth.errorGeneric';
  if (message.includes('Invalid login credentials')) return 'auth.errorInvalidCredentials';
  if (message.includes('Email not confirmed')) return 'auth.errorEmailNotConfirmed';
  if (message.includes('rate limit')) return 'auth.errorRateLimit';
  return 'auth.errorGeneric';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F3F0' },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32, gap: 28 },
  logoContainer: { alignItems: 'center', gap: 8 },
  logo: { fontSize: 48, fontWeight: '800', color: '#FF8400', letterSpacing: -1 },
  tagline: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
  socialSection: { gap: 16 },
  appleBtn: { width: '100%', height: 52 },
  appleLoader: { position: 'absolute', alignSelf: 'center' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 13, color: '#9CA3AF' },
  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111111',
  },
  forgotBtn: { alignSelf: 'flex-end' },
  forgotText: { fontSize: 13, color: '#FF8400', fontWeight: '500' },
  primaryBtn: {
    backgroundColor: '#FF8400',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 'auto' },
  footerText: { fontSize: 14, color: '#6B7280' },
  linkText: { fontSize: 14, color: '#FF8400', fontWeight: '600' },
});

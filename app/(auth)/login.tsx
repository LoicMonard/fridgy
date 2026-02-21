import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import {
  configureGoogleSignIn,
  signIn,
  signInWithApple,
  signInWithGoogle,
} from '@/features/auth/services/authService';

const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    configureGoogleSignIn(IOS_CLIENT_ID, WEB_CLIENT_ID);
  }, []);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert(t('auth.errorFieldsRequired'));
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (err: any) {
      Alert.alert(t('auth.errorTitle'), t(mapAuthError(err?.message)));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err?.code !== 'SIGN_IN_CANCELLED') {
        console.error('[Google Sign In]', err?.code, err?.message);
        Alert.alert(t('auth.errorTitle'), t('auth.errorGeneric'));
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleAppleSignIn() {
    setAppleLoading(true);
    try {
      await signInWithApple();
    } catch (err: any) {
      if (err?.code !== 'ERR_REQUEST_CANCELED') {
        console.error('[Apple Sign In] code:', err?.code, '| message:', err?.message);
        Alert.alert(t('auth.errorTitle'), t('auth.errorGeneric'));
      }
    } finally {
      setAppleLoading(false);
    }
  }

  const showSocialSection = Platform.OS === 'ios' || Platform.OS === 'android';

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

          {/* Social buttons */}
          {showSocialSection && (
            <View style={styles.socialSection}>
              {/* Google — iOS + Android */}
              <TouchableOpacity
                style={[styles.googleBtn, googleLoading && styles.btnDisabled]}
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#374151" />
                ) : (
                  <>
                    <Image
                      source={{ uri: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' }}
                      style={styles.googleIcon}
                    />
                    <Text style={styles.googleBtnText}>{t('auth.continueWithGoogle')}</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Apple — iOS only */}
              {Platform.OS === 'ios' && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={14}
                  style={styles.appleBtn}
                  onPress={handleAppleSignIn}
                />
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
  socialSection: { gap: 12 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  googleIcon: { width: 20, height: 20 },
  googleBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  appleBtn: { width: '100%', height: 52 },
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

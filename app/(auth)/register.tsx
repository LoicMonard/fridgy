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
import { useTranslation } from 'react-i18next';
import { signUp } from '@/features/auth/services/authService';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!email.trim() || !password || !confirm) {
      Alert.alert(t('auth.errorFieldsRequired'));
      return;
    }
    if (password.length < 8) {
      Alert.alert(t('auth.errorTitle'), t('auth.errorPasswordTooShort'));
      return;
    }
    if (password !== confirm) {
      Alert.alert(t('auth.errorTitle'), t('auth.errorPasswordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim().toLowerCase(), password);
      Alert.alert(t('auth.registerSuccessTitle'), t('auth.registerSuccessMessage'), [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err: any) {
      const message = mapSignUpError(err?.message);
      Alert.alert(t('auth.errorTitle'), t(message));
    } finally {
      setLoading(false);
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{t('auth.createAccount')}</Text>
            <Text style={styles.subtitle}>{t('auth.createAccountSubtitle')}</Text>
          </View>

          {/* Form */}
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
                placeholder="8 caractères minimum"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                textContentType="newPassword"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
              <TextInput
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                textContentType="newPassword"
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>{t('auth.createAccount')}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.alreadyAccount')}</Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.linkText}>{t('auth.login')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function mapSignUpError(message?: string): string {
  if (!message) return 'auth.errorGeneric';
  if (message.includes('already registered') || message.includes('already been registered'))
    return 'auth.errorEmailTaken';
  if (message.includes('rate limit')) return 'auth.errorRateLimit';
  return 'auth.errorGeneric';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F3F0' },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, gap: 32 },
  header: { gap: 8 },
  backBtn: { marginBottom: 8 },
  backText: { fontSize: 32, color: '#111111', lineHeight: 36 },
  title: { fontSize: 28, fontWeight: '700', color: '#111111' },
  subtitle: { fontSize: 15, color: '#6B7280' },
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

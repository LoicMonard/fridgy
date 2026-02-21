import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { resetPassword } from '@/features/auth/services/authService';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!email.trim()) {
      Alert.alert(t('auth.errorFieldsRequired'));
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim().toLowerCase());
      setSent(true);
    } catch {
      Alert.alert(t('auth.errorTitle'), t('auth.errorGeneric'));
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
        <View style={styles.content}>
          {/* Header */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('auth.forgotPasswordTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.forgotPasswordSubtitle')}</Text>

          {sent ? (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>{t('auth.resetEmailSentTitle')}</Text>
              <Text style={styles.successMessage}>{t('auth.resetEmailSentMessage')}</Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.replace('/(auth)/login')}
              >
                <Text style={styles.primaryBtnText}>{t('auth.backToLogin')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
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

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleReset}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t('auth.sendResetEmail')}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F3F0' },
  flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 24, gap: 16 },
  backBtn: { marginBottom: 8 },
  backText: { fontSize: 32, color: '#111111', lineHeight: 36 },
  title: { fontSize: 28, fontWeight: '700', color: '#111111' },
  subtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22 },
  form: { gap: 16, marginTop: 8 },
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
  successBox: { gap: 12, marginTop: 16 },
  successTitle: { fontSize: 18, fontWeight: '700', color: '#111111' },
  successMessage: { fontSize: 15, color: '#6B7280', lineHeight: 22 },
});

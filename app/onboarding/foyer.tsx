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
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { createFoyer, joinFoyer } from '@/features/foyer/services/foyerService';

type Mode = 'choice' | 'create' | 'join';

export default function FoyerOnboardingScreen() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('choice');
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!nom.trim()) {
      Alert.alert(t('onboarding.errorNomRequired'));
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await createFoyer(nom, session.user.id);
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('[handleCreate]', err);
      Alert.alert(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!code.trim()) {
      Alert.alert(t('onboarding.errorCodeRequired'));
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await joinFoyer(code, session.user.id);
      router.replace('/(tabs)');
    } catch (err: any) {
      if (err?.message === 'FOYER_NOT_FOUND') {
        Alert.alert(t('onboarding.errorCodeInvalid'));
      } else if (err?.message === 'ALREADY_MEMBER') {
        router.replace('/(tabs)');
      } else {
        Alert.alert(t('common.error'));
      }
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
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.header}>
            {mode !== 'choice' && (
              <TouchableOpacity onPress={() => setMode('choice')} style={styles.backBtn}>
                <Text style={styles.backText}>‹</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.logo}>fridgy</Text>
            <Text style={styles.title}>
              {mode === 'choice' && t('onboarding.title')}
              {mode === 'create' && t('onboarding.createTitle')}
              {mode === 'join' && t('onboarding.joinTitle')}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'choice' && t('onboarding.subtitle')}
              {mode === 'create' && t('onboarding.createSubtitle')}
              {mode === 'join' && t('onboarding.joinSubtitle')}
            </Text>
          </View>

          {/* Choice */}
          {mode === 'choice' && (
            <View style={styles.choices}>
              <TouchableOpacity style={styles.choiceCard} onPress={() => setMode('create')}>
                <View style={[styles.choiceIcon, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="home-outline" size={28} color="#FF8400" />
                </View>
                <View style={styles.choiceText}>
                  <Text style={styles.choiceTitle}>{t('onboarding.createFoyer')}</Text>
                  <Text style={styles.choiceDesc}>{t('onboarding.createFoyerDesc')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.choiceCard} onPress={() => setMode('join')}>
                <View style={[styles.choiceIcon, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="people-outline" size={28} color="#1565C0" />
                </View>
                <View style={styles.choiceText}>
                  <Text style={styles.choiceTitle}>{t('onboarding.joinFoyer')}</Text>
                  <Text style={styles.choiceDesc}>{t('onboarding.joinFoyerDesc')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          )}

          {/* Create form */}
          {mode === 'create' && (
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>{t('onboarding.foyerName')}</Text>
                <TextInput
                  style={styles.input}
                  value={nom}
                  onChangeText={setNom}
                  placeholder={t('onboarding.foyerNamePlaceholder')}
                  placeholderTextColor="#9CA3AF"
                  autoFocus
                />
              </View>
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleCreate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t('onboarding.createBtn')}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Join form */}
          {mode === 'join' && (
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>{t('onboarding.inviteCode')}</Text>
                <TextInput
                  style={styles.input}
                  value={code}
                  onChangeText={setCode}
                  placeholder={t('onboarding.inviteCodePlaceholder')}
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              </View>
              <Text style={styles.codeHint}>{t('onboarding.inviteCodeHint')}</Text>
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleJoin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t('onboarding.joinBtn')}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F3F0' },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 40, gap: 32 },
  header: { gap: 10 },
  backBtn: { marginBottom: 4 },
  backText: { fontSize: 32, color: '#111111', lineHeight: 36 },
  logo: { fontSize: 32, fontWeight: '800', color: '#FF8400', letterSpacing: -1 },
  title: { fontSize: 26, fontWeight: '700', color: '#111111' },
  subtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22 },
  choices: { gap: 14 },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
  },
  choiceIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceText: { flex: 1 },
  choiceTitle: { fontSize: 16, fontWeight: '600', color: '#111111' },
  choiceDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
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
  codeHint: { fontSize: 13, color: '#9CA3AF', marginTop: -8 },
  primaryBtn: {
    backgroundColor: '#FF8400',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

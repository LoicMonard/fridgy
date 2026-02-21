import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from '@/lib/supabase';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export function configureGoogleSignIn(iosClientId: string, webClientId: string) {
  GoogleSignin.configure({ iosClientId, webClientId });
}

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices();
  const { data } = await GoogleSignin.signIn();

  if (!data?.idToken) {
    throw new Error('Google Sign In did not return an id token');
  }

  const { data: supabaseData, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: data.idToken,
  });

  if (error) throw error;
  return supabaseData.session;
}

export async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple Sign In did not return an identity token');
  }

  // Debug: decode JWT payload to inspect aud/iss claims
  if (__DEV__) {
    try {
      const payload = JSON.parse(
        Buffer.from(credential.identityToken.split('.')[1], 'base64').toString('utf8')
      );
      console.log('[Apple JWT] aud:', payload.aud, '| iss:', payload.iss, '| sub:', payload.sub);
    } catch {}
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });

  if (error) throw error;
  return data.session;
}

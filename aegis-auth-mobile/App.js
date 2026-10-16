import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';

// Ganti IP ini dengan IP laptop anda
const API_URL = 'http://10.81.112.21:5000/api';

export default function App() {
  // Mode State: 'LOGIN' | 'REGISTER' | 'FORGOT_OTP' | 'RESET_PASS'
  const [mode, setMode] = useState('LOGIN');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);

  // 1. Fungsi Log Masuk (AI Risk Check)
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Ralat Input', 'Sila masukkan e-mel dan kata laluan.');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/login`, { email, password });
      setLoading(false);
      setUserData(response.data);
      Alert.alert('Berjaya!', `Selamat datang, ${response.data.user.username}`);
    } catch (error) {
      setLoading(false);
      const errorMsg = error.response?.data?.error || 'Gagal menghubungi pelayan.';
      Alert.alert('Ralat Log Masuk', errorMsg);
    }
  };

  // 2. Fungsi Pendaftaran Akaun Baharu
  const handleRegister = async () => {
    if (!username || !email || !password) {
      Alert.alert('Ralat Input', 'Sila lengkapkan semua ruangan.');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/register`, { username, email, password });
      setLoading(false);
      Alert.alert('Pendaftaran Berjaya!', 'Akaun anda telah dicipta. Sila log masuk.', [
        {
          text: 'OK',
          onPress: () => {
            setMode('LOGIN');
            setPassword('');
          }
        }
      ]);
    } catch (error) {
      setLoading(false);
      const errorMsg = error.response?.data?.error || 'Gagal mendaftar akaun.';
      Alert.alert('Ralat Pendaftaran', errorMsg);
    }
  };

  // 3. Fungsi Mohon OTP (Lupa Kata Laluan + AI Risk Check)
  const handleRequestOTP = async () => {
    if (!email) {
      Alert.alert('Ralat Input', 'Sila masukkan e-mel anda.');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/forgot-password`, { email });
      setLoading(false);

      if (response.data.otpDemo) {
        setOtp(response.data.otpDemo);
      }

      Alert.alert(
        'AI Risk Evaluation Approved 🛡️',
        `Skor Risiko AI: ${response.data.riskScore}/100.\nKod OTP Demo: ${response.data.otpDemo}`,
        [{ text: 'Teruskan', onPress: () => setMode('RESET_PASS') }]
      );
    } catch (error) {
      setLoading(false);
      const errorMsg = error.response?.data?.error || 'Gagal meminta OTP.';
      Alert.alert('Ralat Keselamatan AI', errorMsg);
    }
  };

  // 4. Fungsi Kemaskini Kata Laluan Baharu (Reset Password)
  const handleResetPassword = async () => {
    if (!otp || !newPassword) {
      Alert.alert('Ralat Input', 'Sila masukkan kod OTP dan kata laluan baharu.');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/reset-password`, {
        email,
        otp,
        newPassword
      });
      setLoading(false);
      Alert.alert('Berjaya!', response.data.message, [
        {
          text: 'Log Masuk Sekarang',
          onPress: () => {
            setMode('LOGIN');
            setPassword('');
            setOtp('');
            setNewPassword('');
          }
        }
      ]);
    } catch (error) {
      setLoading(false);
      const errorMsg = error.response?.data?.error || 'Gagal mengemaskini kata laluan.';
      Alert.alert('Ralat Reset Password', errorMsg);
    }
  };

  // Paparan Dashboard (Selepas Log Masuk Berjaya)
  if (userData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>🛡️ AegisAuth Dashboard</Text>
          <Text style={styles.welcomeText}>
            Selamat Datang, <Text style={{ fontWeight: 'bold' }}>{userData.user.username}</Text>!
          </Text>
          <Text style={styles.emailText}>{userData.user.email}</Text>

          <View style={styles.riskBox}>
            <Text style={styles.riskTitle}>Analisis Risiko AI (Groq):</Text>
            <Text style={styles.riskScore}>
              Skor Risiko:{' '}
              <Text style={{ color: userData.riskAnalysis.score > 50 ? 'red' : 'green' }}>
                {userData.riskAnalysis.score}/100
              </Text>
            </Text>
            <Text style={styles.riskReason}>Sebab: {userData.riskAnalysis.reason}</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#e74c3c', marginTop: 20 }]}
            onPress={() => setUserData(null)}
          >
            <Text style={styles.buttonText}>Log Keluar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Paparan Utama Borang (Login / Register / Forgot / Reset)
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.innerContainer}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <View style={styles.card}>
            <Text style={styles.title}>🛡️ AegisAuth Mobile</Text>
            <Text style={styles.subtitle}>
              {mode === 'LOGIN' && 'Pengesahan Keselamatan AI'}
              {mode === 'REGISTER' && 'Daftar Akaun Baharu'}
              {mode === 'FORGOT_OTP' && 'Semakan AI Risk & Mohon OTP'}
              {mode === 'RESET_PASS' && 'Masukkan OTP & Kata Laluan Baharu'}
            </Text>

            {/* Field Username (Daftar Sahaja) */}
            {mode === 'REGISTER' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nama Pengguna</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: harold99"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
                
              </View>
            )}

            {/* Field E-mel */}
            {mode !== 'RESET_PASS' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>E-mel Pengguna</Text>
                <TextInput
                  style={styles.input}
                  placeholder="nama@gmail.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* Field Kata Laluan */}
            {(mode === 'LOGIN' || mode === 'REGISTER') && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Kata Laluan</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
      <Text style={{ fontSize: 18, padding: 5 }}>
        {showPassword ? '🙈' : '👁️'}
      </Text>
    </TouchableOpacity>
  </View>

            
            )}

            {/* Field OTP & Password Baharu */}
            {mode === 'RESET_PASS' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Kod OTP (6-Angka)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Contoh: 123456"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Kata Laluan Baharu</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                    <Text style={{ fontSize: 18, padding: 5 }}>
                      {showNewPassword ? '🙈' : '👁️'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Butang Utama */}
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                if (mode === 'LOGIN') handleLogin();
                if (mode === 'REGISTER') handleRegister();
                if (mode === 'FORGOT_OTP') handleRequestOTP();
                if (mode === 'RESET_PASS') handleResetPassword();
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {mode === 'LOGIN' && 'Log Masuk (AI Secure)'}
                  {mode === 'REGISTER' && 'Daftar Sekarang'}
                  {mode === 'FORGOT_OTP' && 'Semak AI & Hantar OTP'}
                  {mode === 'RESET_PASS' && 'Kemaskini Kata Laluan'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Navigasi / Tukar Mod */}
            <View style={{ marginTop: 16 }}>
              {mode === 'LOGIN' && (
                <>
                  <TouchableOpacity style={styles.toggleButton} onPress={() => setMode('FORGOT_OTP')}>
                    <Text style={styles.toggleText}>Lupa Kata Laluan?</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.toggleButton} onPress={() => setMode('REGISTER')}>
                    <Text style={styles.toggleText}>Belum ada akaun? Daftar Akaun Baru</Text>
                  </TouchableOpacity>
                </>
              )}

              {(mode === 'REGISTER' || mode === 'FORGOT_OTP' || mode === 'RESET_PASS') && (
                <TouchableOpacity style={styles.toggleButton} onPress={() => setMode('LOGIN')}>
                  <Text style={styles.toggleText}>← Kembali ke Log Masuk</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  innerContainer: { flex: 1, paddingHorizontal: 20 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 20, marginTop: 4 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#f8fafc'
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8
  },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  toggleButton: { marginTop: 10, alignItems: 'center' },
  toggleText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  welcomeText: { fontSize: 18, textAlign: 'center', marginTop: 10 },
  emailText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 20 },
  riskBox: {
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb'
  },
  riskTitle: { fontWeight: 'bold', marginBottom: 6 },
  riskScore: { fontSize: 15, fontWeight: 'bold' },
  riskReason: { fontSize: 13, color: '#475569', marginTop: 4 }
});
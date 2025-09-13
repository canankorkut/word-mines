import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {StackNavigationProp} from '@react-navigation/stack';
import {useNavigation} from '@react-navigation/native';
import {authenticate, getCurrentUser} from '../services/authService';
import {theme} from '../App';

type LoginScreenNavigationProp = StackNavigationProp<{
  Login: undefined;
  Register: undefined;
  MainMenu: {username: string; successRate: number};
}>;

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<LoginScreenNavigationProp>();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Hata', 'Kullanıcı adı ve şifre gereklidir');
      return;
    }

    setLoading(true);
    try {
      const success = await authenticate(username, password);

      if (success) {
        Alert.alert('Giriş başarılı!');
        const user = await getCurrentUser();
        navigation.navigate('MainMenu', {
          username: user.username,
          successRate: user.successRate,
        });
      } else {
        Alert.alert('Hata', 'Kullanıcı adı veya şifre hatalı');
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Giriş yapılırken bir hata oluştu');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <View style={styles.container}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}>
          <ScrollView
            contentContainerStyle={styles.scrollView}
            keyboardShouldPersistTaps="handled">
            <View style={styles.headerContainer}>
              <Text style={styles.title}>KELİME MAYINLARI</Text>
              <Text style={styles.subtitle}>Hesabınıza Giriş Yapın</Text>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Kullanıcı Adı</Text>
              <TextInput
                style={styles.input}
                placeholder="Kullanıcı adınızı girin"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Şifre</Text>
              <TextInput
                style={styles.input}
                placeholder="Şifrenizi girin"
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={[
                  styles.button,
                  {backgroundColor: theme.colors.blueLight},
                ]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Giriş Yap</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.registerButton}
                onPress={navigateToRegister}>
                <Text style={styles.registerButtonText}>
                  Hesabınız yok mu?{' '}
                  <Text
                    style={{fontWeight: 'bold', color: theme.colors.blueLight}}>
                    Kayıt Ol
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 Canan Korkut</Text>
        </View>
      </View>
    </View>
  );
};

const {width, height} = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 12, 48, 0.95)',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
  },
  keyboardAvoidingView: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  headerContainer: {
    marginTop: 20,
    marginBottom: 40,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 5,
  },
  subtitle: {
    fontSize: 18,
    color: '#E0E0E0',
    textAlign: 'center',
  },
  formContainer: {
    width: '85%',
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  inputLabel: {
    color: '#FFFFFF',
    marginBottom: 6,
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    height: 55,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    marginBottom: 20,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#FFFFFF',
    fontSize: 16,
  },
  button: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  registerButton: {
    marginTop: 25,
    alignItems: 'center',
    paddingVertical: 5,
  },
  registerButtonText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
  },
  footer: {
    paddingBottom: 20,
    paddingTop: 10,
    width: '100%',
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
});

export default LoginScreen;

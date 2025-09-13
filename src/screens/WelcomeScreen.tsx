import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import {StackNavigationProp} from '@react-navigation/stack';

type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  MainMenu: {username: string};
};

type WelcomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Welcome'
>;

type Props = {
  navigation: WelcomeScreenNavigationProp;
};

const WelcomeScreen: React.FC<Props> = ({navigation}) => {
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const colors = {
    purple: '#6C63FF',
    blueDark: '#0C0C30',
    blueLight: '#51DEF5',
    orange: '#F5994E',
    yellow: '#F1E9C3',
  };

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <ImageBackground
        source={require('../assets/images/background.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover">
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.headerContainer,
              {
                opacity: fadeAnim,
                transform: [{translateY: slideAnim}],
              },
            ]}>
            <Text style={styles.title}>KELİME MAYINLARI</Text>
            <Text style={styles.subtitle}>
              Kelimelerin Heyecan Verici Dünyasına Hoş Geldiniz!
            </Text>
          </Animated.View>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, {backgroundColor: colors.blueLight}]}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}>
              <Text style={styles.buttonText}>Giriş Yap</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, {backgroundColor: colors.orange}]}
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.8}>
              <Text style={styles.buttonText}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2025 Canan Korkut</Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

const {width, height} = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 12, 48, 0.85)',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: StatusBar.currentHeight || 40,
    paddingBottom: 20,
  },
  headerContainer: {
    marginTop: height * 0.15,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 36,
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
    marginHorizontal: 20,
    lineHeight: 24,
  },
  buttonsContainer: {
    width: '100%',
    paddingHorizontal: 40,
    marginBottom: height * 0.1,
  },
  button: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
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
  footer: {
    marginBottom: 20,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
});

export default WelcomeScreen;

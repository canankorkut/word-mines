import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StatusBar} from 'react-native';

import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import MainMenuScreen from './screens/MainMenuScreen';
import GameScreen from './screens/GameScreen';

export const theme = {
  colors: {
    primary: '#0C0C30',
    secondary: '#6C63FF',
    blueLight: '#51DEF5',
    orange: '#F5994E',
    yellow: '#F1E9C3',
    background: '#F0F4FF',
    success: '#4CAF50',
    danger: '#F44336',
    warning: '#FF9800',
    dark: '#263238',
    light: '#FFFFFF',
    text: '#333333',
    accent: '#FF5722',
  },
};

type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  MainMenu: {username: string; successRate?: number};
  Game: {gameId: string; timeLimit: string; opponent?: string};
};

const Stack = createStackNavigator<RootStackParamList>();

export interface User {
  uid: string;
  username: string;
  email: string;
  successRate: number;
}

const App = () => {
  return (
    <SafeAreaProvider>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Welcome"
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.colors.primary,
              elevation: 5,
              shadowOpacity: 0.3,
            },
            headerTintColor: theme.colors.light,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 20,
            },
            cardStyle: {backgroundColor: theme.colors.background},
          }}>
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              title: 'Giriş Yap',
              headerTransparent: true,
              headerTintColor: '#FFFFFF',
            }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{
              title: 'Kayıt Ol',
              headerTransparent: true,
              headerTintColor: '#FFFFFF',
            }}
          />
          <Stack.Screen
            name="MainMenu"
            component={MainMenuScreen}
            options={{
              title: 'Ana Menü',
              headerLeft: () => null,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="Game"
            component={GameScreen}
            options={({route}) => ({
              title: `Kelime Mayınları - ${route.params.timeLimit}`,
              headerBackTitle: 'Menü',
            })}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;

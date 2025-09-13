import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CURRENT_USER_KEY = 'kelime_mayinlari_current_user';

export const register = async (
  username: string,
  email: string,
  password: string,
): Promise<boolean> => {
  try {
    const usernameQuery = await firestore()
      .collection('users')
      .where('username', '==', username)
      .get();

    if (!usernameQuery.empty) {
      throw new Error('Bu kullanıcı adı zaten kullanılıyor');
    }

    const userCredential = await auth().createUserWithEmailAndPassword(
      email,
      password,
    );
    const user = userCredential.user;

    if (user) {
      await firestore().collection('users').doc(user.uid).set({
        username,
        email,
        successRate: 0,
        totalGames: 0,
        wonGames: 0,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      await AsyncStorage.setItem(
        CURRENT_USER_KEY,
        JSON.stringify({
          uid: user.uid,
          username,
          email,
        }),
      );

      return true;
    }
    return false;
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
};

export const authenticate = async (
  usernameOrEmail: string,
  password: string,
): Promise<boolean> => {
  try {
    let email = usernameOrEmail;

    if (!usernameOrEmail.includes('@')) {
      const usersQuery = await firestore()
        .collection('users')
        .where('username', '==', usernameOrEmail)
        .get();

      if (usersQuery.empty) {
        throw new Error('Kullanıcı bulunamadı');
      }

      email = usersQuery.docs[0].data().email;
    }

    const userCredential = await auth().signInWithEmailAndPassword(
      email,
      password,
    );
    const user = userCredential.user;

    if (user) {
      const userDoc = await firestore().collection('users').doc(user.uid).get();
      const userData = userDoc.data();

      if (userData) {
        await AsyncStorage.setItem(
          CURRENT_USER_KEY,
          JSON.stringify({
            uid: user.uid,
            username: userData.username,
            email: userData.email,
            successRate: userData.successRate,
          }),
        );

        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error authenticating user:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const userJson = await AsyncStorage.getItem(CURRENT_USER_KEY);
    if (userJson) {
      const userData = JSON.parse(userJson);

      if (
        userData &&
        userData.uid &&
        (userData.successRate === undefined || userData.successRate === null)
      ) {
        try {
          const userDoc = await firestore()
            .collection('users')
            .doc(userData.uid)
            .get();
          const firestoreData = userDoc.data();

          if (firestoreData) {
            const updatedUserData = {
              ...userData,
              successRate: firestoreData.successRate || 0,
            };

            await AsyncStorage.setItem(
              CURRENT_USER_KEY,
              JSON.stringify(updatedUserData),
            );
            return updatedUserData;
          }
        } catch (firestoreError) {
          console.error(
            'Error fetching user data from Firestore:',
            firestoreError,
          );
        }
      }

      return userData;
    }
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const logout = async (): Promise<void> => {
  try {
    await auth().signOut();
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
};

export const updateUserStats = async (
  userId: string,
  won: boolean,
): Promise<void> => {
  try {
    const userRef = firestore().collection('users').doc(userId);

    await firestore().runTransaction(async transaction => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error('Kullanıcı bulunamadı');
      }

      const userData = userDoc.data() || {};
      const totalGames = (userData.totalGames || 0) + 1;
      const wonGames = won
        ? (userData.wonGames || 0) + 1
        : userData.wonGames || 0;
      const successRate = totalGames > 0 ? (wonGames / totalGames) * 100 : 0;

      transaction.update(userRef, {
        totalGames,
        wonGames,
        successRate,
      });
    });
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
};

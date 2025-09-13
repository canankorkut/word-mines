import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import {StackNavigationProp} from '@react-navigation/stack';
import {useNavigation, RouteProp, useRoute} from '@react-navigation/native';
import {getCurrentUser, logout} from '../services/authService';
import {
  getActiveGames,
  getCompletedGames,
  createGame,
} from '../services/gameService';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const theme = {
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

type MainMenuScreenNavigationProp = StackNavigationProp<{
  Login: undefined;
  MainMenu: {username: string; successRate: number};
  Game: {gameId: string; timeLimit: string; opponent?: string};
}>;

type MainMenuScreenRouteProp = RouteProp<
  {
    params: {username: string; successRate?: number};
  },
  'params'
>;

type GameItem = {
  id: string;
  opponentName: string;
  playerScore: number;
  opponentScore: number;
  isPlayerTurn: boolean;
  timeLimit: string;
  lastMoveTime: Date | null;
  status: string;
};

type CompletedGameItem = {
  id: string;
  opponentName: string;
  playerScore: number;
  opponentScore: number;
  playerWon: boolean;
  endedAt: Date;
  status: string;
};

const MainMenuScreen = () => {
  const navigation = useNavigation<MainMenuScreenNavigationProp>();
  const route = useRoute<MainMenuScreenRouteProp>();

  const [username, setUsername] = useState<string>(
    route.params?.username || '',
  );
  const [successRate, setSuccessRate] = useState<number>(
    route.params?.successRate || 0,
  );
  const [activeGames, setActiveGames] = useState<GameItem[]>([]);
  const [completedGames, setCompletedGames] = useState<CompletedGameItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'new' | 'active' | 'completed'>(
    'new',
  );
  const [showNewGameModal, setShowNewGameModal] = useState<boolean>(false);
  const [joiningGame, setJoiningGame] = useState<boolean>(false);

  useEffect(() => {
    loadUserData();
    loadGames();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setUsername(user.username);
        setSuccessRate(user.successRate || 0);
      } else {
        navigation.navigate('Login');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadGames = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (user && user.uid) {
        try {
          const active = await getActiveGames(user.uid);
          setActiveGames(active || []);
        } catch (activeError) {
          console.error('Error loading active games:', activeError);
          setActiveGames([]);
        }

        try {
          const completed = await getCompletedGames(user.uid);
          setCompletedGames(completed || []);
        } catch (completedError) {
          console.error('Error loading completed games:', completedError);
          setCompletedGames([]);
        }
      }
    } catch (error) {
      console.error('General error in loadGames:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigation.navigate('Login');
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu');
    }
  };

  const handleCreateGame = async (timeLimit: string) => {
    setJoiningGame(true);
    try {
      const user = await getCurrentUser();
      if (user && user.uid) {
        const gameId = await createGame(user.uid, timeLimit);
        setShowNewGameModal(false);

        if (gameId) {
          navigation.navigate('Game', {
            gameId,
            timeLimit,
          });
        } else {
          Alert.alert(
            'Oyun Bekleniyor',
            'Aynı zaman limitini seçen bir rakip bulunana kadar bekleniyor. Farklı bir limitli oyun açmak için ana menüye dönebilirsiniz.',
          );
        }
      }
    } catch (error) {
      console.error('Error creating game:', error);
      Alert.alert('Hata', 'Oyun oluşturulurken bir hata oluştu');
    } finally {
      setJoiningGame(false);
    }
  };

  const handleJoinGame = async (game: GameItem) => {
    try {
      navigation.navigate('Game', {
        gameId: game.id,
        timeLimit: game.timeLimit,
        opponent: game.opponentName,
      });
    } catch (error) {
      console.error('Error joining game:', error);
      Alert.alert('Hata', 'Oyuna katılırken bir hata oluştu');
    }
  };

  const renderNewGameOptions = () => (
    <View style={styles.newGameContainer}>
      <Text style={styles.sectionTitle}>Yeni Oyun Başlat</Text>
      <Text style={styles.sectionDescription}>
        Oynamak istediğiniz süreyi seçin ve rakip bulunana kadar bekleyin
      </Text>

      <View style={styles.gameTypesContainer}>
        <View style={styles.gameTypeSection}>
          <Text style={styles.gameTypeTitle}>Hızlı Oyun</Text>
          <View style={styles.timeOptionsContainer}>
            <TouchableOpacity
              style={styles.timeOption}
              onPress={() => handleCreateGame('2-dakika')}
              disabled={joiningGame}>
              <Icon
                name="timer-outline"
                size={28}
                color={theme.colors.blueLight}
              />
              <Text style={styles.timeOptionTitle}>2 Dakika</Text>
              <Text style={styles.timeOptionDescription}>
                Hamle başına 2 dakika süre
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.timeOption}
              onPress={() => handleCreateGame('5-dakika')}
              disabled={joiningGame}>
              <Icon
                name="timer-outline"
                size={28}
                color={theme.colors.blueLight}
              />
              <Text style={styles.timeOptionTitle}>5 Dakika</Text>
              <Text style={styles.timeOptionDescription}>
                Hamle başına 5 dakika süre
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.gameTypeSection}>
          <Text style={styles.gameTypeTitle}>Genişletilmiş Oyun</Text>
          <View style={styles.timeOptionsContainer}>
            <TouchableOpacity
              style={styles.timeOption}
              onPress={() => handleCreateGame('12-saat')}
              disabled={joiningGame}>
              <Icon
                name="calendar-clock"
                size={28}
                color={theme.colors.orange}
              />
              <Text style={styles.timeOptionTitle}>12 Saat</Text>
              <Text style={styles.timeOptionDescription}>
                Hamle başına 12 saat süre
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.timeOption}
              onPress={() => handleCreateGame('24-saat')}
              disabled={joiningGame}>
              <Icon
                name="calendar-clock"
                size={28}
                color={theme.colors.orange}
              />
              <Text style={styles.timeOptionTitle}>24 Saat</Text>
              <Text style={styles.timeOptionDescription}>
                Hamle başına 24 saat süre
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {joiningGame && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.secondary} />
          <Text style={styles.loadingText}>
            Oyun oluşturuluyor, lütfen bekleyin...
          </Text>
        </View>
      )}
    </View>
  );

  const renderActiveGames = () => (
    <View style={styles.gamesContainer}>
      <Text style={styles.sectionTitle}>Aktif Oyunlar</Text>
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.secondary} />
      ) : activeGames.length === 0 ? (
        <Text style={styles.emptyStateText}>
          Henüz aktif oyununuz bulunmamaktadır
        </Text>
      ) : (
        <FlatList
          data={activeGames}
          keyExtractor={item => item.id}
          renderItem={({item}) => (
            <TouchableOpacity
              style={styles.gameCard}
              onPress={() => handleJoinGame(item)}>
              <View style={styles.gameCardHeader}>
                <Text style={styles.opponentName}>{item.opponentName}</Text>
                <View
                  style={[
                    styles.turnIndicator,
                    {
                      backgroundColor: item.isPlayerTurn
                        ? theme.colors.success
                        : theme.colors.blueLight,
                    },
                  ]}>
                  <Text style={styles.turnIndicatorText}>
                    {item.isPlayerTurn ? 'Sıra Sizde' : 'Rakip Oynuyor'}
                  </Text>
                </View>
              </View>

              <View style={styles.scoreContainer}>
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>Sizin Puanınız</Text>
                  <Text style={styles.scoreValue}>{item.playerScore}</Text>
                </View>
                <View style={styles.scoreDivider} />
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>Rakip Puanı</Text>
                  <Text style={styles.scoreValue}>{item.opponentScore}</Text>
                </View>
              </View>

              <View style={styles.gameCardFooter}>
                <Icon
                  name="clock-outline"
                  size={16}
                  color={theme.colors.secondary}
                />
                <Text style={styles.timeLimit}>
                  {formatTimeLimit(item.timeLimit)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.gamesList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  const renderCompletedGames = () => (
    <View style={styles.gamesContainer}>
      <Text style={styles.sectionTitle}>Tamamlanan Oyunlar</Text>
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.secondary} />
      ) : completedGames.length === 0 ? (
        <Text style={styles.emptyStateText}>
          Henüz tamamlanan oyununuz bulunmamaktadır
        </Text>
      ) : (
        <FlatList
          data={completedGames}
          keyExtractor={item => item.id}
          renderItem={({item}) => (
            <View style={styles.gameCard}>
              <View style={styles.gameCardHeader}>
                <Text style={styles.opponentName}>{item.opponentName}</Text>
                <View
                  style={[
                    styles.resultIndicator,
                    {
                      backgroundColor: item.playerWon
                        ? theme.colors.success
                        : theme.colors.danger,
                    },
                  ]}>
                  <Text style={styles.resultIndicatorText}>
                    {item.playerWon ? 'Kazandınız' : 'Kaybettiniz'}
                  </Text>
                </View>
              </View>

              <View style={styles.scoreContainer}>
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>Sizin Puanınız</Text>
                  <Text
                    style={[
                      styles.scoreValue,
                      item.playerWon ? styles.winnerScore : {},
                    ]}>
                    {item.playerScore}
                  </Text>
                </View>
                <View style={styles.scoreDivider} />
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>Rakip Puanı</Text>
                  <Text
                    style={[
                      styles.scoreValue,
                      !item.playerWon ? styles.winnerScore : {},
                    ]}>
                    {item.opponentScore}
                  </Text>
                </View>
              </View>

              <View style={styles.gameCardFooter}>
                <Icon name="calendar" size={16} color={theme.colors.dark} />
                <Text style={styles.completedDate}>
                  {new Date(item.endedAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}
          contentContainerStyle={styles.gamesList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  const formatTimeLimit = (timeLimit: string): string => {
    switch (timeLimit) {
      case '2-dakika':
        return '2 Dakika';
      case '5-dakika':
        return '5 Dakika';
      case '12-saat':
        return '12 Saat';
      case '24-saat':
        return '24 Saat';
      default:
        return timeLimit;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Kullanıcı Bilgileri Header */}
      <View style={styles.userInfoContainer}>
        <View style={styles.userInfo}>
          <Text style={styles.welcomeText}>Hoş Geldin,</Text>
          <Text style={styles.username}>{username}</Text>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.successRateLabel}>Başarı Oranı</Text>
          <View style={styles.successRateContainer}>
            <Text style={styles.successRateValue}>
              %{successRate.toFixed(0)}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="logout" size={22} color={theme.colors.light} />
        </TouchableOpacity>
      </View>

      {/* Ana Menü Sekmeleri */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'new' && styles.activeTab]}
          onPress={() => setActiveTab('new')}>
          <Icon
            name="plus-circle-outline"
            size={22}
            color={
              activeTab === 'new' ? theme.colors.blueLight : theme.colors.light
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'new' && styles.activeTabText,
            ]}>
            Yeni Oyun
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}>
          <Icon
            name="play-circle-outline"
            size={22}
            color={
              activeTab === 'active'
                ? theme.colors.blueLight
                : theme.colors.light
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'active' && styles.activeTabText,
            ]}>
            Aktif Oyunlar
          </Text>
          {activeGames.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeGames.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}>
          <Icon
            name="history"
            size={22}
            color={
              activeTab === 'completed'
                ? theme.colors.blueLight
                : theme.colors.light
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'completed' && styles.activeTabText,
            ]}>
            Oyun Geçmişi
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab İçerikleri */}
      <View style={styles.contentContainer}>
        {activeTab === 'new' && renderNewGameOptions()}
        {activeTab === 'active' && renderActiveGames()}
        {activeTab === 'completed' && renderCompletedGames()}
      </View>
    </SafeAreaView>
  );
};

const {width, height} = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  userInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.light,
  },
  statsContainer: {
    alignItems: 'center',
    marginRight: 10,
  },
  successRateLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 2,
  },
  successRateContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  successRateValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.blueLight,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.blueLight,
  },
  tabText: {
    fontSize: 14,
    color: theme.colors.light,
    marginLeft: 6,
  },
  activeTabText: {
    color: theme.colors.blueLight,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 15,
    backgroundColor: theme.colors.orange,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: theme.colors.light,
    fontSize: 12,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  newGameContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.light,
    marginBottom: 10,
  },
  sectionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 24,
  },
  gameTypesContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  gameTypeSection: {
    marginBottom: 24,
  },
  gameTypeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.yellow,
    marginBottom: 12,
  },
  timeOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeOption: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  timeOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.light,
    marginTop: 10,
    marginBottom: 6,
  },
  timeOptionDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.light,
    fontSize: 16,
  },
  gamesContainer: {
    flex: 1,
  },
  gamesList: {
    paddingBottom: 20,
  },
  emptyStateText: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginTop: 40,
  },
  gameCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  gameCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  opponentName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.light,
  },
  turnIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  turnIndicatorText: {
    color: theme.colors.light,
    fontSize: 12,
    fontWeight: '600',
  },
  resultIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resultIndicatorText: {
    color: theme.colors.light,
    fontSize: 12,
    fontWeight: '600',
  },
  scoreContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  scoreItem: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
  },
  scoreDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  scoreLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.light,
  },
  winnerScore: {
    color: theme.colors.blueLight,
  },
  gameCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLimit: {
    marginLeft: 6,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  completedDate: {
    marginLeft: 6,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
});

export default MainMenuScreen;

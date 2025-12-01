import { Inter_400Regular, Inter_500Medium, Inter_700Bold, Inter_900Black, useFonts } from '@expo-google-fonts/inter';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

// --- FIREBASE ---
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from './firebaseConfig';

// --- IMPORTS ---
import { getWordDeck } from './gameLogic';
import GameScreen from './GameScreen';
import ResultsScreen from './ResultsScreen';

SplashScreen.preventAutoHideAsync();

const CATEGORIES = ['Movies', 'Celebrities', 'Animals', 'Random Words', 'Science', 'History'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const TIMES = [60, 90, 120];

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    isTouchMode: false,
    soundEnabled: true,
    duration: 60
  });

  // Game Settings
  const [selectedCategory, setSelectedCategory] = useState('Movies');
  const [selectedDifficulty, setSelectedDifficulty] = useState('Easy');

  // Game Flow
  const [gameState, setGameState] = useState('MENU');
  const [gameDeck, setGameDeck] = useState([]);
  const [deckLoading, setDeckLoading] = useState(false);
  const [lastResults, setLastResults] = useState(null);

  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_700Bold, Inter_900Black });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    signInAnonymously(auth).catch(console.error);
    return unsubscribe;
  }, []);

  if (!fontsLoaded) return null;

  const handleStartGame = async () => {
    if (!user) { Alert.alert("Error", "Not connected."); return; }
    
    setDeckLoading(true);
    try {
      const words = await getWordDeck(user.uid, selectedCategory, selectedDifficulty);
      setGameDeck(words);
      setGameState('PLAYING');
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setDeckLoading(false);
    }
  };

  const handleGameEnd = (results) => {
    setLastResults(results);
    setGameState('RESULTS');
  };

  const handleHome = () => setGameState('MENU');
  const handlePlayAgain = () => handleStartGame();

  // --- RENDER ---
  if (gameState === 'PLAYING') {
    return <GameScreen deck={gameDeck} onEndGame={handleGameEnd} settings={{...settings, duration: settings.duration}} />;
  }

  if (gameState === 'RESULTS' && lastResults) {
    return <ResultsScreen 
      score={lastResults.score} 
      correctWords={lastResults.correctWords} 
      skippedWords={lastResults.skippedWords} 
      onHome={handleHome} 
      onPlayAgain={handlePlayAgain} 
    />;
  }

  // --- MENU RENDER ---
  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      <StatusBar style="light" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.spacer} />
        <View style={styles.titleContainer}>
            <Text style={styles.title}>HEADS UP</Text>
            <Text style={styles.subtitle}>AI Powered Edition</Text>
        </View>
        <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.settingsIcon}>
            <Ionicons name="settings-sharp" size={28} color="#22d3ee" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? <ActivityIndicator size="large" color="#22d3ee" style={styles.loader} /> : (
            <View style={styles.menuContainer}>
                
                {/* LAST SCORE */}
                {lastResults && (
                    <View style={styles.lastScoreContainer}>
                        <Text style={styles.lastScoreLabel}>LAST RUN</Text>
                        <Text style={styles.lastScoreValue}>{lastResults.score} Pts</Text>
                    </View>
                )}

                {/* Category */}
                <View>
                    <Text style={styles.sectionTitle}>Category</Text>
                    <View style={styles.wrapContainer}>
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity 
                                key={cat} 
                                onPress={() => setSelectedCategory(cat)} 
                                style={[styles.optionBtn, selectedCategory === cat ? styles.optionBtnActive : styles.optionBtnInactive]}
                            >
                                <Text style={[styles.optionText, selectedCategory === cat ? styles.optionTextActive : styles.optionTextInactive]}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Difficulty */}
                <View>
                    <Text style={styles.sectionTitle}>Difficulty</Text>
                    <View style={styles.rowContainer}>
                        {DIFFICULTIES.map((diff) => (
                            <TouchableOpacity 
                                key={diff} 
                                onPress={() => setSelectedDifficulty(diff)} 
                                style={[styles.optionBtn, styles.flex1, selectedDifficulty === diff ? styles.optionBtnActive : styles.optionBtnInactive]}
                            >
                                <Text style={[styles.optionText, selectedDifficulty === diff ? styles.optionTextActive : styles.optionTextInactive]}>
                                    {diff}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Time */}
                <View>
                    <Text style={styles.sectionTitle}>Time</Text>
                    <View style={styles.rowContainer}>
                        {TIMES.map((t) => (
                            <TouchableOpacity 
                                key={t} 
                                onPress={() => setSettings(s => ({...s, duration: t}))} 
                                style={[styles.optionBtn, styles.flex1, settings.duration === t ? styles.optionBtnActive : styles.optionBtnInactive]}
                            >
                                <Text style={[styles.optionText, settings.duration === t ? styles.optionTextActive : styles.optionTextInactive]}>
                                    {t}s
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <TouchableOpacity 
                    onPress={handleStartGame} 
                    disabled={deckLoading} 
                    style={[styles.startBtn, deckLoading && styles.startBtnDisabled]}
                >
                    {deckLoading ? (
                        <View style={styles.rowCentered}>
                            <ActivityIndicator color="#111827" />
                            <Text style={styles.startBtnText}> Loading Deck...</Text>
                        </View>
                    ) : (
                        <Text style={styles.startBtnText}>START GAME</Text>
                    )}
                </TouchableOpacity>
            </View>
        )}
      </ScrollView>

      {/* SETTINGS MODAL */}
      <Modal animationType="slide" transparent={true} visible={showSettings} onRequestClose={() => setShowSettings(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>SETTINGS</Text>
                    <TouchableOpacity onPress={() => setShowSettings(false)}>
                        <Ionicons name="close-circle" size={32} color="#9ca3af" />
                    </TouchableOpacity>
                </View>

                {/* Control Mode */}
                <View style={styles.settingRow}>
                    <View>
                        <Text style={styles.settingLabel}>Touch Mode</Text>
                        <Text style={styles.settingSub}>Use screen tap instead of tilt</Text>
                    </View>
                    <Switch 
                        value={settings.isTouchMode} 
                        onValueChange={(val) => setSettings(s => ({...s, isTouchMode: val}))}
                        trackColor={{false: '#374151', true: '#06b6d4'}}
                        thumbColor={'#f9fafb'}
                    />
                </View>

                {/* Sound */}
                <View style={styles.settingRow}>
                    <View>
                        <Text style={styles.settingLabel}>Sound</Text>
                        <Text style={styles.settingSub}>Enable game audio effects</Text>
                    </View>
                    <Switch 
                        value={settings.soundEnabled} 
                        onValueChange={(val) => setSettings(s => ({...s, soundEnabled: val}))}
                        trackColor={{false: '#374151', true: '#22c55e'}}
                        thumbColor={'#f9fafb'}
                    />
                </View>
            </View>
        </View>
      </Modal>
    </View>
  );
}

// --- STYLESHEET ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 24, paddingTop: 60 },
  spacer: { width: 32 },
  titleContainer: { alignItems: 'center' },
  title: { fontFamily: 'Inter_900Black', color: '#22d3ee', fontSize: 40, letterSpacing: -2 },
  subtitle: { fontFamily: 'Inter_500Medium', color: '#6b7280', fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', marginTop: 8 },
  settingsIcon: { paddingTop: 8 },
  
  scrollContent: { padding: 24, paddingBottom: 40 },
  loader: { marginTop: 80 },
  menuContainer: { gap: 24 },
  
  lastScoreContainer: { backgroundColor: '#1f2937', borderWidth: 1, borderColor: '#374151', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastScoreLabel: { color: '#9ca3af', fontFamily: 'Inter_700Bold', fontSize: 12 },
  lastScoreValue: { color: '#4ade80', fontFamily: 'Inter_900Black', fontSize: 24 },

  sectionTitle: { fontFamily: 'Inter_700Bold', color: '#a5f3fc', marginBottom: 12, fontSize: 14, textTransform: 'uppercase' },
  wrapContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowContainer: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
  
  optionBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  optionBtnActive: { backgroundColor: 'rgba(6, 182, 212, 0.2)', borderColor: '#06b6d4' },
  optionBtnInactive: { backgroundColor: '#1f2937', borderColor: '#374151' },
  
  optionText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  optionTextActive: { color: '#22d3ee', fontFamily: 'Inter_700Bold' },
  optionTextInactive: { color: '#9ca3af' },

  startBtn: { width: '100%', paddingVertical: 20, borderRadius: 12, marginTop: 16, alignItems: 'center', backgroundColor: '#06b6d4', shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  startBtnDisabled: { backgroundColor: '#374151' },
  startBtnText: { fontFamily: 'Inter_900Black', color: '#111827', fontSize: 20, textTransform: 'uppercase', letterSpacing: 1 },
  rowCentered: { flexDirection: 'row', alignItems: 'center' },

  // Modal Styles
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#1f2937', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderTopColor: '#374151' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: 'white', fontSize: 24, fontFamily: 'Inter_900Black' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, backgroundColor: 'rgba(17, 24, 39, 0.5)', padding: 16, borderRadius: 12 },
  settingLabel: { color: 'white', fontSize: 18, fontFamily: 'Inter_700Bold' },
  settingSub: { color: '#9ca3af', fontSize: 12, marginTop: 2 }
});
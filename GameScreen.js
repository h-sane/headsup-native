import { Audio } from 'expo-av';
import { useKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Accelerometer } from 'expo-sensors';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function GameScreen({ deck, onEndGame, settings }) {
  const { isTouchMode, soundEnabled, duration } = settings;

  // State
  const [gameState, setGameState] = useState('COUNTDOWN');
  const [countdown, setCountdown] = useState(3);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [bgColor, setBgColor] = useState('#111827');
  const [inputLocked, setInputLocked] = useState(false); 
  
  // --- NEW: Audio Loading State ---
  const [audioLoaded, setAudioLoaded] = useState(false);

  // Data Refs
  const correctWords = useRef([]);
  const skippedWords = useRef([]);
  const scoreRef = useRef(0);
  const timerRef = useRef(null);
  const sensorSubscription = useRef(null);
  
  // Audio Refs
  const soundCorrect = useRef(new Audio.Sound());
  const soundSkip = useRef(new Audio.Sound());
  const soundTick = useRef(new Audio.Sound());
  const soundBeep = useRef(new Audio.Sound());

  useKeepAwake();

  // 0. Load Sounds (The Fix: Set audioLoaded = true when done)
  useEffect(() => {
    async function load() {
      try {
        await soundCorrect.current.loadAsync(require('./assets/sounds/correct.mp3'));
        await soundSkip.current.loadAsync(require('./assets/sounds/skip.mp3'));
        await soundBeep.current.loadAsync(require('./assets/sounds/beep.mp3'));
        await soundTick.current.loadAsync(require('./assets/sounds/tick.mp3'));
        
        // Signal that we are ready to start
        setAudioLoaded(true);
      } catch (e) {
        console.log("Audio load error:", e);
        // Even if error, start game anyway so it doesn't hang
        setAudioLoaded(true);
      }
    }
    load();
    return () => {
      soundCorrect.current.unloadAsync();
      soundSkip.current.unloadAsync();
      soundBeep.current.unloadAsync();
      soundTick.current.unloadAsync();
    };
  }, []);

  const playSound = async (type) => {
    if (!soundEnabled) return;
    try {
      if (type === 'CORRECT') await soundCorrect.current.replayAsync();
      if (type === 'SKIP') await soundSkip.current.replayAsync();
      if (type === 'BEEP') await soundBeep.current.replayAsync();
      if (type === 'TICK') await soundTick.current.replayAsync();
    } catch (e) {
        console.log("Play error", e);
    }
  };

  // 1. Orientation
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
  }, []);

  // 2. Countdown Logic (Now waits for audioLoaded)
  useEffect(() => {
    // CRITICAL FIX: Do not start logic until audio is ready
    if (gameState !== 'COUNTDOWN' || !audioLoaded) return;

    let timeouts = [];
    
    // Start audio immediately
    playSound('BEEP');

    // Sync Visuals to Audio Timestamps:
    // 1.30s: Audio starts "2"
    timeouts.push(setTimeout(() => setCountdown(2), 1300));

    // 2.30s: Audio starts "1"
    timeouts.push(setTimeout(() => setCountdown(1), 2300));

    // 3.30s: Audio starts "Go" - Switch to Game
    timeouts.push(setTimeout(() => {
      setGameState('PLAYING');
    }, 3300));
    
    return () => timeouts.forEach(clearTimeout);
  }, [gameState, audioLoaded]); // <--- Added dependency here

  // 3. Game Timer
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        // Sync Tick Sound: Trigger at 9s (Audio is ~9s long)
        if (prev === 9) playSound('TICK');
        
        if (prev <= 1) {
          handleGameOver();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gameState]);

  // 4. Sensors
  useEffect(() => {
    if (isTouchMode || gameState !== 'PLAYING') return;
    Accelerometer.setUpdateInterval(100);
    sensorSubscription.current = Accelerometer.addListener(data => {
      if (inputLocked) return; 
      const { z } = data;
      if (z < -0.7) triggerAction('CORRECT');
      else if (z > 0.7) triggerAction('SKIP');
    });
    return () => {
      if (sensorSubscription.current) sensorSubscription.current.remove();
    };
  }, [isTouchMode, gameState, inputLocked]);

  const triggerAction = (type) => {
    if (inputLocked || gameState !== 'PLAYING') return;
    
    setInputLocked(true);

    const currentWord = deck[currentWordIndex];
    let delay = 1500;

    if (type === 'CORRECT') {
      scoreRef.current += 2; 
      correctWords.current.push(currentWord);
      setBgColor('#16a34a'); 
      playSound('CORRECT');
      delay = 2000; 
    } else {
      scoreRef.current -= 1; 
      skippedWords.current.push(currentWord);
      setBgColor('#dc2626'); 
      playSound('SKIP');
      delay = 1000; 
    }

    if (currentWordIndex < deck.length - 1) {
        setCurrentWordIndex(prev => prev + 1);
    } else {
        handleGameOver();
        return;
    }

    setTimeout(() => {
        setBgColor('#111827');
    }, 500);

    setTimeout(() => {
        setInputLocked(false);
    }, delay);
  };

  const handleGameOver = () => {
    if (sensorSubscription.current) sensorSubscription.current.remove();
    clearInterval(timerRef.current);
    setTimeout(() => {
        onEndGame({
            score: scoreRef.current,
            correctWords: correctWords.current,
            skippedWords: skippedWords.current
        });
    }, 100);
  };

  const currentWord = deck[currentWordIndex];

  // RENDER HELPERS
  const renderCountdown = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.countdownText}>{countdown}</Text>
      <Text style={styles.subText}>Get Ready!</Text>
    </View>
  );

  const renderTouchControls = () => (
    <View style={styles.splitScreen}>
      <TouchableOpacity 
        style={[styles.splitPane, styles.bgRed, inputLocked && styles.disabledPane]} 
        onPress={() => triggerAction('SKIP')}
        disabled={inputLocked}
        activeOpacity={0.8}
      >
        <Text style={[styles.splitText, styles.rotateLeft]}>SKIP</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.splitPane, styles.bgGreen, inputLocked && styles.disabledPane]} 
        onPress={() => triggerAction('CORRECT')}
        disabled={inputLocked}
        activeOpacity={0.8}
      >
        <Text style={[styles.splitText, styles.rotateRight]}>CORRECT</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar hidden />

      {/* TOUCH CONTROLS */}
      {isTouchMode && gameState === 'PLAYING' && renderTouchControls()}
      
      {/* OVERLAY CONTENT */}
      <View pointerEvents="none" style={styles.overlayLayer}>
        
        {gameState === 'COUNTDOWN' ? renderCountdown() : (
            <>
                {/* TIMER */}
                <View style={styles.timerContainer}>
                    <Text style={styles.timerText}>
                    {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                    </Text>
                </View>

                {/* WORD */}
                <Text 
                    style={[styles.wordText, inputLocked && { opacity: 0.5 }]} 
                    adjustsFontSizeToFit 
                    numberOfLines={1}
                >
                    {currentWord}
                </Text>
            </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', height: '100%' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overlayLayer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  
  // Split Screen
  splitScreen: { flexDirection: 'row', flex: 1 },
  splitPane: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  disabledPane: { opacity: 0.3 }, 
  bgRed: { backgroundColor: '#dc2626' },
  bgGreen: { backgroundColor: '#16a34a' },
  splitText: { color: 'white', fontSize: 40, fontFamily: 'Inter_900Black', opacity: 0.6 },
  rotateLeft: { transform: [{ rotate: '-90deg' }] },
  rotateRight: { transform: [{ rotate: '90deg' }] },

  // Text
  countdownText: { color: '#22d3ee', fontSize: 120, fontFamily: 'Inter_900Black' },
  subText: { color: 'white', fontSize: 24, fontFamily: 'Inter_700Bold' },
  wordText: { color: 'white', fontSize: 100, fontFamily: 'Inter_900Black', textAlign: 'center', padding: 20 },
  
  timerContainer: { position: 'absolute', top: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20 },
  timerText: { color: 'white', fontSize: 24, fontFamily: 'Inter_700Bold' },
});
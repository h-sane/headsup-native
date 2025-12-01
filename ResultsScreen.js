import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ResultsScreen({ score, correctWords, skippedWords, onHome, onPlayAgain }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalList, setModalList] = useState({ title: '', data: [] });

  const openList = (title, data) => {
    setModalList({ title, data });
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.content}>
        <Text style={styles.title}>Time's Up!</Text>
        
        {/* SCORE DISPLAY */}
        <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Final Score</Text>
            {/* The Web version had a pulse animation, simpler to just make this huge/bold on native */}
            <Text style={styles.scoreValue}>{score}</Text>
        </View>

        {/* STATS CARDS */}
        <View style={styles.statsContainer}>
            {/* Correct Card */}
            <View style={styles.statCard}>
                <View>
                    <Text style={[styles.statLabel, { color: '#4ade80' }]}>Correct ({correctWords.length})</Text>
                    <Text style={styles.statSub}>+2 points each</Text>
                </View>
                <TouchableOpacity 
                    style={[styles.viewBtn, { backgroundColor: 'rgba(74, 222, 128, 0.2)' }]}
                    onPress={() => openList('Correct Words', correctWords)}
                >
                    <Text style={[styles.viewBtnText, { color: '#4ade80' }]}>VIEW</Text>
                </TouchableOpacity>
            </View>

            {/* Skipped Card */}
            <View style={styles.statCard}>
                <View>
                    <Text style={[styles.statLabel, { color: '#f87171' }]}>Skipped ({skippedWords.length})</Text>
                    <Text style={styles.statSub}>-1 point each</Text>
                </View>
                <TouchableOpacity 
                    style={[styles.viewBtn, { backgroundColor: 'rgba(248, 113, 113, 0.2)' }]}
                    onPress={() => openList('Skipped Words', skippedWords)}
                >
                    <Text style={[styles.viewBtnText, { color: '#f87171' }]}>VIEW</Text>
                </TouchableOpacity>
            </View>
        </View>

        {/* ACTIONS */}
        <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.playBtn} onPress={onPlayAgain}>
                <Text style={styles.playBtnText}>PLAY AGAIN</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuBtn} onPress={onHome}>
                <Text style={styles.menuBtnText}>MAIN MENU</Text>
            </TouchableOpacity>
        </View>
      </View>

      {/* WORD LIST MODAL */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{modalList.title}</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                        <Text style={styles.closeBtn}>✕</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalScroll}>
                    {modalList.data.length === 0 ? (
                        <Text style={styles.emptyText}>No words in this list.</Text>
                    ) : (
                        modalList.data.map((word, index) => (
                            <View key={index} style={styles.listItem}>
                                <Text style={styles.listText}>{word}</Text>
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827', justifyContent: 'center', padding: 20 },
  content: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  title: { fontSize: 48, fontFamily: 'Inter_900Black', color: '#22d3ee', textAlign: 'center', marginBottom: 30 },
  
  scoreContainer: { alignItems: 'center', marginBottom: 40 },
  scoreLabel: { color: '#9ca3af', fontSize: 18, fontFamily: 'Inter_400Regular' },
  scoreValue: { color: 'white', fontSize: 96, fontFamily: 'Inter_900Black' },

  statsContainer: { gap: 16, marginBottom: 40 },
  statCard: { 
    backgroundColor: 'rgba(0,0,0,0.3)', 
    padding: 16, 
    borderRadius: 12, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  statLabel: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  statSub: { color: '#6b7280', fontSize: 12 },
  viewBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  viewBtnText: { fontFamily: 'Inter_700Bold', fontSize: 12 },

  actionContainer: { flexDirection: 'row', gap: 16 },
  playBtn: { flex: 1, backgroundColor: '#06b6d4', padding: 16, borderRadius: 12, alignItems: 'center' },
  playBtnText: { color: '#111827', fontFamily: 'Inter_900Black', fontSize: 18 },
  menuBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  menuBtnText: { color: '#22d3ee', fontFamily: 'Inter_900Black', fontSize: 18 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1f2937', borderRadius: 16, maxHeight: '70%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#374151' },
  modalTitle: { color: 'white', fontSize: 24, fontFamily: 'Inter_700Bold' },
  closeBtn: { color: '#9ca3af', fontSize: 28 },
  modalScroll: { padding: 20 },
  listItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  listText: { color: 'white', fontSize: 18, fontFamily: 'Inter_500Medium' },
  emptyText: { color: '#6b7280', textAlign: 'center', marginTop: 20 }
});
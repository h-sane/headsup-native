import { arrayUnion, doc, getDoc, runTransaction, setDoc, updateDoc } from "firebase/firestore";
import { db } from './firebaseConfig';

const CLOUD_FUNCTION_URL = "https://getaiwords-2vgpkucjlq-uc.a.run.app";

// --- CORE FUNCTIONS ---

export async function getWordDeck(userId, category, difficulty) {
    const deckId = `${category}_${difficulty}`.toLowerCase();
    console.log(`[Logic] Getting deck: ${deckId} for user: ${userId}`);
    
    // Reference to the user's private deck
    const userDeckRef = doc(db, `artifacts/heads-up-v1/users/${userId}/userDecks`, deckId);
    const userDeckSnap = await getDoc(userDeckRef);

    let userDeckData;

    // 1. If deck doesn't exist, seed it
    if (!userDeckSnap.exists()) {
        console.log("[Logic] No private deck. Seeding...");
        userDeckData = await seedUserDeck(deckId, userDeckRef, category, difficulty);
        if (!userDeckData) throw new Error("Failed to seed new user deck.");
    } else {
        userDeckData = userDeckSnap.data();
    }

    const { allWords = [], seenWords = [] } = userDeckData;
    const seenSet = new Set(seenWords);
    let availableWords = allWords.filter(word => !seenSet.has(word));

    console.log(`[Logic] Deck status: ${allWords.length} total, ${seenWords.length} seen, ${availableWords.length} available.`);

    const dynamicLowWordThreshold = Math.floor(allWords.length / 10);

    // 2. Handle empty or low deck
    if (availableWords.length === 0) {
        console.log("[Logic] Deck empty. Refreshing...");
        const updatedDeckData = await refreshWordCache(deckId, userDeckRef, category, difficulty);
        
        // Recalculate after refresh
        const { allWords: newAll, seenWords: newSeen } = updatedDeckData;
        const newSeenSet = new Set(newSeen);
        availableWords = newAll.filter(word => !newSeenSet.has(word));
        
        if (availableWords.length === 0) {
            throw new Error("Deck is empty and AI refresh failed.");
        }
    }
    else if (availableWords.length > 0 && availableWords.length < dynamicLowWordThreshold) {
        console.log("[Logic] Low words. Triggering background refresh...");
        refreshWordCache(deckId, userDeckRef, category, difficulty).catch(err => {
            console.error("[Logic] Background refresh failed:", err);
        });
    }
    
    return availableWords;
}

export async function updateSeenWords(userId, category, difficulty, word) {
    const deckId = `${category}_${difficulty}`.toLowerCase();
    const userDeckRef = doc(db, `artifacts/heads-up-v1/users/${userId}/userDecks`, deckId);
    try {
        await updateDoc(userDeckRef, {
            seenWords: arrayUnion(word)
        });
    } catch (error) {
        console.error("Failed to update seenWords:", error);
    }
}

// --- HELPER FUNCTIONS ---

async function seedUserDeck(deckId, userDeckRef, category, difficulty) {
    const masterDeckRef = doc(db, `artifacts/heads-up-v1/public/data/decks`, deckId);
    let masterDeckSnap = await getDoc(masterDeckRef);
    let masterDeckData = masterDeckSnap.data();

    // If master bank is empty, call AI to fill it
    if (!masterDeckSnap.exists() || !masterDeckData || !masterDeckData.allWords || masterDeckData.allWords.length === 0) {
        console.log("[Logic] Master bank empty. Calling AI...");
        masterDeckData = await refreshWordCache(deckId, userDeckRef, category, difficulty, masterDeckRef);
    }

    const newPrivateDeck = {
        allWords: masterDeckData.allWords,
        seenWords: []
    };
    
    await setDoc(userDeckRef, newPrivateDeck);
    return newPrivateDeck;
}

async function refreshWordCache(deckId, userDeckRef, category, difficulty, masterDeckRef) {
    if (!masterDeckRef) {
        masterDeckRef = doc(db, `artifacts/heads-up-v1/public/data/decks`, deckId);
    }

    console.log(`[Logic] Refilling ${deckId}...`);

    try {
        const [userDeckSnap, masterDeckSnap] = await Promise.all([
            getDoc(userDeckRef),
            getDoc(masterDeckRef)
        ]);
        
        const userDeckData = userDeckSnap.data() || { allWords: [], seenWords: [] };
        const masterDeckData = masterDeckSnap.data() || { allWords: [] };
        
        let existingWords = new Set([...masterDeckData.allWords, ...userDeckData.allWords]);
        let allNewWords = [];

        // Try 3 batches (Native might be slower, lets stick to 3 for safety)
        for (let i = 0; i < 3; i++) {
            try {
                const result = await callGeminiAPI(category, difficulty, 50, Array.from(existingWords));
                if (result && result.words) {
                    for (const word of result.words) {
                        const trimmed = word.trim();
                        if (trimmed.length > 0 && !existingWords.has(trimmed)) {
                            allNewWords.push(trimmed);
                            existingWords.add(trimmed);
                        }
                    }
                }
            } catch (error) {
                console.error(`[Logic] Batch ${i + 1} fail:`, error);
            }
        }

        if (allNewWords.length === 0) {
            // If user has words, just return them. If strictly empty, throw error.
            if (userDeckData.allWords.length > 0) return userDeckData;
            throw new Error("AI returned no new words.");
        }
        
        console.log(`[Logic] Fetched ${allNewWords.length} new unique words.`);

        // Transaction to update both Master and User
        const newDeckData = await runTransaction(db, async (transaction) => {
            transaction.set(masterDeckRef, {
                allWords: arrayUnion(...allNewWords)
            }, { merge: true });

            const updatedUserDeck = {
                allWords: [...userDeckData.allWords, ...allNewWords],
                seenWords: [] // Reset seen words on refresh so they can play again
            };
            transaction.set(userDeckRef, updatedUserDeck); 
            
            return updatedUserDeck;
        });
        
        return newDeckData;

    } catch (error) {
        console.error("CRITICAL: Failed to refresh word cache:", error);
        throw error;
    }
}

async function callGeminiAPI(category, difficulty, count, existingWords = []) {
    const payload = { category, difficulty, count, existingWords };

    try {
        const response = await fetch(CLOUD_FUNCTION_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Server Error ${response.status}: ${errText}`);
        }

        return await response.json(); 
    } catch (error) {
        console.error("Network Error calling AI:", error);
        throw error;
    }
}
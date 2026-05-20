import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getFirestore, limit, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// 파이어베이스 설정 (본인의 프로젝트 설정으로 변경해주세요)
const firebaseConfig = {
  apiKey: "AIzaSyDexZtXKUKVU-xFQqqdcXc5bDMrtKQsVKw",
  authDomain: "cat-todo-e9353.firebaseapp.com",
  projectId: "cat-todo-e9353",
  storageBucket: "cat-todo-e9353.firebasestorage.app",
  messagingSenderId: "992333562632",
  appId: "1:992333562632:web:5ce94e79b16865f71b62bd"
};

// 파이어베이스 초기화 (설정값이 있을 때만 시도)
let app;
let auth: any;
let db: any;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.log("Firebase init error:", error);
}

export default function HomeScreen() {
  // 인증 상태
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'initial' | 'login' | 'signup'>('initial');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // 투두 및 펫 상태
  const [taskText, setTaskText] = useState('');
  const [tasks, setTasks] = useState<{ id: string; text: string }[]>([]);
  const [coins, setCoins] = useState(0);
  const [level, setLevel] = useState(1);
  const [exp, setExp] = useState(0);

  // 아이디어 노트 상태
  const [ideaText, setIdeaText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('💡 아이디어');
  const [ideas, setIdeas] = useState<any[]>([]);

  // 명예의 전당 (랭킹) 상태
  const [nicknameInput, setNicknameInput] = useState('');
  const [statusMessageInput, setStatusMessageInput] = useState('');
  const [rankings, setRankings] = useState<any[]>([]);

  const tags = ['💡 아이디어', '🚀 기획', '📢 마케팅'];

  const getRankTitle = (lvl: number) => {
    if (lvl <= 3) return '인턴 냥이';
    if (lvl <= 6) return '대리 냥이';
    if (lvl <= 9) return '팀장 냥이';
    return '대표 냥이';
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const moveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && db) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(userRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setTasks(data.todos || []);
            setCoins(data.coins || 0);
            setLevel(data.level || 1);
            setExp(data.exp || 0);
            setStatusMessageInput(data.statusMessage || '');
            setNicknameInput(data.displayName || '');
          } else {
            await setDoc(userRef, { todos: [], coins: 0, level: 1, exp: 0, statusMessage: '', displayName: '' });
            setTasks([]);
            setCoins(0);
            setLevel(1);
            setExp(0);
            setStatusMessageInput('');
            setNicknameInput('');
          }
        } catch (error) {
          console.log("Firestore load error:", error);
        }
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user || !db) {
      setIdeas([]);
      return;
    }
    const ideasRef = collection(db, 'users', user.uid, 'ideas');
    const q = query(ideasRef, orderBy('createdAt', 'desc'));
    const unsubscribeIdeas = onSnapshot(q, (snapshot) => {
      const loadedIdeas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setIdeas(loadedIdeas);
    });

    return () => unsubscribeIdeas();
  }, [user]);

  useEffect(() => {
    if (!db) return;
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('coins', 'desc'), limit(10));
    const unsubscribeRankings = onSnapshot(q, (snapshot) => {
      const loadedRankings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRankings(loadedRankings);
    });

    return () => unsubscribeRankings();
  }, [db]);

  const saveStatusMessage = async () => {
    if (!user || !db) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { statusMessage: statusMessageInput.trim() });
      alert('상태 메시지가 저장되었다옹! 💬');
    } catch (error: any) {
      console.log('saveStatusMessage error:', error);
      alert('저장 실패: ' + error.message);
    }
  };

  const saveNickname = async () => {
    if (!user || !db) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { displayName: nicknameInput.trim() });
      alert('닉네임이 설정되었다옹! 🐾');
    } catch (error: any) {
      console.log('saveNickname error:', error);
      alert('저장 실패: ' + error.message);
    }
  };

  const handleLogin = async () => {
    if (!auth) return setAuthError("Firebase 설정이 필요합니다.");
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      setAuthError("로그인 실패: " + error.message);
    }
  };

  const handleSignup = async () => {
    if (!auth) return setAuthError("Firebase 설정이 필요합니다.");
    setAuthError('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      setAuthError("회원가입 실패: " + error.message);
    }
  };

  const handleGoogleLogin = () => {
    // 구글 로그인 뼈대: Expo AuthSession 또는 Firebase Google Auth 프로바이더 연결 필요
    setAuthError("구글 로그인은 추가 설정이 필요합니다.");
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.log(error);
    }
  };

  const handleGuestLogin = async () => {
    if (!auth) return setAuthError("Firebase 설정이 필요합니다.");
    setAuthError('');
    try {
      await signInAnonymously(auth);
    } catch (error: any) {
      setAuthError("게스트 로그인 실패: " + error.message);
    }
  };

  const addTask = async () => {
    if (taskText.trim() === '') return;
    const newTask = { id: Date.now().toString(), text: taskText.trim() };
    const newTasks = [...tasks, newTask];

    setTasks(newTasks);
    setTaskText('');

    if (user && db) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { todos: newTasks });
      } catch (error) {
        console.log("addTask error:", error);
      }
    }
  };

  const completeTask = async (id: string) => {
    const newTasks = tasks.filter(task => task.id !== id);
    const newCoins = coins + 10;

    setTasks(newTasks);
    setCoins(newCoins);

    if (user && db) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { todos: newTasks, coins: newCoins });
      } catch (error) {
        console.log("completeTask error:", error);
      }
    }

    fadeAnim.setValue(1);
    moveAnim.setValue(0);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(moveAnim, {
        toValue: -80,
        duration: 1200,
        useNativeDriver: true,
      })
    ]).start();
  };

  const feedCat = async () => {
    if (coins < 50) {
      alert("코인이 부족하다옹!");
      return;
    }

    let newCoins = coins - 50;
    let newExp = exp + 20;
    let newLevel = level;
    let leveledUp = false;

    if (newExp >= 100) {
      newLevel += 1;
      newExp -= 100;
      leveledUp = true;
    }

    setCoins(newCoins);
    setExp(newExp);
    setLevel(newLevel);

    if (user && db) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { coins: newCoins, exp: newExp, level: newLevel });
      } catch (error) {
        console.log("feedCat error:", error);
      }
    }

    if (leveledUp) {
      setTimeout(() => {
        alert(`레벨 업! 🎉 Lv.${newLevel} ${getRankTitle(newLevel)}이(가) 되었다옹!`);
      }, 100);
    }
  };

  const saveIdea = async () => {
    if (!ideaText.trim()) return;
    if (!user || !db) {
      alert('데이터베이스가 초기화되지 않았습니다.');
      return;
    }

    try {
      const ideasRef = collection(db, 'users', user.uid, 'ideas');
      const ideaData: any = {
        text: ideaText.trim(),
        tag: selectedTag,
        createdAt: new Date().toISOString()
      };

      await addDoc(ideasRef, ideaData);

      setIdeaText('');
      alert('아이디어가 저장되었다옹! 💡');
    } catch (error: any) {
      console.log('saveIdea error:', error);
      alert(error.message);
    }
  };

  if (authLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: '#FFFFFF' }}>로딩중...</Text>
        </View>
      </>
    );
  }

  // 로그인 화면 렌더링
  if (!user) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.loginScrollContent} keyboardShouldPersistTaps="handled">
              <View style={styles.loginCenterContent}>
                <Image
                  source={require('../../assets/cat.png')}
                  style={styles.loginImage}
                />
                <Text style={styles.loginGreetingText}>반갑다옹! 오늘도 같이 힘내보자옹!</Text>
              </View>

              {authError !== '' && <Text style={styles.errorText}>{authError}</Text>}

              {authMode === 'initial' ? (
                <View style={styles.loginFormWrapper}>
                  <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
                    <FontAwesome name="google" size={20} color="#555" style={styles.googleIcon} />
                    <Text style={styles.googleButtonText}>구글 계정으로 시작하기</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.emailButton} onPress={() => setAuthMode('login')}>
                    <Text style={styles.emailButtonText}>이메일로 시작하기</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.guestButton} onPress={handleGuestLogin}>
                    <Text style={styles.guestButtonText}>게스트로 시작하기</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.loginFormWrapper}>
                  <TextInput
                    style={styles.authInput}
                    placeholder="이메일"
                    placeholderTextColor="#888"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TextInput
                    style={styles.authInput}
                    placeholder="비밀번호"
                    placeholderTextColor="#888"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                  <TouchableOpacity style={styles.submitButton} onPress={authMode === 'login' ? handleLogin : handleSignup}>
                    <Text style={styles.submitButtonText}>{authMode === 'login' ? '이메일로 로그인' : '가입하기'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.guestButton} onPress={() => setAuthMode('initial')}>
                    <Text style={styles.guestButtonText}>뒤로가기</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={styles.bottomLink}
                onPress={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')}
              >
                <Text style={styles.bottomLinkText}>
                  {authMode === 'signup' ? '이미 계정이 있으신가요? ' : '아직 회원이 아니신가요? '}
                  <Text style={styles.signupHighlightText}>{authMode === 'signup' ? '로그인' : '가입하기'}</Text>
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </>
    );
  }

  // 메인 화면 렌더링
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* 상단바 (Header) */}
          <View style={styles.header}>
            <Text style={styles.headerText}>🐾 내 펫</Text>
            <View style={styles.headerRight}>
              <Text style={styles.headerText}>💰 코인: {coins}</Text>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Text style={styles.logoutText}>로그아웃</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* 가운데 이미지와 인사말 */}
            <View style={styles.centerContent}>
              <Image
                source={require('../../assets/cat.png')}
                style={styles.image}
              />

              <View style={styles.statusContainer}>
                <Text style={styles.levelText}>👑 Lv.{level} {getRankTitle(level)}</Text>
                <View style={styles.expBarContainer}>
                  <View style={[styles.expBarFill, { width: `${exp}%` }]} />
                </View>
                <Text style={styles.expText}>EXP: {exp} / 100</Text>
              </View>

              <TouchableOpacity style={styles.feedButton} onPress={feedCat}>
                <Text style={styles.feedButtonText}>🐟 츄르 주기 (50코인)</Text>
              </TouchableOpacity>

              <Animated.Text
                style={[
                  styles.floatingText,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: moveAnim }]
                  }
                ]}
              >
                +10 코인 획득! 💰
              </Animated.Text>
              <Text style={styles.greetingText}>안녕! 나는 너의 고양이 비서야</Text>
            </View>

            {/* 할 일 입력창 */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="오늘 할 일을 적어주세요!"
                placeholderTextColor="#888"
                value={taskText}
                onChangeText={setTaskText}
                onSubmitEditing={addTask}
              />
              <TouchableOpacity style={styles.addButton} onPress={addTask}>
                <Text style={styles.addButtonText}>추가</Text>
              </TouchableOpacity>
            </View>

            {/* 할 일 목록 */}
            <View style={styles.listContainer}>
              {tasks.map((task) => (
                <View key={task.id} style={styles.taskItem}>
                  <Text style={styles.taskText}>{task.text}</Text>
                  <TouchableOpacity style={styles.completeButton} onPress={() => completeTask(task.id)}>
                    <Text style={styles.completeButtonText}>완료</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* 나의 아이디어 노트 */}
            <View style={styles.ideaContainer}>
              <Text style={styles.ideaTitle}>💡 나의 아이디어 노트</Text>

              <TextInput
                style={styles.ideaInput}
                placeholder="멋진 아이디어를 자유롭게 적어보세요!"
                placeholderTextColor="#888"
                multiline={true}
                value={ideaText}
                onChangeText={setIdeaText}
              />

              <View style={styles.tagContainer}>
                {tags.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tagButton, selectedTag === tag && styles.tagButtonSelected]}
                    onPress={() => setSelectedTag(tag)}
                  >
                    <Text style={[styles.tagText, selectedTag === tag && styles.tagTextSelected]}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.ideaButtonRow}>
                <TouchableOpacity
                  style={[styles.ideaButton, styles.ideaSubmitButton]}
                  onPress={saveIdea}
                >
                  <Text style={styles.ideaButtonText}>노트 저장하기</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 나의 아이디어 피드 */}
            <View style={styles.ideaFeedContainer}>
              {ideas.map((idea) => (
                <View key={idea.id} style={styles.ideaCard}>
                  <View style={styles.ideaCardTag}>
                    <Text style={styles.ideaCardTagText}>{idea.tag || '💡 아이디어'}</Text>
                  </View>
                  {idea.text ? <Text style={styles.ideaCardText}>{idea.text}</Text> : null}
                </View>
              ))}
            </View>

            {/* 🏆 명예의 전당 (랭킹 & 소통) */}
            <View style={styles.rankingContainer}>
              <Text style={styles.rankingTitle}>🏆 명예의 전당</Text>

              {/* 나의 닉네임 설정 */}
              <View style={styles.nicknameInputContainer}>
                <TextInput
                  style={styles.nicknameInput}
                  placeholder="나의 닉네임 (예: 멋쟁이 냥이)"
                  placeholderTextColor="#888"
                  value={nicknameInput}
                  onChangeText={setNicknameInput}
                  maxLength={15}
                />
                <TouchableOpacity style={styles.nicknameSaveButton} onPress={saveNickname}>
                  <Text style={styles.nicknameSaveButtonText}>저장</Text>
                </TouchableOpacity>
              </View>

              {/* 한 줄 상태 메시지 */}
              <View style={styles.statusMessageInputContainer}>
                <TextInput
                  style={styles.statusMessageInput}
                  placeholder="나의 상태 메시지 (오늘의 다짐/목표)"
                  placeholderTextColor="#888"
                  value={statusMessageInput}
                  onChangeText={setStatusMessageInput}
                  maxLength={30}
                />
                <TouchableOpacity style={styles.statusMessageSaveButton} onPress={saveStatusMessage}>
                  <Text style={styles.statusMessageSaveButtonText}>저장</Text>
                </TouchableOpacity>
              </View>

              {/* 랭킹 리스트 */}
              <View style={styles.rankingList}>
                {rankings.map((r, index) => {
                  let medal = '';
                  if (index === 0) medal = '🥇';
                  else if (index === 1) medal = '🥈';
                  else if (index === 2) medal = '🥉';

                  return (
                    <View key={r.id} style={styles.rankingItem}>
                      <View style={styles.rankingInfo}>
                        <Text style={styles.rankingRank}>{medal} {index + 1}등</Text>
                        <Text style={styles.rankingName}>{r.displayName ? r.displayName : (r.email ? r.email.split('@')[0] : '익명 냥이')}</Text>
                        <Text style={styles.rankingCoins}>💰 {r.coins || 0}</Text>
                      </View>
                      {r.statusMessage ? (
                        <View style={styles.rankingSpeechBubble}>
                          <Text style={styles.rankingSpeechText}>{r.statusMessage}</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoutButton: {
    marginLeft: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#3A3A3C',
    borderRadius: 8,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  image: {
    width: '90%',
    maxWidth: 450,
    minWidth: 350,
    aspectRatio: 1,
    marginBottom: 40,
    resizeMode: 'contain',
  },
  floatingText: {
    position: 'absolute',
    color: '#FFD700', // 예쁜 금색(노란색)
    fontSize: 26,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    zIndex: 10,
  },
  greetingText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  levelText: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  expBarContainer: {
    width: '80%',
    maxWidth: 250,
    height: 12,
    backgroundColor: '#3A3A3C',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 4,
  },
  expBarFill: {
    height: '100%',
    backgroundColor: '#FF9F1C',
  },
  expText: {
    color: '#AAAAAA',
    fontSize: 14,
    fontWeight: '600',
  },
  feedButton: {
    backgroundColor: '#FF9F1C',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#FF9F1C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  feedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  input: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    color: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginRight: 12,
  },
  addButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  taskItem: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginRight: 12,
  },
  completeButton: {
    backgroundColor: '#30D158',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // --- 로그인 화면 스타일 ---
  loginScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  loginCenterContent: {
    alignItems: 'center',
    marginBottom: 50,
  },
  loginImage: {
    width: '80%',
    maxWidth: 300,
    aspectRatio: 1,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  loginGreetingText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  loginFormWrapper: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    marginHorizontal: 'auto',
    alignItems: 'center',
    gap: 16,
    marginBottom: 40,
  },
  googleButton: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleIcon: {
    marginRight: 12,
  },
  googleButtonText: {
    color: '#555555',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emailButton: {
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  guestButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestButtonText: {
    color: '#AAAAAA',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  authInput: {
    width: '100%',
    backgroundColor: '#2C2C2E',
    color: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
  },
  submitButton: {
    width: '100%',
    backgroundColor: '#0A84FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomLink: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingTop: 20,
  },
  bottomLinkText: {
    color: '#888888',
    fontSize: 15,
  },
  signupHighlightText: {
    color: '#FF9F1C',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorText: {
    color: '#FF453A',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },
  // --- 아이디어 노트 스타일 ---
  ideaContainer: {
    paddingHorizontal: 20,
    marginTop: 30,
    marginBottom: 40,
  },
  ideaTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  ideaInput: {
    backgroundColor: '#2C2C2E',
    color: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  tagContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  tagButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#3A3A3C',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tagButtonSelected: {
    backgroundColor: '#FF9F1C',
    borderColor: '#FF9F1C',
  },
  tagText: {
    color: '#AAAAAA',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tagTextSelected: {
    color: '#FFFFFF',
  },
  ideaButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  ideaButton: {
    backgroundColor: '#3A3A3C',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  ideaSubmitButton: {
    backgroundColor: '#FF9F1C',
  },
  ideaButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  ideaFeedContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  ideaCard: {
    backgroundColor: '#2A2A2C',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  ideaCardTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#3A3A3C',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  ideaCardTagText: {
    color: '#FF9F1C',
    fontSize: 12,
    fontWeight: 'bold',
  },
  ideaCardText: {
    color: '#E0E0E0',
    fontSize: 16,
    lineHeight: 24,
  },
  // --- 명예의 전당 (랭킹) 스타일 ---
  rankingContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 60,
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  rankingTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  nicknameInputContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  nicknameInput: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    color: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    marginRight: 12,
  },
  nicknameSaveButton: {
    backgroundColor: '#3A3A3C',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nicknameSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusMessageInputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statusMessageInput: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    color: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    marginRight: 12,
  },
  statusMessageSaveButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusMessageSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  rankingList: {
    gap: 12,
  },
  rankingItem: {
    backgroundColor: '#2A2A2C',
    borderRadius: 16,
    padding: 16,
  },
  rankingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rankingRank: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    width: 60,
  },
  rankingName: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
  rankingCoins: {
    color: '#FF9F1C',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rankingSpeechBubble: {
    backgroundColor: '#3A3A3C',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  rankingSpeechText: {
    color: '#E0E0E0',
    fontSize: 14,
  },
});

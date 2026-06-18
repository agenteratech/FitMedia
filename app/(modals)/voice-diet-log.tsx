import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Mic, MicOff, Plus, Search, Trash2, Zap } from 'lucide-react-native';
import { extractFoodsFromAudio } from '../../lib/voice/geminiSpeech';
import {
  searchFoods,
  getFoodDetail,
  pickReferenceServing,
  type FatSecretServing,
} from '../../lib/fatsecret/client';
import { saveDietLog } from '../../lib/diet/saveDietLog';
import { useAuthStore } from '../../stores/authStore';
import { Button, Card, Chip } from '../../src/components/primitives';
import { colors, spacing, typography, numericStyle, radius } from '../../src/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'recording' | 'processing' | 'review';

type ReviewItem = {
  id: string;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  cal_per_unit: number;
  protein_per_unit: number;
  carbs_per_unit: number;
  fat_per_unit: number;
};

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

const UNIT_GRAMS: Record<string, number> = {
  g: 1, ml: 1, oz: 28.35, cup: 240, tbsp: 15, tsp: 5,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function scaleNutrition(
  serving: FatSecretServing,
  quantity: number,
  unit: string,
): { scale: number; perUnit: number } {
  const gramsPerUnit = UNIT_GRAMS[unit] ?? 0;
  if (gramsPerUnit > 0) {
    const totalGrams = quantity * gramsPerUnit;
    const scale = totalGrams / (serving.metric_serving_amount || 100);
    return { scale, perUnit: scale / quantity };
  }
  // count-based units (piece, slice, scoop, serving)
  return { scale: quantity, perUnit: 1 };
}

function rescale(item: ReviewItem, newQty: number): ReviewItem {
  const qty = Math.max(0, newQty);
  return {
    ...item,
    quantity:  qty,
    calories:  Math.round(item.cal_per_unit     * qty),
    protein_g: Math.round(item.protein_per_unit * qty * 10) / 10,
    carbs_g:   Math.round(item.carbs_per_unit   * qty * 10) / 10,
    fat_g:     Math.round(item.fat_per_unit     * qty * 10) / 10,
  };
}

async function lookupNutrition(
  foodName: string,
  quantity: number,
  unit: string,
): Promise<ReviewItem | null> {
  try {
    const res = await searchFoods(foodName);
    if (!res.foods.length) return null;

    const detail = await getFoodDetail(res.foods[0].food_id);
    const ref = pickReferenceServing(detail.servings);
    if (!ref) return null;

    const { scale, perUnit } = scaleNutrition(ref, quantity, unit);

    return {
      id: makeId(),
      food_name: detail.food_name,
      quantity,
      unit,
      calories:  Math.round(ref.calories     * scale),
      protein_g: Math.round(ref.protein      * scale * 10) / 10,
      carbs_g:   Math.round(ref.carbohydrate * scale * 10) / 10,
      fat_g:     Math.round(ref.fat          * scale * 10) / 10,
      cal_per_unit:     ref.calories     * perUnit,
      protein_per_unit: ref.protein      * perUnit,
      carbs_per_unit:   ref.carbohydrate * perUnit,
      fat_per_unit:     ref.fat          * perUnit,
    };
  } catch {
    return null;
  }
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function VoiceDietLogScreen() {
  const router  = useRouter();
  const params  = useLocalSearchParams<{ date?: string }>();
  const { user } = useAuthStore();
  const insets  = useSafeAreaInsets();

  const date = params.date ?? new Date().toISOString().slice(0, 10);

  const [phase,         setPhase]         = useState<Phase>('idle');
  const [mealType,      setMealType]      = useState<string>('breakfast');
  const [duration,      setDuration]      = useState(0);
  const [step,          setStep]          = useState('');
  const [items,         setItems]         = useState<ReviewItem[]>([]);
  const [saving,        setSaving]        = useState(false);
  const [showAdd,       setShowAdd]       = useState(false);
  const [addSearch,     setAddSearch]     = useState('');
  const [addResults,    setAddResults]    = useState<{ id: string; name: string }[]>([]);
  const [addLoading,    setAddLoading]    = useState(false);
  const [micPermission, setMicPermission] = useState<'loading' | 'granted' | 'denied'>('loading');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recordingRef = useRef<any>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const pulseLoop    = useRef<Animated.CompositeAnimation | null>(null);

  // ── Pulse animation ────────────────────────────────────────────────────────

  const startPulse = useCallback(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ]),
    );
    pulseLoop.current = loop;
    loop.start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopPulse();
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, [stopPulse]);

  // Request mic permission immediately when the screen opens
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Audio } = require('expo-av');
        const { status } = await Audio.requestPermissionsAsync();
        if (!cancelled) setMicPermission(status === 'granted' ? 'granted' : 'denied');
      } catch {
        if (!cancelled) setMicPermission('denied');
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  // ── Recording ─────────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Audio } = require('expo-av');
      if (micPermission !== 'granted') {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Microphone Access Required',
            'Please enable microphone access in your device Settings to use voice logging.',
          );
          return;
        }
        setMicPermission('granted');
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setDuration(0);
      setPhase('recording');
      startPulse();
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not start recording. Please try again.');
    }
  }, [startPulse, micPermission]);

  const stopAndProcess = useCallback(async () => {
    if (!recordingRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    stopPulse();
    setPhase('processing');

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (!uri) throw new Error('No audio recorded');

      setStep('Listening to your voice…');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const FileSystem = require('expo-file-system');
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setStep('Extracting food items…');
      const extracted = await extractFoodsFromAudio(base64, 'audio/m4a');

      if (!extracted.length) {
        Alert.alert(
          'No foods detected',
          'Try speaking more clearly, e.g. "200 grams chicken breast, a cup of rice, and one tablespoon olive oil."',
        );
        setPhase('idle');
        return;
      }

      setStep(`Looking up nutrition for ${extracted.length} item${extracted.length !== 1 ? 's' : ''}…`);
      const results = await Promise.all(
        extracted.map((f) => lookupNutrition(f.food, f.quantity, f.unit)),
      );

      const reviewItems: ReviewItem[] = extracted.map((f, i) =>
        results[i] ?? {
          id: makeId(),
          food_name: f.food,
          quantity:  f.quantity,
          unit:      f.unit,
          calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0,
          cal_per_unit: 0, protein_per_unit: 0, carbs_per_unit: 0, fat_per_unit: 0,
        },
      );

      setItems(reviewItems);
      setPhase('review');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Something went wrong. Please try again.');
      setPhase('idle');
    }
  }, [stopPulse]);

  // ── Review ────────────────────────────────────────────────────────────────

  const updateQuantity = useCallback((id: string, raw: string) => {
    const qty = parseFloat(raw) || 0;
    setItems((prev) => prev.map((it) => it.id === id ? rescale(it, qty) : it));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  // ── Add item search ────────────────────────────────────────────────────────

  const searchAddFood = useCallback(async (q: string) => {
    setAddSearch(q);
    if (!q.trim()) { setAddResults([]); return; }
    setAddLoading(true);
    try {
      const res = await searchFoods(q);
      setAddResults(res.foods.slice(0, 6).map((f) => ({ id: f.food_id, name: f.food_name })));
    } catch {
      setAddResults([]);
    } finally {
      setAddLoading(false);
    }
  }, []);

  const addFoodFromSearch = useCallback(async (_foodId: string, foodName: string) => {
    setAddSearch('');
    setAddResults([]);
    setShowAdd(false);
    const result = await lookupNutrition(foodName, 100, 'g');
    setItems((prev) => [...prev, result ?? {
      id: makeId(), food_name: foodName, quantity: 100, unit: 'g',
      calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0,
      cal_per_unit: 0, protein_per_unit: 0, carbs_per_unit: 0, fat_per_unit: 0,
    }]);
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────

  const saveMeal = useCallback(async () => {
    if (!user) return;
    if (!items.length) { Alert.alert('Nothing to save', 'Add at least one food item.'); return; }
    setSaving(true);
    try {
      for (const item of items) {
        const { error } = await saveDietLog({
          userId:      user.id,
          date,
          mealType,
          description: `${item.food_name} (${item.quantity}${item.unit})`,
          calories:    item.calories,
          protein:     item.protein_g,
          carbs:       item.carbs_g,
          fats:        item.fat_g,
        });
        if (error) throw new Error(error);
      }
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [user, items, date, mealType, router]);

  // ── Totals ────────────────────────────────────────────────────────────────

  const totals = items.reduce(
    (acc, it) => ({
      calories:  acc.calories  + it.calories,
      protein_g: acc.protein_g + it.protein_g,
      carbs_g:   acc.carbs_g   + it.carbs_g,
      fat_g:     acc.fat_g     + it.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );

  // ── Back handler ──────────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    if (phase === 'recording') {
      Alert.alert('Stop Recording?', 'Your recording will be discarded.', [
        { text: 'Keep Recording', style: 'cancel' },
        {
          text: 'Discard', style: 'destructive', onPress: () => {
            if (timerRef.current) clearInterval(timerRef.current);
            stopPulse();
            recordingRef.current?.stopAndUnloadAsync().catch(() => {});
            recordingRef.current = null;
            router.back();
          },
        },
      ]);
    } else {
      router.back();
    }
  }, [phase, stopPulse, router]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={10}>
        <ChevronLeft size={22} color={colors.ink2} strokeWidth={1.75} />
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>

      {/* ── IDLE ─────────────────────────────────────────────────── */}
      {phase === 'idle' && (
        <ScrollView
          contentContainerStyle={[styles.centerContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.screenTitle}>Log Meal by Voice</Text>
          <Text style={styles.screenSub}>
            Speak naturally and we'll extract the nutrition for you
          </Text>

          <Card padding="default" style={styles.mealTypeCard}>
            <Text style={styles.cardLabel}>MEAL TYPE</Text>
            <View style={styles.mealChipsRow}>
              {MEAL_TYPES.map((mt) => (
                <Chip
                  key={mt}
                  label={mt.charAt(0).toUpperCase() + mt.slice(1)}
                  selected={mealType === mt}
                  onPress={() => setMealType(mt)}
                />
              ))}
            </View>
          </Card>

          <Pressable
            onPress={startRecording}
            style={styles.micBtn}
            disabled={micPermission === 'loading'}
            accessibilityLabel="Start recording"
          >
            <View style={[styles.micBtnInner, micPermission === 'denied' && styles.micBtnDenied]}>
              {micPermission === 'loading'
                ? <ActivityIndicator size="large" color={colors.surface} />
                : <Mic size={42} color={colors.surface} strokeWidth={1.75} />}
            </View>
          </Pressable>
          {micPermission === 'denied' ? (
            <Text style={styles.permDenied}>
              Microphone access denied. Enable it in Settings to use voice logging.
            </Text>
          ) : (
            <Text style={styles.micHint}>
              {micPermission === 'loading' ? 'Requesting microphone access…' : 'Tap to start recording'}
            </Text>
          )}
          <Text style={styles.micExample}>
            Try: "200 grams chicken breast, a cup of rice and one tablespoon olive oil"
          </Text>

          <Card padding="default" style={styles.comingSoonCard}>
            <View style={styles.comingSoonRow}>
              <View style={styles.comingSoonIcon}>
                <Zap size={18} color={colors.ink4} strokeWidth={1.75} />
              </View>
              <View style={styles.comingSoonText}>
                <Text style={styles.comingSoonTitle}>Workout Voice Logging</Text>
                <Text style={styles.comingSoonSub}>
                  Coming Soon — log exercises, sets, reps and weights by voice
                </Text>
              </View>
            </View>
          </Card>
        </ScrollView>
      )}

      {/* ── RECORDING ────────────────────────────────────────────── */}
      {phase === 'recording' && (
        <View style={[styles.centerContent, styles.centerFlex, { paddingBottom: insets.bottom + 32 }]}>
          <Text style={styles.screenTitle}>Recording…</Text>
          <Text style={styles.screenSub}>
            Speak clearly — mention food names, amounts and units.
          </Text>

          <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]}>
            <View style={[styles.micBtnInner, styles.micBtnRecording]}>
              <MicOff size={42} color={colors.surface} strokeWidth={1.75} />
            </View>
          </Animated.View>

          <Text style={[styles.timer, numericStyle]}>{fmtDuration(duration)}</Text>

          <Button label="Stop & Process" fullWidth onPress={stopAndProcess} />
        </View>
      )}

      {/* ── PROCESSING ───────────────────────────────────────────── */}
      {phase === 'processing' && (
        <View style={[styles.centerContent, styles.centerFlex, { paddingBottom: insets.bottom + 32 }]}>
          <ActivityIndicator size="large" color={colors.accent} style={styles.spinner} />
          <Text style={styles.screenTitle}>Analyzing…</Text>
          {step ? <Text style={styles.processingStep}>{step}</Text> : null}
        </View>
      )}

      {/* ── REVIEW ───────────────────────────────────────────────── */}
      {phase === 'review' && (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.reviewHeader}>
            <Text style={styles.screenTitle}>Review Your Meal</Text>
            <View style={styles.mealBadge}>
              <Text style={styles.mealBadgeText}>
                {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
              </Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={[styles.reviewScroll, { paddingBottom: insets.bottom + 120 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {items.map((item) => (
              <ReviewRow
                key={item.id}
                item={item}
                onQuantityChange={(v) => updateQuantity(item.id, v)}
                onRemove={() => removeItem(item.id)}
              />
            ))}

            {showAdd ? (
              <Card padding="default" style={styles.addCard}>
                <Text style={styles.cardLabel}>SEARCH FOOD TO ADD</Text>
                <View style={styles.addSearchRow}>
                  <Search size={16} color={colors.ink3} strokeWidth={1.75} />
                  <TextInput
                    style={styles.addSearchInput}
                    placeholder="Search food…"
                    placeholderTextColor={colors.ink4}
                    value={addSearch}
                    onChangeText={searchAddFood}
                    autoFocus
                    returnKeyType="search"
                  />
                  {addLoading && <ActivityIndicator size="small" color={colors.accent} />}
                </View>
                {addResults.map((r) => (
                  <Pressable
                    key={r.id}
                    style={styles.addResult}
                    onPress={() => addFoodFromSearch(r.id, r.name)}
                  >
                    <Text style={styles.addResultText} numberOfLines={1}>{r.name}</Text>
                    <Text style={styles.addResultHint}>100g</Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => { setShowAdd(false); setAddSearch(''); setAddResults([]); }}
                  style={styles.cancelAddBtn}
                >
                  <Text style={styles.cancelAdd}>Cancel</Text>
                </Pressable>
              </Card>
            ) : (
              <Pressable style={styles.addItemBtn} onPress={() => setShowAdd(true)}>
                <Plus size={16} color={colors.accent} strokeWidth={1.75} />
                <Text style={styles.addItemLabel}>Add missing food item</Text>
              </Pressable>
            )}

            <Card padding="default" style={styles.totalsCard}>
              <Text style={styles.cardLabel}>TOTAL</Text>
              <Text style={[styles.totalCal, numericStyle]}>
                {Math.round(totals.calories)} kcal
              </Text>
              <View style={styles.macroRow}>
                <MacroChip label="Protein" value={totals.protein_g} color={colors.accent} />
                <MacroChip label="Carbs"   value={totals.carbs_g}   color={colors.ink3}   />
                <MacroChip label="Fat"     value={totals.fat_g}     color={colors.success} />
              </View>
            </Card>
          </ScrollView>

          <View style={[styles.saveBar, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Button
              label={saving ? 'Saving…' : `Save to ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`}
              fullWidth
              onPress={saveMeal}
              disabled={saving || items.length === 0}
            />
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

// ─── ReviewRow ───────────────────────────────────────────────────────────────

function ReviewRow({
  item,
  onQuantityChange,
  onRemove,
}: {
  item: ReviewItem;
  onQuantityChange: (v: string) => void;
  onRemove: () => void;
}) {
  const [editing,  setEditing]  = useState(false);
  const [localQty, setLocalQty] = useState(String(item.quantity));

  const commit = () => {
    setEditing(false);
    onQuantityChange(localQty);
  };

  return (
    <Card padding="default" style={styles.reviewRowCard}>
      <View style={styles.reviewRowTop}>
        <Text style={styles.reviewFoodName} numberOfLines={2}>{item.food_name}</Text>
        <Pressable onPress={onRemove} hitSlop={10}>
          <Trash2 size={16} color={colors.alert} strokeWidth={1.75} />
        </Pressable>
      </View>

      <View style={styles.reviewRowMid}>
        {editing ? (
          <TextInput
            style={styles.qtyInput}
            value={localQty}
            onChangeText={setLocalQty}
            onBlur={commit}
            onSubmitEditing={commit}
            keyboardType="decimal-pad"
            autoFocus
            selectTextOnFocus
          />
        ) : (
          <Pressable onPress={() => { setLocalQty(String(item.quantity)); setEditing(true); }}>
            <Text style={[styles.reviewQty, numericStyle]}>
              {item.quantity} {item.unit}
            </Text>
          </Pressable>
        )}
        <Text style={[styles.reviewCal, numericStyle]}>
          {Math.round(item.calories)} kcal
        </Text>
      </View>

      <Text style={styles.reviewMacros}>
        P {item.protein_g.toFixed(1)}g · C {item.carbs_g.toFixed(1)}g · F {item.fat_g.toFixed(1)}g
      </Text>
    </Card>
  );
}

// ─── MacroChip ───────────────────────────────────────────────────────────────

function MacroChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.macroChip}>
      <Text style={[styles.macroValue, numericStyle, { color }]}>{value.toFixed(1)}g</Text>
      <Text style={styles.macroLabelText}>{label}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  } satisfies ViewStyle,

  flex: { flex: 1 } satisfies ViewStyle,

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  } satisfies ViewStyle,

  backLabel: {
    ...(typography.body as TextStyle),
    color: colors.ink2,
  } satisfies TextStyle,

  centerContent: {
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
  } satisfies ViewStyle,

  centerFlex: {
    flex: 1,
    justifyContent: 'center',
  } satisfies ViewStyle,

  screenTitle: {
    ...(typography.heading as TextStyle),
    textAlign: 'center',
    marginBottom: spacing.sm,
  } satisfies TextStyle,

  screenSub: {
    ...(typography.body as TextStyle),
    color: colors.ink3,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  } satisfies TextStyle,

  mealTypeCard: {
    width: '100%',
    marginBottom: spacing['2xl'],
  } satisfies ViewStyle,

  cardLabel: {
    ...(typography.label as TextStyle),
    marginBottom: spacing.md,
  } satisfies TextStyle,

  mealChipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  } satisfies ViewStyle,

  micBtn: { marginBottom: spacing.lg } satisfies ViewStyle,

  micBtnInner: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,

  micBtnRecording: {
    backgroundColor: colors.alert,
  } satisfies ViewStyle,

  micHint: {
    ...(typography.bodyMedium as TextStyle),
    color: colors.ink2,
    marginBottom: spacing.sm,
  } satisfies TextStyle,

  micExample: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    textAlign: 'center',
    marginBottom: spacing['3xl'],
    paddingHorizontal: spacing.md,
  } satisfies TextStyle,

  comingSoonCard: {
    width: '100%',
    opacity: 0.6,
  } satisfies ViewStyle,

  comingSoonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  } satisfies ViewStyle,

  comingSoonIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceSunk,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,

  comingSoonText: { flex: 1 } satisfies ViewStyle,

  comingSoonTitle: {
    ...(typography.bodyMedium as TextStyle),
    color: colors.ink2,
    marginBottom: 2,
  } satisfies TextStyle,

  comingSoonSub: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,

  pulseRing: { marginBottom: spacing.lg } satisfies ViewStyle,

  timer: {
    ...(typography.display as TextStyle),
    letterSpacing: 2,
    marginBottom: spacing['2xl'],
  } satisfies TextStyle,

  spinner: { marginBottom: spacing.xl } satisfies ViewStyle,

  processingStep: {
    ...(typography.body as TextStyle),
    color: colors.ink3,
    textAlign: 'center',
    marginTop: spacing.sm,
  } satisfies TextStyle,

  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  } satisfies ViewStyle,

  mealBadge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  } satisfies ViewStyle,

  mealBadgeText: {
    ...(typography.label as TextStyle),
    color: colors.accent,
    textTransform: 'capitalize',
  } satisfies TextStyle,

  reviewScroll: {
    paddingHorizontal: spacing['2xl'],
    gap: spacing.md,
    paddingTop: spacing.sm,
  } satisfies ViewStyle,

  reviewRowCard: { gap: spacing.xs } satisfies ViewStyle,

  reviewRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 2,
  } satisfies ViewStyle,

  reviewFoodName: {
    ...(typography.bodyMedium as TextStyle),
    flex: 1,
  } satisfies TextStyle,

  reviewRowMid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  } satisfies ViewStyle,

  reviewQty: {
    ...(typography.body as TextStyle),
    color: colors.accent,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.buttonCompact,
  } satisfies TextStyle,

  qtyInput: {
    ...(typography.body as TextStyle),
    color: colors.accent,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.buttonCompact,
    minWidth: 72,
    borderWidth: 1,
    borderColor: colors.accent,
  } satisfies TextStyle,

  reviewCal: {
    ...(typography.bodyMedium as TextStyle),
    color: colors.ink2,
  } satisfies TextStyle,

  reviewMacros: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,

  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceSunk,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.surfaceElevBorder,
    borderStyle: 'dashed',
  } satisfies ViewStyle,

  addItemLabel: {
    ...(typography.bodyMedium as TextStyle),
    color: colors.accent,
  } satisfies TextStyle,

  addCard: { gap: spacing.sm } satisfies ViewStyle,

  addSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceSunk,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  } satisfies ViewStyle,

  addSearchInput: {
    ...(typography.body as TextStyle),
    flex: 1,
    color: colors.ink1,
  } satisfies TextStyle,

  addResult: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceElevBorder,
  } satisfies ViewStyle,

  addResultText: {
    ...(typography.body as TextStyle),
    flex: 1,
    marginRight: spacing.sm,
  } satisfies TextStyle,

  addResultHint: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,

  cancelAddBtn: { paddingTop: spacing.sm } satisfies ViewStyle,

  cancelAdd: {
    ...(typography.bodyMedium as TextStyle),
    color: colors.ink3,
    textAlign: 'center',
  } satisfies TextStyle,

  totalsCard: { gap: spacing.sm } satisfies ViewStyle,

  totalCal: {
    ...(typography.display as TextStyle),
    color: colors.ink1,
  } satisfies TextStyle,

  macroRow: {
    flexDirection: 'row',
    gap: spacing['2xl'],
  } satisfies ViewStyle,

  macroChip: { alignItems: 'center', gap: 2 } satisfies ViewStyle,

  macroValue: {
    ...(typography.bodyMedium as TextStyle),
  } satisfies TextStyle,

  macroLabelText: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,

  saveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceElevBorder,
  } satisfies ViewStyle,

  micBtnDenied: {
    backgroundColor: colors.ink4,
  } satisfies ViewStyle,

  permDenied: {
    ...(typography.caption as TextStyle),
    color: colors.alert,
    textAlign: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  } satisfies TextStyle,
});

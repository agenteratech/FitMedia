import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { Mic, Square, Plus, Search, Trash2, X } from 'lucide-react-native';
import { Sheet, Button, Card, Chip } from './primitives';
import { colors, spacing, typography, numericStyle, radius } from '@/theme';
import { extractFoodsFromAudio } from '../../lib/voice/geminiSpeech';
import {
  lookupNutrition,
  placeholderItem,
  rescale,
  makeId,
  type ReviewItem,
} from '../../lib/voice/nutrition';
import { searchFoods } from '../../lib/fatsecret/client';
import { saveDietLog } from '../../lib/diet/saveDietLog';
import { recalculateScores } from '../../lib/scoreEngine';

type Phase = 'idle' | 'recording' | 'processing' | 'review';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

function fmtDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Read a recorded file as base64 using the SDK 54 legacy FileSystem API. */
async function readFileAsBase64(uri: string): Promise<string> {
  // expo-file-system v19 moved readAsStringAsync / EncodingType to `/legacy`.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const FileSystem = require('expo-file-system/legacy');
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

export interface VoiceLogSheetProps {
  visible: boolean;
  date: string;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Voice meal logging as an always-mounted bottom sheet.
 *
 * Recording uses expo-audio (the SDK 54 native module). All native audio access
 * happens behind an explicit user tap — nothing native runs while the sheet is
 * merely mounted — so opening the sheet can never freeze the screen.
 */
export function VoiceLogSheet({ visible, date, userId, onClose, onSaved }: VoiceLogSheetProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const [phase, setPhase] = useState<Phase>('idle');
  const [mealType, setMealType] = useState<string>('breakfast');
  const [step, setStep] = useState('');
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [addResults, setAddResults] = useState<{ id: string; name: string }[]>([]);
  const [addLoading, setAddLoading] = useState(false);

  // Reset everything whenever the sheet closes.
  useEffect(() => {
    if (visible) return;
    if (recorderState.isRecording) recorder.stop().catch(() => {});
    setPhase('idle');
    setItems([]);
    setError(null);
    setStep('');
    setShowAdd(false);
    setAddSearch('');
    setAddResults([]);
    setSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── Recording ──────────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError(
          perm.canAskAgain === false
            ? 'Microphone access is blocked. Enable it in your device Settings to use voice logging.'
            : 'Microphone access is needed to record your meal.',
        );
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase('recording');
    } catch (e: any) {
      setError(e?.message ?? 'Could not start recording. Please try again.');
    }
  }, [recorder]);

  const stopAndProcess = useCallback(async () => {
    setPhase('processing');
    setStep('Finishing recording…');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('No audio was captured. Please try again.');

      setStep('Transcribing your voice…');
      const base64 = await readFileAsBase64(uri);

      setStep('Extracting food items…');
      const extracted = await extractFoodsFromAudio(base64, 'audio/mp4');
      if (!extracted.length) {
        setPhase('idle');
        setError('No foods detected. Try again, e.g. "200 grams chicken breast and a cup of rice".');
        return;
      }

      setStep(`Looking up nutrition for ${extracted.length} item${extracted.length !== 1 ? 's' : ''}…`);
      const results = await Promise.all(
        extracted.map((f) => lookupNutrition(f.food, f.quantity, f.unit)),
      );
      setItems(extracted.map((f, i) => results[i] ?? placeholderItem(f.food, f.quantity, f.unit)));
      setPhase('review');
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong processing the audio. Please try again.');
      setPhase('idle');
    }
  }, [recorder]);

  // ── Review editing ───────────────────────────────────────────────────────────

  const updateQuantity = useCallback((id: string, raw: string) => {
    const qty = parseFloat(raw) || 0;
    setItems((prev) => prev.map((it) => (it.id === id ? rescale(it, qty) : it)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

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

  const addFoodFromSearch = useCallback(async (foodName: string) => {
    setAddSearch('');
    setAddResults([]);
    setShowAdd(false);
    const result = await lookupNutrition(foodName, 100, 'g');
    setItems((prev) => [...prev, result ?? placeholderItem(foodName, 100, 'g')]);
  }, []);

  // ── Save ───────────────────────────────────────────────────────────────────

  const saveMeal = useCallback(async () => {
    if (!userId) return;
    if (!items.length) { setError('Add at least one food item.'); return; }
    setSaving(true);
    setError(null);
    try {
      for (const item of items) {
        const { error: saveErr } = await saveDietLog({
          userId,
          date,
          mealType,
          description: `${item.food_name} (${item.quantity}${item.unit})`,
          calories: item.calories,
          protein: item.protein_g,
          carbs: item.carbs_g,
          fats: item.fat_g,
        });
        if (saveErr) throw new Error(saveErr);
      }
      recalculateScores().catch(console.error);
      onSaved();
    } catch (e: any) {
      setError(e?.message ?? 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [userId, items, date, mealType, onSaved]);

  const totals = useMemo(
    () => items.reduce(
      (acc, it) => ({
        calories:  acc.calories  + it.calories,
        protein_g: acc.protein_g + it.protein_g,
        carbs_g:   acc.carbs_g   + it.carbs_g,
        fat_g:     acc.fat_g     + it.fat_g,
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    ),
    [items],
  );

  return (
    <Sheet visible={visible} onClose={onClose} snapPoints={['85%']} scrollable scrollContentStyle={styles.scroll}>
      <View style={styles.header}>
        <Text style={styles.title}>Log Meal by Voice</Text>
        <Pressable onPress={onClose} hitSlop={10}>
          <X size={20} color={colors.ink2} strokeWidth={1.75} />
        </Pressable>
      </View>

      {/* ── IDLE ─────────────────────────────────────────────── */}
      {phase === 'idle' && (
        <View style={styles.body}>
          <Text style={styles.sub}>Speak naturally — we'll extract the nutrition for you.</Text>

          <Text style={styles.fieldLabel}>MEAL TYPE</Text>
          <View style={styles.chipsRow}>
            {MEAL_TYPES.map((mt) => (
              <Chip key={mt} label={cap(mt)} selected={mealType === mt} onPress={() => setMealType(mt)} />
            ))}
          </View>

          <Pressable onPress={startRecording} style={styles.micBtn} accessibilityLabel="Start recording">
            <View style={styles.micBtnInner}>
              <Mic size={40} color={colors.surface} strokeWidth={1.75} />
            </View>
          </Pressable>
          <Text style={styles.micHint}>Tap to start recording</Text>
          <Text style={styles.micExample}>
            Try: "200 grams chicken breast, a cup of rice and one tablespoon olive oil"
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      )}

      {/* ── RECORDING ────────────────────────────────────────── */}
      {phase === 'recording' && (
        <View style={styles.body}>
          <Text style={styles.sub}>Listening… mention foods, amounts and units.</Text>
          <View style={[styles.micBtnInner, styles.micBtnRecording]}>
            <Mic size={40} color={colors.surface} strokeWidth={1.75} />
          </View>
          <Text style={[styles.timer, numericStyle]}>{fmtDuration(recorderState.durationMillis)}</Text>
          <Button label="Stop & Process" icon={Square} fullWidth onPress={stopAndProcess} />
        </View>
      )}

      {/* ── PROCESSING ───────────────────────────────────────── */}
      {phase === 'processing' && (
        <View style={[styles.body, styles.bodyCenter]}>
          <ActivityIndicator size="large" color={colors.accent} style={{ marginBottom: spacing.lg }} />
          <Text style={styles.title}>Analyzing…</Text>
          {step ? <Text style={styles.sub}>{step}</Text> : null}
        </View>
      )}

      {/* ── REVIEW ───────────────────────────────────────────── */}
      {phase === 'review' && (
        <View style={styles.body}>
          <View style={styles.reviewHead}>
            <Text style={styles.fieldLabel}>REVIEW · {cap(mealType)}</Text>
          </View>

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
                <Pressable key={r.id} style={styles.addResult} onPress={() => addFoodFromSearch(r.name)}>
                  <Text style={styles.addResultText} numberOfLines={1}>{r.name}</Text>
                  <Text style={styles.addResultHint}>100g</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => { setShowAdd(false); setAddSearch(''); setAddResults([]); }} style={styles.cancelAdd}>
                <Text style={styles.cancelAddText}>Cancel</Text>
              </Pressable>
            </Card>
          ) : (
            <Pressable style={styles.addItemBtn} onPress={() => setShowAdd(true)}>
              <Plus size={16} color={colors.accent} strokeWidth={1.75} />
              <Text style={styles.addItemLabel}>Add missing food item</Text>
            </Pressable>
          )}

          <Card padding="default" style={styles.totalsCard}>
            <Text style={styles.fieldLabel}>TOTAL</Text>
            <Text style={[styles.totalCal, numericStyle]}>{Math.round(totals.calories)} kcal</Text>
            <View style={styles.macroRow}>
              <MacroChip label="Protein" value={totals.protein_g} color={colors.accent} />
              <MacroChip label="Carbs" value={totals.carbs_g} color={colors.ink3} />
              <MacroChip label="Fat" value={totals.fat_g} color={colors.success} />
            </View>
          </Card>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label={saving ? 'Saving…' : `Save to ${cap(mealType)}`}
            fullWidth
            onPress={saveMeal}
            disabled={saving || items.length === 0}
            style={{ marginTop: spacing.md }}
          />
        </View>
      )}
    </Sheet>
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
  const [editing, setEditing] = useState(false);
  const [localQty, setLocalQty] = useState(String(item.quantity));

  const commit = () => {
    setEditing(false);
    onQuantityChange(localQty);
  };

  return (
    <Card padding="default" style={styles.rowCard}>
      <View style={styles.rowTop}>
        <Text style={styles.rowName} numberOfLines={2}>{item.food_name}</Text>
        <Pressable onPress={onRemove} hitSlop={10}>
          <Trash2 size={16} color={colors.alert} strokeWidth={1.75} />
        </Pressable>
      </View>
      <View style={styles.rowMid}>
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
            <Text style={[styles.qtyPill, numericStyle]}>{item.quantity} {item.unit}</Text>
          </Pressable>
        )}
        <Text style={[styles.rowCal, numericStyle]}>{Math.round(item.calories)} kcal</Text>
      </View>
      <Text style={styles.rowMacros}>
        P {item.protein_g.toFixed(1)}g · C {item.carbs_g.toFixed(1)}g · F {item.fat_g.toFixed(1)}g
      </Text>
    </Card>
  );
}

function MacroChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.macroChip}>
      <Text style={[styles.macroValue, numericStyle, { color }]}>{value.toFixed(1)}g</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing['4xl'],
    gap: spacing.md,
  } satisfies ViewStyle,

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  } satisfies ViewStyle,

  title: {
    ...(typography.heading as TextStyle),
  } satisfies TextStyle,

  body: { gap: spacing.md, alignItems: 'stretch' } satisfies ViewStyle,
  bodyCenter: { alignItems: 'center', paddingVertical: spacing['4xl'] } satisfies ViewStyle,

  sub: {
    ...(typography.body as TextStyle),
    color: colors.ink3,
    textAlign: 'center',
  } satisfies TextStyle,

  fieldLabel: {
    ...(typography.label as TextStyle),
    marginTop: spacing.xs,
  } satisfies TextStyle,

  chipsRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' } satisfies ViewStyle,

  micBtn: { alignSelf: 'center', marginTop: spacing.lg } satisfies ViewStyle,

  micBtnInner: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.md,
  } satisfies ViewStyle,

  micBtnRecording: { backgroundColor: colors.alert } satisfies ViewStyle,

  micHint: {
    ...(typography.bodyMedium as TextStyle),
    color: colors.ink2,
    textAlign: 'center',
  } satisfies TextStyle,

  micExample: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  } satisfies TextStyle,

  timer: {
    ...(typography.display as TextStyle),
    letterSpacing: 2,
    textAlign: 'center',
    marginVertical: spacing.lg,
  } satisfies TextStyle,

  error: {
    ...(typography.caption as TextStyle),
    color: colors.alert,
    textAlign: 'center',
  } satisfies TextStyle,

  reviewHead: { marginBottom: spacing.xs } satisfies ViewStyle,

  rowCard: { gap: spacing.xs } satisfies ViewStyle,
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  } satisfies ViewStyle,
  rowName: { ...(typography.bodyMedium as TextStyle), flex: 1 } satisfies TextStyle,
  rowMid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } satisfies ViewStyle,
  qtyPill: {
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
  rowCal: { ...(typography.bodyMedium as TextStyle), color: colors.ink2 } satisfies TextStyle,
  rowMacros: { ...(typography.caption as TextStyle), color: colors.ink3 } satisfies TextStyle,

  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceSunk,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.surfaceElevBorder,
    borderStyle: 'dashed',
  } satisfies ViewStyle,
  addItemLabel: { ...(typography.bodyMedium as TextStyle), color: colors.accent } satisfies TextStyle,

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
  addSearchInput: { ...(typography.body as TextStyle), flex: 1, color: colors.ink1 } satisfies TextStyle,
  addResult: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceElevBorder,
  } satisfies ViewStyle,
  addResultText: { ...(typography.body as TextStyle), flex: 1, marginRight: spacing.sm } satisfies TextStyle,
  addResultHint: { ...(typography.caption as TextStyle), color: colors.ink3 } satisfies TextStyle,
  cancelAdd: { paddingTop: spacing.sm } satisfies ViewStyle,
  cancelAddText: { ...(typography.bodyMedium as TextStyle), color: colors.ink3, textAlign: 'center' } satisfies TextStyle,

  totalsCard: { gap: spacing.sm } satisfies ViewStyle,
  totalCal: { ...(typography.display as TextStyle), color: colors.ink1 } satisfies TextStyle,
  macroRow: { flexDirection: 'row', gap: spacing['2xl'] } satisfies ViewStyle,
  macroChip: { alignItems: 'center', gap: 2 } satisfies ViewStyle,
  macroValue: { ...(typography.bodyMedium as TextStyle) } satisfies TextStyle,
  macroLabel: { ...(typography.caption as TextStyle), color: colors.ink3 } satisfies TextStyle,
});

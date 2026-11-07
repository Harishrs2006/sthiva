import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { Button, Eyebrow, Notice, ScreenHeader } from './ui';

// One form for listing and editing a product. The rules mirror the API
// (apps/api/src/features/suppliers/supplier.routes.ts): name 3+ chars, description 10+,
// price above 0, whole-number stock, GST 0/5/12/18/28.

export const UNITS: { value: string; label: string }[] = [
  { value: 'BAG', label: 'bag' },
  { value: 'KG', label: 'kg' },
  { value: 'TON', label: 'tonne' },
  { value: 'PIECE', label: 'piece' },
  { value: 'BUNDLE', label: 'bundle' },
  { value: 'CUBIC_METER', label: 'm³' },
  { value: 'SQUARE_METER', label: 'm²' },
  { value: 'LITER', label: 'litre' },
  { value: 'METER', label: 'metre' },
  { value: 'BOX', label: 'box' },
  { value: 'SHEET', label: 'sheet' },
];
const GST_RATES = [0, 5, 12, 18, 28];

export type ProductFormValues = {
  name: string;
  categoryId: string;
  description: string;
  shortDescription: string;
  unit: string;
  basePrice: string;
  gstRate: number;
  isGstInclusive: boolean;
  stockQuantity: string;
  minOrderQuantity: string;
  deliveryDays: string;
  tags: string;
};

export const emptyProduct: ProductFormValues = {
  name: '', categoryId: '', description: '', shortDescription: '', unit: 'BAG', basePrice: '', gstRate: 18,
  isGstInclusive: true, stockQuantity: '', minOrderQuantity: '1', deliveryDays: '2', tags: '',
};

export function toPayload(v: ProductFormValues) {
  return {
    name: v.name.trim(),
    description: v.description.trim(),
    shortDescription: v.shortDescription.trim() || undefined,
    unit: v.unit,
    basePrice: Number(v.basePrice),
    gstRate: v.gstRate,
    isGstInclusive: v.isGstInclusive,
    stockQuantity: Number(v.stockQuantity) || 0,
    minOrderQuantity: Number(v.minOrderQuantity) || 1,
    deliveryDays: Number(v.deliveryDays) || 0,
    tags: v.tags.split(',').map((t) => t.trim()).filter(Boolean),
  };
}

function problems(v: ProductFormValues, needCategory: boolean): Partial<Record<keyof ProductFormValues, string>> {
  const p: Partial<Record<keyof ProductFormValues, string>> = {};
  if (v.name.trim().length < 3) p.name = 'Give the product a name (3 letters or more).';
  if (needCategory && !v.categoryId) p.categoryId = 'Pick a category.';
  if (v.description.trim().length < 10) p.description = 'Describe it in at least 10 characters: grade, brand, use.';
  const price = Number(v.basePrice);
  if (!v.basePrice || !Number.isFinite(price) || price <= 0) p.basePrice = 'Enter a price above ₹0.';
  if (v.stockQuantity && !/^\d+$/.test(v.stockQuantity)) p.stockQuantity = 'Stock is a whole number.';
  if (!/^\d+$/.test(v.minOrderQuantity) || Number(v.minOrderQuantity) < 1) p.minOrderQuantity = 'At least 1.';
  if (!/^\d+$/.test(v.deliveryDays) || Number(v.deliveryDays) > 60) p.deliveryDays = '0 to 60 days.';
  return p;
}

export function ProductForm({
  title,
  eyebrow,
  initial,
  categories,
  onBack,
  onSubmit,
  saving,
  error,
  submitLabel,
  draftLabel,
  footer,
}: {
  title: string;
  eyebrow: string;
  initial: ProductFormValues;
  categories?: { _id: string; name: string }[];
  onBack: () => void;
  onSubmit: (values: ProductFormValues, asDraft: boolean) => void;
  saving: boolean;
  error: string | null;
  submitLabel: string;
  draftLabel?: string;
  footer?: ReactNode;
}) {
  const [v, setV] = useState<ProductFormValues>(initial);
  const [tried, setTried] = useState(false);
  const errs = problems(v, !!categories);
  const show = (k: keyof ProductFormValues) => (tried ? errs[k] : undefined);
  const set = <K extends keyof ProductFormValues>(k: K, value: ProductFormValues[K]) => setV((f) => ({ ...f, [k]: value }));

  const price = Number(v.basePrice) || 0;
  const taxable = v.isGstInclusive ? price / (1 + v.gstRate / 100) : price;
  const gst = v.isGstInclusive ? price - taxable : price * (v.gstRate / 100);
  const buyerPays = taxable + gst;
  const unitLabel = UNITS.find((u) => u.value === v.unit)?.label ?? v.unit.toLowerCase();

  function submit(asDraft: boolean) {
    setTried(true);
    if (Object.keys(errs).length > 0) return;
    onSubmit(v, asDraft);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScreenHeader eyebrow={eyebrow} title={title} onBack={onBack} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Card title="What are you selling">
            <Field label="Product name" error={show('name')}>
              <Input value={v.name} onChangeText={(t) => set('name', t)} placeholder="e.g. UltraTech OPC 53 Grade Cement" error={!!show('name')} />
            </Field>
            {categories ? (
              <Field label="Category" error={show('categoryId')}>
                <View style={styles.chips}>
                  {categories.map((c) => (
                    <Chip key={c._id} label={c.name} on={v.categoryId === c._id} onPress={() => set('categoryId', c._id)} />
                  ))}
                </View>
              </Field>
            ) : null}
            <Field label="Description" error={show('description')}>
              <Input
                value={v.description}
                onChangeText={(t) => set('description', t)}
                placeholder="Grade, brand, size, where it is used"
                multiline
                error={!!show('description')}
                style={styles.textarea}
              />
            </Field>
            <Field label="One-line summary (optional)">
              <Input value={v.shortDescription} onChangeText={(t) => set('shortDescription', t)} placeholder="Shown in search results" maxLength={200} />
            </Field>
          </Card>

          <Card title="Price">
            <Field label="Sold per">
              <View style={styles.chips}>
                {UNITS.map((u) => <Chip key={u.value} label={u.label} on={v.unit === u.value} onPress={() => set('unit', u.value)} />)}
              </View>
            </Field>
            <Field label={`Price per ${unitLabel} (₹)`} error={show('basePrice')}>
              <Input value={v.basePrice} onChangeText={(t) => set('basePrice', t.replace(/[^\d.]/g, ''))} placeholder="0" keyboardType="decimal-pad" error={!!show('basePrice')} />
            </Field>
            <Field label="GST rate">
              <View style={styles.chips}>
                {GST_RATES.map((r) => <Chip key={r} label={`${r}%`} on={v.gstRate === r} onPress={() => set('gstRate', r)} />)}
              </View>
            </Field>
            <View style={styles.switchRow}>
              <View style={styles.flex}>
                <Text style={styles.switchTitle}>{v.isGstInclusive ? 'Price includes GST' : 'GST is added on top'}</Text>
                <Text style={styles.switchSub}>Buyers see the final price either way.</Text>
              </View>
              <Switch
                value={v.isGstInclusive}
                onValueChange={(on) => set('isGstInclusive', on)}
                trackColor={{ false: Colors.sand4, true: Colors.ink }}
                thumbColor={v.isGstInclusive ? Colors.lime : Colors.sand2}
                accessibilityLabel="Price includes GST"
              />
            </View>
            {price > 0 ? (
              <View style={styles.breakdown}>
                <Row label="Your price before GST" value={taxable} />
                <Row label={`GST ${v.gstRate}%`} value={gst} />
                <Row label={`Buyer pays per ${unitLabel}`} value={buyerPays} strong />
              </View>
            ) : null}
          </Card>

          <Card title="Stock and delivery">
            <View style={styles.row2}>
              <View style={styles.flex}>
                <Field label={`In stock (${unitLabel})`} error={show('stockQuantity')}>
                  <Input value={v.stockQuantity} onChangeText={(t) => set('stockQuantity', t.replace(/\D/g, ''))} placeholder="0" keyboardType="number-pad" error={!!show('stockQuantity')} />
                </Field>
              </View>
              <View style={styles.flex}>
                <Field label="Minimum order" error={show('minOrderQuantity')}>
                  <Input value={v.minOrderQuantity} onChangeText={(t) => set('minOrderQuantity', t.replace(/\D/g, ''))} keyboardType="number-pad" error={!!show('minOrderQuantity')} />
                </Field>
              </View>
            </View>
            <Field label="Days to deliver after an order" error={show('deliveryDays')}>
              <Input value={v.deliveryDays} onChangeText={(t) => set('deliveryDays', t.replace(/\D/g, ''))} keyboardType="number-pad" error={!!show('deliveryDays')} />
            </Field>
            {v.stockQuantity === '' || v.stockQuantity === '0' ? (
              <Text style={styles.hint}>With 0 in stock, buyers see the product as out of stock.</Text>
            ) : null}
            <Field label="Search words (optional)">
              <Input value={v.tags} onChangeText={(t) => set('tags', t)} placeholder="opc, 53 grade, ultratech" autoCapitalize="none" />
            </Field>
          </Card>

          {footer}
          {tried && Object.keys(errs).length > 0 ? <Notice tone="error">Fix the fields marked in red.</Notice> : null}
          {error ? <Notice tone="error" title="Not saved">{error}</Notice> : null}
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.bottom}>
          {draftLabel ? <Button title={draftLabel} variant="ghost" onPress={() => submit(true)} disabled={saving} style={styles.draft} /> : null}
          <Button title={submitLabel} variant="lime" onPress={() => submit(false)} loading={saving} style={styles.flex} />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Eyebrow>{title}</Eyebrow>
      {children}
    </View>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function Input({ error, style, ...props }: React.ComponentProps<typeof TextInput> & { error?: boolean }) {
  return <TextInput style={[styles.input, error && styles.inputError, style]} placeholderTextColor={Colors.stoneLight} {...props} />;
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, on && styles.chipOn]} onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <View style={styles.bRow}>
      <Text style={[styles.bLabel, strong && styles.bStrong]}>{label}</Text>
      <Text style={[styles.bValue, strong && styles.bStrong]}>₹{value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  card: { padding: 16, borderRadius: 20, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  field: { marginTop: 14 },
  label: { fontFamily: Font.semiBold, fontSize: 14, color: Colors.ink, marginBottom: 8 },
  error: { fontFamily: Font.regular, fontSize: 13, color: Colors.error, marginTop: 6 },
  hint: { fontFamily: Font.regular, fontSize: 13, color: Colors.stone, marginTop: 10 },
  input: { fontFamily: Font.regular, borderWidth: 1.5, borderColor: Colors.sand4, borderRadius: 14, backgroundColor: Colors.sand, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: Colors.ink },
  inputError: { borderColor: Colors.error },
  textarea: { minHeight: 96, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1, borderColor: Colors.sand4, backgroundColor: Colors.sand, justifyContent: 'center' },
  chipOn: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  chipText: { fontFamily: Font.semiBold, fontSize: 14, color: Colors.ink },
  chipTextOn: { color: Colors.sand },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  switchTitle: { fontFamily: Font.bold, fontSize: 15, color: Colors.ink },
  switchSub: { fontFamily: Font.regular, fontSize: 13, color: Colors.stone, marginTop: 2 },
  breakdown: { marginTop: 14, padding: 14, borderRadius: 14, backgroundColor: Colors.limeSoft, gap: 6 },
  bRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bLabel: { fontFamily: Font.regular, fontSize: 14, color: Colors.ink },
  bValue: { fontFamily: Font.semiBold, fontSize: 14, color: Colors.ink },
  bStrong: { fontFamily: Font.bold, fontSize: 15 },
  row2: { flexDirection: 'row', gap: 12 },
  bottom: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, backgroundColor: Colors.sand, borderTopWidth: 1, borderTopColor: Colors.sand4 },
  draft: { paddingHorizontal: 18 },
});

import type { FieldDef } from './types';

type SeedCategory = {
  handle: string;
  name: string;
  icon: string;
  position: number;
  fields: FieldDef[];
};

export const DEFAULT_CATEGORIES: SeedCategory[] = [
  {
    handle: 'grocery', name: 'Grocery', icon: '🛒', position: 1,
    fields: [
      { key: 'weight_grams', label: 'Weight (g)', kind: 'number', unit: 'g' },
      { key: 'volume_ml', label: 'Volume (ml)', kind: 'number', unit: 'ml' },
      { key: 'expiry_date', label: 'Expiry date', kind: 'date' },
      { key: 'brand', label: 'Brand', kind: 'text' },
      { key: 'is_chilled', label: 'Needs refrigeration', kind: 'boolean' },
    ],
  },
  {
    handle: 'clothes', name: 'Clothes', icon: '👕', position: 2,
    fields: [
      { key: 'size', label: 'Size', kind: 'select',
        options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], required: true },
      { key: 'color', label: 'Color', kind: 'text', required: true },
      { key: 'material', label: 'Material', kind: 'text' },
      { key: 'gender', label: 'Gender', kind: 'select',
        options: ['mens', 'womens', 'kids', 'unisex'] },
    ],
  },
  {
    handle: 'pharmacy', name: 'Pharmacy', icon: '💊', position: 3,
    fields: [
      { key: 'active_ingredient', label: 'Active ingredient', kind: 'text', required: true },
      { key: 'dosage', label: 'Dosage', kind: 'text', help: 'e.g. 500mg' },
      { key: 'expiry_date', label: 'Expiry date', kind: 'date', required: true },
      { key: 'prescription_required', label: 'Prescription required', kind: 'boolean' },
    ],
  },
  {
    handle: 'salon', name: 'Salon / Service', icon: '💇', position: 4,
    fields: [
      { key: 'service_duration_minutes', label: 'Duration (min)', kind: 'number', required: true },
      { key: 'staff_required', label: 'Staff required', kind: 'number' },
    ],
  },
  {
    handle: 'restaurant', name: 'Restaurant', icon: '🍽️', position: 5,
    fields: [
      { key: 'prep_time_minutes', label: 'Prep time (min)', kind: 'number' },
      { key: 'is_vegetarian', label: 'Vegetarian', kind: 'boolean' },
      { key: 'spice_level', label: 'Spice', kind: 'select',
        options: ['none', 'mild', 'medium', 'hot', 'extra_hot'] },
    ],
  },
  {
    handle: 'other', name: 'Other', icon: '📦', position: 99,
    fields: [
      { key: 'notes', label: 'Notes', kind: 'textarea' },
    ],
  },
];

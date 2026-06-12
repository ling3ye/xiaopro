/**
 * Filament Spec Utilities
 *
 * Rendering helpers for the canonical filament spec system.
 * Used by filament pages, comparison page, and Card component.
 */

import { specLabels } from './spec-labels';
import { specPropertyMeta, specGroupOrder, specGroupLabels, type FilamentSpecId, type SpecGroup } from './spec-registry';
import type { SupportedLocale } from '../../i18n/config';

// ============================================================
// Types
// ============================================================

export interface PropertyValue {
  value: number | string | boolean;
  value_zh?: string;
  unit?: string;
  standard?: string;
  test_method?: string;
  condition?: string;
}

export type FilamentProperties = Record<string, PropertyValue>;

export interface GroupedProperties {
  group: SpecGroup;
  label: string;
  properties: { id: FilamentSpecId; prop: PropertyValue }[];
}

// ============================================================
// Display helpers
// ============================================================

/**
 * Get the display value for a property in the given locale.
 * - Numeric values: returns "{value} {unit}" (locale-independent)
 * - Qualitative values: uses value_zh if Chinese locale, else value
 */
export function getDisplayValue(prop: PropertyValue, locale: SupportedLocale): string {
  const raw = prop.value;
  if (typeof raw === 'number') {
    const unit = prop.unit ? ` ${prop.unit}` : '';
    const condition = prop.condition ? ` (${prop.condition})` : '';
    return `${raw}${unit}${condition}`;
  }
  if (typeof raw === 'boolean') {
    return raw ? '✓' : '✗';
  }
  // String value: check if Chinese locale and value_zh exists
  const isChinese = locale === 'zh-cn' || locale === 'zh-tw';
  const base = isChinese && prop.value_zh ? prop.value_zh : String(raw);
  // Append unit and condition for string values too (e.g. "1.17 - 1.24 g/cm³")
  const unit = prop.unit ? ` ${prop.unit}` : '';
  const condition = prop.condition ? ` (${prop.condition})` : '';
  return `${base}${unit}${condition}`;
}

/**
 * Get the display label for a canonical spec ID in the given locale.
 * Falls back to English, then to the raw ID string.
 */
export function getSpecLabel(id: FilamentSpecId, locale: SupportedLocale): string {
  const labels = specLabels[id as keyof typeof specLabels];
  if (!labels) return id;
  return labels[locale] || labels['en'] || id;
}

/**
 * Extract a numeric value from a property for comparison highlighting.
 * Returns null for non-numeric properties.
 */
export function getNumericValue(prop: PropertyValue): number | null {
  if (typeof prop.value === 'number') return prop.value;
  // Try to parse string values like "53.34 MPa" or "3.5-4.5"
  if (typeof prop.value === 'string') {
    const m = prop.value.match(/([-+]?[\d.]+)/);
    return m ? parseFloat(m[1]) : null;
  }
  return null;
}

// ============================================================
// Ordering / grouping
// ============================================================

/**
 * Get property IDs sorted by display priority (for Card component preview).
 * Returns the first N properties that exist in the filament's data and have metadata.
 */
export function getTopProperties(
  properties: FilamentProperties,
  count: number = 3
): FilamentSpecId[] {
  return (Object.keys(properties) as FilamentSpecId[])
    .filter(id => id in specPropertyMeta)
    .sort((a, b) => specPropertyMeta[a].priority - specPropertyMeta[b].priority)
    .slice(0, count);
}

/**
 * Get properties grouped and sorted for detail page display.
 * Each group has a localized label and sorted property entries.
 */
export function getGroupedProperties(
  properties: FilamentProperties,
  locale: SupportedLocale
): GroupedProperties[] {
  const groups: Record<SpecGroup, { id: FilamentSpecId; prop: PropertyValue }[]> = {
    basic: [],
    thermal: [],
    mechanical: [],
    practical: [],
  };

  for (const [id, prop] of Object.entries(properties)) {
    const meta = specPropertyMeta[id as FilamentSpecId];
    if (meta) {
      groups[meta.group].push({ id: id as FilamentSpecId, prop });
    }
  }

  // Sort within each group by priority
  for (const group of Object.values(groups)) {
    group.sort((a, b) => specPropertyMeta[a.id].priority - specPropertyMeta[b.id].priority);
  }

  // Return non-empty groups in display order
  return specGroupOrder
    .filter(g => groups[g].length > 0)
    .map(g => ({
      group: g,
      label: specGroupLabels[g][locale] || specGroupLabels[g]['en'] || g,
      properties: groups[g],
    }));
}

/**
 * Get all canonical IDs present across multiple filaments, sorted by priority.
 * Used by the comparison page to build aligned table rows.
 */
export function getCompareIds(
  allProperties: FilamentProperties[]
): FilamentSpecId[] {
  const idSet = new Set<FilamentSpecId>();
  for (const props of allProperties) {
    for (const id of Object.keys(props)) {
      if (id in specPropertyMeta) {
        idSet.add(id as FilamentSpecId);
      }
    }
  }
  return Array.from(idSet).sort(
    (a, b) => specPropertyMeta[a].priority - specPropertyMeta[b].priority
  );
}

/**
 * Build a simple Record<string, string> for Card component compatibility.
 * Uses top N priority properties with localized labels and values.
 */
export function buildCardSpecs(
  properties: FilamentProperties,
  locale: SupportedLocale,
  count: number = 3
): Record<string, string> {
  const topIds = getTopProperties(properties, count);
  const result: Record<string, string> = {};
  for (const id of topIds) {
    result[getSpecLabel(id, locale)] = getDisplayValue(properties[id], locale);
  }
  return result;
}

/**
 * Filament Spec Registry
 *
 * Single source of truth for all canonical filament property IDs,
 * their metadata, display ordering, and comparison behavior.
 */

// ============================================================
// Canonical Property IDs
// ============================================================

export type FilamentSpecId =
  // -- Basic --
  | 'material_type'
  | 'diameter'
  | 'density'
  | 'melt_flow_index'
  | 'printability'
  | 'moisture_sensitivity'
  | 'available_colors'
  | 'spool_weight'
  | 'eco_friendly'
  | 'advantage'
  // -- Thermal --
  | 'heat_deflection_temperature'
  | 'glass_transition_temperature'
  | 'vicat_softening_temperature'
  | 'melting_temperature'
  | 'crystallization_temperature'
  | 'print_temperature'
  | 'bed_temperature'
  // -- Mechanical (XY direction) --
  | 'tensile_strength_xy'
  | 'flexural_strength_xy'
  | 'flexural_modulus_xy'
  | 'elongation_at_break_xy'
  | 'impact_strength_xy'
  | 'youngs_modulus_xy'
  // -- Mechanical (Z direction) --
  | 'tensile_strength_z'
  | 'flexural_strength_z'
  | 'flexural_modulus_z'
  | 'elongation_at_break_z'
  | 'impact_strength_z'
  // -- Non-directional --
  | 'tensile_strength'
  | 'elongation_at_break'
  // -- Other mechanical --
  | 'toughness'
  | 'layer_adhesion';

// ============================================================
// Property Metadata
// ============================================================

export type SpecGroup = 'basic' | 'thermal' | 'mechanical' | 'practical';

export interface SpecPropertyMeta {
  id: FilamentSpecId;
  group: SpecGroup;
  /** Lower = more important. Controls Card preview ordering and detail page sort. */
  priority: number;
  /** Whether this property should show best-value highlighting in comparison table. */
  comparable: boolean;
  /** For numeric comparison, which direction is "better". */
  highlightDirection: 'higher_is_better' | 'lower_is_better' | 'neutral';
}

/**
 * Complete metadata for all canonical spec properties.
 *
 * Priority guide:
 *   1-10   → shown in Card preview (top 3)
 *   11-20  → important but secondary
 *   21-50  → detail page only
 */
export const specPropertyMeta: Record<FilamentSpecId, SpecPropertyMeta> = {
  // -- Basic --
  material_type: {
    id: 'material_type',
    group: 'basic',
    priority: 1,
    comparable: false,
    highlightDirection: 'neutral',
  },
  diameter: {
    id: 'diameter',
    group: 'basic',
    priority: 2,
    comparable: false,
    highlightDirection: 'neutral',
  },
  density: {
    id: 'density',
    group: 'basic',
    priority: 3,
    comparable: true,
    highlightDirection: 'lower_is_better',
  },
  melt_flow_index: {
    id: 'melt_flow_index',
    group: 'basic',
    priority: 21,
    comparable: false,
    highlightDirection: 'neutral',
  },
  printability: {
    id: 'printability',
    group: 'basic',
    priority: 4,
    comparable: false,
    highlightDirection: 'neutral',
  },
  moisture_sensitivity: {
    id: 'moisture_sensitivity',
    group: 'basic',
    priority: 5,
    comparable: false,
    highlightDirection: 'neutral',
  },
  available_colors: {
    id: 'available_colors',
    group: 'basic',
    priority: 22,
    comparable: false,
    highlightDirection: 'neutral',
  },
  spool_weight: {
    id: 'spool_weight',
    group: 'basic',
    priority: 23,
    comparable: false,
    highlightDirection: 'neutral',
  },
  eco_friendly: {
    id: 'eco_friendly',
    group: 'basic',
    priority: 24,
    comparable: false,
    highlightDirection: 'neutral',
  },
  advantage: {
    id: 'advantage',
    group: 'basic',
    priority: 25,
    comparable: false,
    highlightDirection: 'neutral',
  },

  // -- Thermal --
  heat_deflection_temperature: {
    id: 'heat_deflection_temperature',
    group: 'thermal',
    priority: 11,
    comparable: true,
    highlightDirection: 'higher_is_better',
  },
  glass_transition_temperature: {
    id: 'glass_transition_temperature',
    group: 'thermal',
    priority: 12,
    comparable: true,
    highlightDirection: 'higher_is_better',
  },
  vicat_softening_temperature: {
    id: 'vicat_softening_temperature',
    group: 'thermal',
    priority: 13,
    comparable: true,
    highlightDirection: 'higher_is_better',
  },
  melting_temperature: {
    id: 'melting_temperature',
    group: 'thermal',
    priority: 14,
    comparable: false,
    highlightDirection: 'neutral',
  },
  crystallization_temperature: {
    id: 'crystallization_temperature',
    group: 'thermal',
    priority: 15,
    comparable: false,
    highlightDirection: 'neutral',
  },
  print_temperature: {
    id: 'print_temperature',
    group: 'thermal',
    priority: 16,
    comparable: false,
    highlightDirection: 'neutral',
  },
  bed_temperature: {
    id: 'bed_temperature',
    group: 'thermal',
    priority: 17,
    comparable: false,
    highlightDirection: 'neutral',
  },

  // -- Mechanical (XY) --
  tensile_strength_xy: {
    id: 'tensile_strength_xy',
    group: 'mechanical',
    priority: 6,
    comparable: true,
    highlightDirection: 'higher_is_better',
  },
  flexural_strength_xy: {
    id: 'flexural_strength_xy',
    group: 'mechanical',
    priority: 8,
    comparable: true,
    highlightDirection: 'higher_is_better',
  },
  flexural_modulus_xy: {
    id: 'flexural_modulus_xy',
    group: 'mechanical',
    priority: 9,
    comparable: true,
    highlightDirection: 'higher_is_better',
  },
  elongation_at_break_xy: {
    id: 'elongation_at_break_xy',
    group: 'mechanical',
    priority: 10,
    comparable: true,
    highlightDirection: 'higher_is_better',
  },
  impact_strength_xy: {
    id: 'impact_strength_xy',
    group: 'mechanical',
    priority: 7,
    comparable: true,
    highlightDirection: 'higher_is_better',
  },
  youngs_modulus_xy: {
    id: 'youngs_modulus_xy',
    group: 'mechanical',
    priority: 18,
    comparable: true,
    highlightDirection: 'higher_is_better',
  },

  // -- Mechanical (Z) --
  tensile_strength_z: {
    id: 'tensile_strength_z',
    group: 'mechanical',
    priority: 26,
    comparable: true,
    highlightDirection: 'higher_is_better',
  },
  flexural_strength_z: {
    id: 'flexural_strength_z',
    group: 'mechanical',
    priority: 27,
    comparable: true,
    highlightDirection: 'higher_is_better',
  },
  flexural_modulus_z: {
    id: 'flexural_modulus_z',
    group: 'mechanical',
    priority: 28,
    comparable: true,
    highlightDirection: 'higher_is_better',
  },
  elongation_at_break_z: {
    id: 'elongation_at_break_z',
    group: 'mechanical',
    priority: 29,
    comparable: true,
    highlightDirection: 'higher_is_better',
  },
  impact_strength_z: {
    id: 'impact_strength_z',
    group: 'mechanical',
    priority: 30,
    comparable: true,
    highlightDirection: 'higher_is_better',
  },

  // -- Non-directional --
  tensile_strength: {
    id: 'tensile_strength',
    group: 'mechanical',
    priority: 6,
    comparable: true,
    highlightDirection: 'higher_is_better',
  },
  elongation_at_break: {
    id: 'elongation_at_break',
    group: 'mechanical',
    priority: 10,
    comparable: true,
    highlightDirection: 'higher_is_better',
  },

  // -- Other mechanical --
  toughness: {
    id: 'toughness',
    group: 'mechanical',
    priority: 7,
    comparable: true,
    highlightDirection: 'higher_is_better',
  },
  layer_adhesion: {
    id: 'layer_adhesion',
    group: 'mechanical',
    priority: 19,
    comparable: true,
    highlightDirection: 'higher_is_better',
  },
};

// ============================================================
// Group display labels (for detail page section headers)
// ============================================================

export const specGroupOrder: SpecGroup[] = ['basic', 'thermal', 'mechanical', 'practical'];

export const specGroupLabels: Record<SpecGroup, Record<string, string>> = {
  basic: {
    'zh-cn': '基本信息',
    'zh-tw': '基本資訊',
    'en': 'Basic Info',
    'ja': '基本情報',
    'ko': '기본 정보',
    'es': 'Información básica',
    'de': 'Grundinformationen',
    'fr': 'Informations de base',
    'it': 'Informazioni di base',
  },
  thermal: {
    'zh-cn': '热学性能',
    'zh-tw': '熱學性能',
    'en': 'Thermal Properties',
    'ja': '熱的特性',
    'ko': '열적 특성',
    'es': 'Propiedades térmicas',
    'de': 'Thermische Eigenschaften',
    'fr': 'Propriétés thermiques',
    'it': 'Proprietà termiche',
  },
  mechanical: {
    'zh-cn': '力学性能',
    'zh-tw': '力學性能',
    'en': 'Mechanical Properties',
    'ja': '機械的特性',
    'ko': '기계적 특성',
    'es': 'Propiedades mecánicas',
    'de': 'Mechanische Eigenschaften',
    'fr': 'Propriétés mécaniques',
    'it': 'Proprietà meccaniche',
  },
  practical: {
    'zh-cn': '实用信息',
    'zh-tw': '實用資訊',
    'en': 'Practical Info',
    'ja': '実用情報',
    'ko': '실용 정보',
    'es': 'Información práctica',
    'de': 'Praktische Informationen',
    'fr': 'Informations pratiques',
    'it': 'Informazioni pratiche',
  },
};

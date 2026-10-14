// Kleur- en badge-mapping voor de content-kalender (feature 023).
// Volledige Tailwind-klasse-strings per kleur-key (PurgeCSS-veilig: geen
// dynamische klassen-namen), met dark:-varianten.

import type { ContentStatus, PillarColor } from '@/types/database.types'

export const PILLAR_COLOR_KEYS: PillarColor[] = ['blue', 'green', 'orange', 'purple', 'pink', 'yellow', 'teal', 'gray']

export interface PillarColorClasses {
  /** Gevulde kleurstreep / dot op een post-chip */
  dot: string
  /** Gestippeld kader + tekst van een leeg slot */
  slotBorder: string
  /** Kleurstaal in de beheer-dialog en editor */
  swatch: string
  /** Actieve kleurstaal */
  swatchActive: string
}

export const pillarColors: Record<PillarColor, PillarColorClasses> = {
  blue: {
    dot: 'bg-blue-500 dark:bg-blue-400',
    slotBorder: 'border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300',
    swatch: 'bg-blue-500',
    swatchActive: 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-background',
  },
  green: {
    dot: 'bg-green-500 dark:bg-green-400',
    slotBorder: 'border-green-400 dark:border-green-500 text-green-700 dark:text-green-300',
    swatch: 'bg-green-500',
    swatchActive: 'ring-2 ring-offset-2 ring-green-500 dark:ring-offset-background',
  },
  orange: {
    dot: 'bg-orange-500 dark:bg-orange-400',
    slotBorder: 'border-orange-400 dark:border-orange-500 text-orange-700 dark:text-orange-300',
    swatch: 'bg-orange-500',
    swatchActive: 'ring-2 ring-offset-2 ring-orange-500 dark:ring-offset-background',
  },
  purple: {
    dot: 'bg-purple-500 dark:bg-purple-400',
    slotBorder: 'border-purple-400 dark:border-purple-500 text-purple-700 dark:text-purple-300',
    swatch: 'bg-purple-500',
    swatchActive: 'ring-2 ring-offset-2 ring-purple-500 dark:ring-offset-background',
  },
  pink: {
    dot: 'bg-pink-500 dark:bg-pink-400',
    slotBorder: 'border-pink-400 dark:border-pink-500 text-pink-700 dark:text-pink-300',
    swatch: 'bg-pink-500',
    swatchActive: 'ring-2 ring-offset-2 ring-pink-500 dark:ring-offset-background',
  },
  yellow: {
    dot: 'bg-yellow-500 dark:bg-yellow-400',
    slotBorder: 'border-yellow-400 dark:border-yellow-500 text-yellow-700 dark:text-yellow-300',
    swatch: 'bg-yellow-500',
    swatchActive: 'ring-2 ring-offset-2 ring-yellow-500 dark:ring-offset-background',
  },
  teal: {
    dot: 'bg-teal-500 dark:bg-teal-400',
    slotBorder: 'border-teal-400 dark:border-teal-500 text-teal-700 dark:text-teal-300',
    swatch: 'bg-teal-500',
    swatchActive: 'ring-2 ring-offset-2 ring-teal-500 dark:ring-offset-background',
  },
  gray: {
    dot: 'bg-gray-400 dark:bg-gray-500',
    slotBorder: 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400',
    swatch: 'bg-gray-400',
    swatchActive: 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-background',
  },
}

// Statusbadges: idee grijs, concept geel, klaar blauw, gepland paars, live groen
export function statusBadgeClasses(status: ContentStatus): string {
  switch (status) {
    case 'idee':
      return 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    case 'concept':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
    case 'klaar':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
    case 'gepland':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
    case 'live':
      return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
  }
}
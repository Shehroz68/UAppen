/**
 * Maps Engage / Athletics category strings onto the main filter categories.
 */

const categoryMapping: Record<string, string> = {
  'Auditions/tryouts': 'Arts and Music',
  Coffeehouse: 'Arts and Music',
  Comedy: 'Arts and Music',
  Concert: 'Arts and Music',
  'Dance Party': 'Arts and Music',
  'Display/exhibit': 'Arts and Music',
  Movie: 'Arts and Music',
  Music: 'Arts and Music',
  Performance: 'Arts and Music',
  'Rehearsal/Practice': 'Arts and Music',
  'Athletic Activity': 'Athletics',
  Tournament: 'Athletics',
  'Community Service': 'Service',
  'Faith-based service': 'Service',
  'Cultural-based': 'Cultural',
  'Fair/festival/carnival': 'Cultural',
  Fundraiser: 'Fundraising',
  Meeting: 'Group Business',
  Banquet: 'Social',
  'BBQ/Picnic/Potluck': 'Social',
  'Open House': 'Social',
  Reception: 'Social',
  Conference: 'Learning',
  Education: 'Learning',
  'Health and Wellness': 'Learning',
  Speaker: 'Learning',
  'Training/workshop': 'Learning',
};

const multiCategoryMapping: Record<string, string[]> = {
  'Auditions/tryouts': ['Arts and Music', 'Athletics'],
  'Rehearsal/Practice': ['Arts and Music', 'Athletics'],
  Coffeehouse: ['Arts and Music', 'Social'],
  'Dance Party': ['Arts and Music', 'Social'],
  'Display/exhibit': ['Arts and Music', 'Cultural'],
  Movie: ['Arts and Music', 'Social'],
  Performance: ['Arts and Music', 'Cultural'],
  'Fair/festival/carnival': ['Cultural', 'Social'],
  'Open House': ['Social', 'Learning'],
  'Faith-based service': ['Service', 'Spirituality'],
};

export const mapToMainCategory = (
  scrapedCategory: string,
  preferredCategory?: string
): string | null => {
  const normalized = scrapedCategory.trim();

  if (/^athletics(\s*[·|\-].*)?$/i.test(normalized)) {
    return 'Athletics';
  }

  if (categoryMapping[normalized]) {
    return categoryMapping[normalized];
  }

  if (multiCategoryMapping[normalized]) {
    if (preferredCategory && multiCategoryMapping[normalized].includes(preferredCategory)) {
      return preferredCategory;
    }
    return multiCategoryMapping[normalized][0];
  }

  return 'Other';
};

/** Pull sport label from "Athletics - Football" style categories. */
export const getSportLabel = (category?: string | null): string | null => {
  if (!category) return null;
  const match = category.match(/^Athletics\s*[·|\-]\s*(.+)$/i);
  return match ? match[1].trim() : null;
};

export const filterEventsByCategories = <T extends { category?: string | null }>(
  events: T[],
  selectedCategories: string[]
): T[] => {
  if (selectedCategories.length === 0) {
    return events;
  }

  return events.filter((event) => {
    if (!event.category || event.category.trim() === '') {
      return selectedCategories.includes('Other');
    }
    const mainCategory = mapToMainCategory(event.category);
    return !!mainCategory && selectedCategories.includes(mainCategory);
  });
};

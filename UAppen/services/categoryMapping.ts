// Mapping from scraped event categories to main event categories
// Some categories may map to multiple main categories - we use the first match

export const categoryMapping: Record<string, string> = {
    // Arts and Music
    'Auditions/tryouts': 'Arts and Music',
    'Coffeehouse': 'Arts and Music',
    'Comedy': 'Arts and Music',
    'Concert': 'Arts and Music',
    'Dance Party': 'Arts and Music',
    'Display/exhibit': 'Arts and Music',
    'Movie': 'Arts and Music',
    'Music': 'Arts and Music',
    'Performance': 'Arts and Music',
    'Rehearsal/Practice': 'Arts and Music',
    
    // Athletics
    'Athletic Activity': 'Athletics',
    'Tournament': 'Athletics',
    
    // Service
    'Community Service': 'Service',
    'Faith-based service': 'Service',
    
    // Cultural
    'Cultural-based': 'Cultural',
    'Fair/festival/carnival': 'Cultural',
    
    // Fundraising
    'Fundraiser': 'Fundraising',
    
    // Group Business
    'Meeting': 'Group Business',
    
    // Social
    'Banquet': 'Social',
    'BBQ/Picnic/Potluck': 'Social',
    'Open House': 'Social',
    'Reception': 'Social',
    
    // Spirituality
    // Note: 'Faith-based service' is mapped to Service, but could also be Spirituality
    // We'll handle this as a special case
    
    // Learning
    'Conference': 'Learning',
    'Education': 'Learning',
    'Health and Wellness': 'Learning',
    'Speaker': 'Learning',
    'Training/workshop': 'Learning',
  };
  
  // Categories that can map to multiple main categories
  // We'll use a priority system - check in order
  export const multiCategoryMapping: Record<string, string[]> = {
    'Auditions/tryouts': ['Arts and Music', 'Athletics'],
    'Rehearsal/Practice': ['Arts and Music', 'Athletics'],
    'Coffeehouse': ['Arts and Music', 'Social'],
    'Dance Party': ['Arts and Music', 'Social'],
    'Display/exhibit': ['Arts and Music', 'Cultural'],
    'Movie': ['Arts and Music', 'Social'],
    'Performance': ['Arts and Music', 'Cultural'],
    'Fair/festival/carnival': ['Cultural', 'Social'],
    'Open House': ['Social', 'Learning'],
    'Faith-based service': ['Service', 'Spirituality'],
  };
  
  /**
   * Maps a scraped category to one of the main event categories
   * @param scrapedCategory - The category from the scraped JSON
   * @param preferredCategory - Optional preferred main category if the scraped category maps to multiple
   * @returns The main event category or null if no mapping found
   */
  export const mapToMainCategory = (
    scrapedCategory: string,
    preferredCategory?: string
  ): string | null => {
    // Normalize the category (trim, handle case)
    const normalized = scrapedCategory.trim();
    
    // Check if it's in the simple mapping first
    if (categoryMapping[normalized]) {
      return categoryMapping[normalized];
    }
    
    // Check if it's in the multi-category mapping
    if (multiCategoryMapping[normalized]) {
      // If preferred category is provided and it's in the list, use it
      if (preferredCategory && multiCategoryMapping[normalized].includes(preferredCategory)) {
        return preferredCategory;
      }
      // Otherwise, return the first category (default priority)
      return multiCategoryMapping[normalized][0];
    }
    
    // No mapping found - return "Other" for unmapped categories
    return 'Other';
  };
  
  /**
   * Gets all possible main categories for a scraped category
   * @param scrapedCategory - The category from the scraped JSON
   * @returns Array of possible main categories
   */
  export const getPossibleCategories = (scrapedCategory: string): string[] => {
    const normalized = scrapedCategory.trim();
    
    // Check multi-category mapping first
    if (multiCategoryMapping[normalized]) {
      return multiCategoryMapping[normalized];
    }
    
    // Check simple mapping
    if (categoryMapping[normalized]) {
      return [categoryMapping[normalized]];
    }
    
    return [];
  };
  
  /**
   * Filters events based on selected main categories
   * @param events - Array of events with a 'category' property
   * @param selectedCategories - Array of selected main category names
   * @returns Filtered array of events
   */
  export const filterEventsByCategories = (
    events: { category: string; [key: string]: any }[],
    selectedCategories: string[]
  ): { category: string; [key: string]: any }[] => {
    if (selectedCategories.length === 0) {
      return events; // Return all events if no filter selected
    }
    
    return events.filter(event => {
      // Handle events without categories or with empty/null categories
      if (!event.category || event.category.trim() === '') {
        return selectedCategories.includes('Other');
      }
      const mainCategory = mapToMainCategory(event.category);
      return mainCategory && selectedCategories.includes(mainCategory);
    });
  };
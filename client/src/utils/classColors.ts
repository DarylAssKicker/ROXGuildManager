// Class color utility functions

// Class color mapping - default color configuration
const defaultClassColors: { [key: string]: string } = {
  'Swordsman': '#ff6b6b',
  'Mage': '#4ecdc4', 
  'Archer': '#45b7d1',
  'Acolyte': '#96ceb4',
  'Merchant': '#feca57',
  'Thief': '#ff9ff3',
  'Knight': '#54a0ff',
  'Monk': '#5f27cd',
  'Sage': '#00d2d3',
  'Blacksmith': '#ff6348',
  'Hunter': '#2ed573',
  'Assassin': '#a55eea',
  'Crusader': '#26de81',
  'Bard': '#fd79a8',
  'Dancer': '#fdcb6e',
  'Ninja': '#6c5ce7',
  'Spearman': '#fd79a8',
  'High Wizard': '#00b894',
  'Sniper': '#e17055',
  'High Priest': '#74b9ff',
  'Lord Knight': '#fd79a8',
  'Assassin Cross': '#fdcb6e',
  'Creator': '#6c5ce7',
  'Gypsy': '#fd79a8',
  'Ninja Master': '#00b894',
  'Taekwon': '#e17055',
  'Star Gladiator': '#74b9ff',
  'Flying Side Kick': '#fd79a8',
  'Champion': '#fdcb6e'
};

/**
 * Get color by class name
 * @param className Class name
 * @param classes Class configuration array (optional)
 * @returns Color value with transparency
 */
export const getClassColor = (className: string, classes?: {id: string, name: string, color?: string}[]): string => {
  // If class configuration array is provided, use it first
  if (classes && classes.length > 0) {
    const classInfo = classes.find(c => c.name === className);
    if (classInfo?.color) {
      return classInfo.color + '40'; // Add transparency
    }
  }
  
  // Use default color mapping
  const color = defaultClassColors[className] || '#f0f0f0'; // Default light gray
  return color + '40'; // Add transparency
};

/**
 * Get full color of class (without transparency)
 * @param className Class name
 * @param classes Class configuration array (optional)
 * @returns Full color value
 */
export const getClassFullColor = (className: string, classes?: {id: string, name: string, color?: string}[]): string => {
  // If class configuration array is provided, use it first
  if (classes && classes.length > 0) {
    const classInfo = classes.find(c => c.name === className);
    if (classInfo?.color) {
      return classInfo.color;
    }
  }
  
  // Use default color mapping
  return defaultClassColors[className] || '#f0f0f0'; // Default light gray
};
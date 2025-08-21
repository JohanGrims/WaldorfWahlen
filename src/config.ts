// Configuration loader for multi-school setup
export interface SchoolConfig {
  school: {
    id: string;
    name: string;
    shortName: string;
    logo: string;
    favicon: string;
    primaryColor: string;
    secondaryColor: string;
    contactEmail: string;
    website: string;
    address: {
      street: string;
      city: string;
      country: string;
    };
  };
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
  };
  appCheck: {
    siteKey: string;
  };
  features: {
    proposals: boolean;
    feedback: boolean;
    analytics: boolean;
    email: boolean;
  };
  ui: {
    theme: string;
    language: string;
    title: string;
    welcomeMessage: string;
    footerText: string;
  };
}

// Import all configurations statically
import waldorfwahlenConfig from '../configs/waldorfwahlen.json';
import school1Config from '../configs/school1.json';
import school2Config from '../configs/school2.json';

// Configuration registry
const configRegistry: Record<string, any> = {
  'waldorfwahlen': waldorfwahlenConfig,
  'school1': school1Config,
  'school2': school2Config,
};

// Get school ID from environment variable or default to 'waldorfwahlen'
const getSchoolId = (): string => {
  return import.meta.env.VITE_SCHOOL_ID || 'waldorfwahlen';
};

// Load configuration for current school
export const loadSchoolConfig = (): SchoolConfig => {
  const schoolId = getSchoolId();
  
  try {
    const config = configRegistry[schoolId];
    if (!config) {
      console.warn(`Configuration not found for school: ${schoolId}, falling back to waldorfwahlen`);
      return replaceTemplateVariables(waldorfwahlenConfig);
    }
    
    // Replace template variables
    const replacedConfig = replaceTemplateVariables(config);
    
    return replacedConfig;
  } catch (error) {
    console.error(`Failed to load config for school: ${schoolId}`, error);
    // Fallback to default config
    return replaceTemplateVariables(waldorfwahlenConfig);
  }
};

// Replace template variables like {{schoolName}} with actual values
const replaceTemplateVariables = (config: any): SchoolConfig => {
  const configStr = JSON.stringify(config);
  const replacedStr = configStr
    .replace(/\{\{schoolName\}\}/g, config.school.name)
    .replace(/\{\{schoolShortName\}\}/g, config.school.shortName)
    .replace(/\{\{schoolId\}\}/g, config.school.id);
  
  return JSON.parse(replacedStr);
};

// Global config instance
let globalConfig: SchoolConfig | null = null;

// Get current school configuration
export const getSchoolConfig = (): SchoolConfig => {
  if (!globalConfig) {
    globalConfig = loadSchoolConfig();
  }
  return globalConfig;
};

// Initialize configuration (synchronous for compatibility)
export const initializeConfig = (): SchoolConfig => {
  return getSchoolConfig();
};
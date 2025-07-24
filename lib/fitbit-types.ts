// Fitbit API response types and interfaces

export interface FitbitTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface FitbitUser {
  encodedId: string;
  displayName: string;
  locale: string;
  timezone: string;
}

export interface FitbitActivitySummary {
  activities: Array<{
    activityId: number;
    activityParentId?: number;
    activityName: string;
    description: string;
    distance: number;
    duration: number;
    hasStartTime: boolean;
    isFavorite: boolean;
    logId: number;
    name: string;
    startTime: string;
    startDate: string;
    steps: number;
    calories: number;
    averageHeartRate?: number;
    heartRateZones?: Array<{
      caloriesOut: number;
      max: number;
      min: number;
      minutes: number;
      name: string;
    }>;
  }>;
  goals: {
    activeMinutes: number;
    caloriesOut: number;
    distance: number;
    floors: number;
    steps: number;
  };
  summary: {
    activeScore: number;
    activityCalories: number;
    caloriesBMR: number;
    caloriesOut: number;
    distances: Array<{
      activity: string;
      distance: number;
    }>;
    elevation: number;
    fairlyActiveMinutes: number;
    floors: number;
    lightlyActiveMinutes: number;
    marginalCalories: number;
    sedentaryMinutes: number;
    steps: number;
    veryActiveMinutes: number;
  };
}

export interface FitbitSleepData {
  sleep: Array<{
    dateOfSleep: string;
    duration: number;
    efficiency: number;
    endTime: string;
    infoCode: number;
    isMainSleep: boolean;
    levels: {
      data: Array<{
        dateTime: string;
        level: 'wake' | 'light' | 'deep' | 'rem';
        seconds: number;
      }>;
      summary: {
        deep: { count: number; minutes: number; thirtyDayAverage: number };
        light: { count: number; minutes: number; thirtyDayAverage: number };
        rem: { count: number; minutes: number; thirtyDayAverage: number };
        wake: { count: number; minutes: number; thirtyDayAverage: number };
      };
    };
    logId: number;
    minutesAfterWakeup: number;
    minutesAsleep: number;
    minutesAwake: number;
    minutesToFallAsleep: number;
    startTime: string;
    timeInBed: number;
    type: 'stages' | 'classic';
  }>;
  summary: {
    stages: {
      deep: number;
      light: number;
      rem: number;
      wake: number;
    };
    totalMinutesAsleep: number;
    totalSleepRecords: number;
    totalTimeInBed: number;
  };
}

export interface FitbitHeartRateData {
  'activities-heart': Array<{
    dateTime: string;
    value: {
      customHeartRateZones: any[];
      heartRateZones: Array<{
        caloriesOut: number;
        max: number;
        min: number;
        minutes: number;
        name: string;
      }>;
      restingHeartRate?: number;
    };
  }>;
}

export interface FitbitIntradayHeartRate {
  'activities-heart-intraday': {
    dataset: Array<{
      time: string;
      value: number;
    }>;
    datasetInterval: number;
    datasetType: string;
  };
}

// Unified data transformation interfaces (matching existing wearable service types)
export interface UnifiedFitbitRecoveryData {
  date: string;
  recovery_score?: number;
  hrv_rmssd?: number;
  resting_heart_rate?: number;
  body_temperature?: number;
  skin_temp?: number;
  spo2?: number;
  sleep_performance?: number;
  strain?: number;
  provider: 'fitbit';
  raw_data: any;
}

export interface UnifiedFitbitSleepData {
  date: string;
  sleep_start?: string;
  sleep_end?: string;
  total_sleep_duration?: number; // minutes
  deep_sleep_duration?: number; // minutes
  rem_sleep_duration?: number; // minutes
  light_sleep_duration?: number; // minutes
  awake_duration?: number; // minutes
  sleep_efficiency?: number; // percentage
  sleep_score?: number;
  sleep_onset_latency?: number; // minutes
  wake_count?: number;
  average_heart_rate?: number;
  lowest_heart_rate?: number;
  average_hrv?: number;
  provider: 'fitbit';
  raw_data: any;
}

export interface UnifiedFitbitActivityData {
  activity_id?: string;
  activity_type?: string;
  sport_type?: string;
  start_time?: string;
  end_time?: string;
  duration?: number; // seconds
  distance?: number; // meters
  calories?: number;
  average_heart_rate?: number;
  max_heart_rate?: number;
  strain?: number;
  kilojoules?: number;
  altitude_gain?: number; // meters
  altitude_loss?: number; // meters
  zones?: any; // Heart rate zones breakdown
  provider: 'fitbit';
  raw_data: any;
}

// Error handling types
export interface FitbitError {
  errors: Array<{
    errorType: string;
    message: string;
  }>;
}

export interface FitbitRateLimitInfo {
  remaining: number;
  reset: number; // Unix timestamp
  limit: number;
}
interface OuraTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

interface OuraUser {
  id: string;
  age?: number;
  weight?: number;
  height?: number;
  biological_sex?: string;
  email?: string;
}

interface OuraSleepPeriod {
  id: string;
  average_breath: number;
  average_heart_rate: number;
  average_hrv: number;
  awake_time: number; // seconds
  bedtime_end: string;
  bedtime_start: string;
  day: string;
  deep_sleep_duration: number; // seconds
  efficiency: number; // percentage
  heart_rate: {
    interval: number;
    items: number[];
    timestamp: string;
  } | null;
  hrv: {
    interval: number;
    items: number[];
    timestamp: string;
  } | null;
  latency: number; // seconds
  light_sleep_duration: number; // seconds
  low_battery_alert: boolean;
  lowest_heart_rate: number;
  movement_30_sec: string;
  period: number;
  readiness: {
    contributors: {
      activity_balance: number;
      body_temperature: number;
      hrv_balance: number;
      previous_day_activity: number;
      previous_night_sleep: number;
      recovery_index: number;
      resting_heart_rate: number;
      sleep_balance: number;
    };
    score: number;
    temperature_deviation: number | null;
    temperature_trend_deviation: number | null;
  } | null;
  readiness_score_delta: number;
  rem_sleep_duration: number; // seconds
  restless_periods: number;
  sleep_phase_5_min: string;
  sleep_score_delta: number;
  time_in_bed: number; // seconds
  total_sleep_duration: number | null; // seconds
  type: string;
}

interface OuraReadiness {
  id: string;
  contributors: {
    activity_balance: number;
    body_temperature: number;
    hrv_balance: number;
    previous_day_activity: number;
    previous_night_sleep: number;
    recovery_index: number;
    resting_heart_rate: number;
    sleep_balance: number;
  };
  day: string;
  score: number;
  temperature_deviation?: number;
  temperature_trend_deviation?: number;
  timestamp: string;
}

interface OuraActivity {
  id: string;
  class_5_min: string;
  score: number;
  active_calories: number;
  average_met_minutes: number;
  contributors: {
    meet_daily_targets: number;
    move_every_hour: number;
    recovery_time: number;
    stay_active: number;
    training_frequency: number;
    training_volume: number;
  };
  equivalent_walking_distance: number;
  high_activity_met_minutes: number;
  high_activity_time: number;
  inactivity_alerts: number;
  low_activity_met_minutes: number;
  low_activity_time: number;
  medium_activity_met_minutes: number;
  medium_activity_time: number;
  met: {
    interval: number;
    items: number[];
    timestamp: string;
  };
  meters_to_target: number;
  non_wear_time: number;
  resting_time: number;
  sedentary_met_minutes: number;
  sedentary_time: number;
  steps: number;
  target_calories: number;
  target_meters: number;
  total_calories: number;
  day: string;
  timestamp: string;
}

interface OuraHeartRate {
  bpm: number;
  source: string;
  timestamp: string;
}

interface OuraSession {
  id: string;
  day: string;
  start_datetime: string;
  end_datetime: string;
  type: string;
  heart_rate?: {
    interval: number;
    items: number[];
    timestamp: string;
  };
  heart_rate_variability?: {
    interval: number;
    items: number[];
    timestamp: string;
  };
  heart_rate_zones?: {
    time_in_zone_1?: number;
    time_in_zone_2?: number;
    time_in_zone_3?: number;
    time_in_zone_4?: number;
    time_in_zone_5?: number;
    time_in_zone_6?: number;
  };
  mood?: number;
  motion_count?: {
    interval: number;
    items: number[];
    timestamp: string;
  };
}

class OuraAPI {
  private baseURL = 'https://api.ouraring.com/v2';

  private async makeRequest<T>(
    endpoint: string,
    accessToken: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Oura API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getUser(accessToken: string): Promise<OuraUser> {
    return this.makeRequest<OuraUser>('/usercollection/personal_info', accessToken);
  }

  async getSleep(
    accessToken: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ data: OuraSleepPeriod[] }> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const queryString = params.toString();
    const endpoint = `/usercollection/sleep${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<{ data: OuraSleepPeriod[] }>(endpoint, accessToken);
  }

  async getReadiness(
    accessToken: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ data: OuraReadiness[] }> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const queryString = params.toString();
    const endpoint = `/usercollection/daily_readiness${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<{ data: OuraReadiness[] }>(endpoint, accessToken);
  }

  async getActivity(
    accessToken: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ data: OuraActivity[] }> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const queryString = params.toString();
    const endpoint = `/usercollection/daily_activity${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<{ data: OuraActivity[] }>(endpoint, accessToken);
  }

  async getHeartRate(
    accessToken: string,
    startDatetime?: string,
    endDatetime?: string
  ): Promise<{ data: OuraHeartRate[] }> {
    const params = new URLSearchParams();
    if (startDatetime) params.append('start_datetime', startDatetime);
    if (endDatetime) params.append('end_datetime', endDatetime);

    const queryString = params.toString();
    const endpoint = `/usercollection/heartrate${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<{ data: OuraHeartRate[] }>(endpoint, accessToken);
  }

  async getSessions(
    accessToken: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ data: OuraSession[] }> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const queryString = params.toString();
    const endpoint = `/usercollection/session${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<{ data: OuraSession[] }>(endpoint, accessToken);
  }

  async refreshToken(refreshToken: string): Promise<OuraTokens> {
    const response = await fetch('https://api.ouraring.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.OURA_CLIENT_ID!,
        client_secret: process.env.OURA_CLIENT_SECRET!,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Oura token');
    }

    return response.json();
  }
}

export const ouraAPI = new OuraAPI();
export type { 
  OuraUser, 
  OuraSleepPeriod, 
  OuraReadiness, 
  OuraActivity, 
  OuraHeartRate, 
  OuraSession,
  OuraTokens 
};
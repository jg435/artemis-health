interface WhoopTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

interface WhoopUser {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
}

interface WhoopRecovery {
  cycle_id: number;
  sleep_id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  score_state: string;
  score: {
    user_calibrating: boolean;
    recovery_score: number;
    resting_heart_rate: number;
    hrv_rmssd_milli: number;
    spo2_percentage: number;
    skin_temp_celsius: number;
  };
}

interface WhoopSleep {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  nap: boolean;
  score_state: string;
  score: {
    stage_summary: {
      total_in_bed_time_milli: number;
      total_awake_time_milli: number;
      total_no_data_time_milli: number;
      total_light_sleep_time_milli: number;
      total_slow_wave_sleep_time_milli: number;
      total_rem_sleep_time_milli: number;
      sleep_cycle_count: number;
      disturbance_count: number;
    };
    sleep_needed: {
      baseline_milli: number;
      need_from_sleep_debt_milli: number;
      need_from_recent_strain_milli: number;
      need_from_recent_nap_milli: number;
    };
    respiratory_rate: number;
    sleep_performance_percentage: number;
    sleep_consistency_percentage: number;
    sleep_efficiency_percentage: number;
  };
}

interface WhoopWorkout {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  sport_id: number;
  sport_name: string;
  score_state: string;
  score: {
    strain: number;
    average_heart_rate: number;
    max_heart_rate: number;
    kilojoule: number;
    percent_recorded: number;
    distance_meter: number;
    altitude_gain_meter: number;
    altitude_change_meter: number;
    zone_duration: {
      zone_zero_milli: number;
      zone_one_milli: number;
      zone_two_milli: number;
      zone_three_milli: number;
      zone_four_milli: number;
      zone_five_milli: number;
    };
  };
}

class WhoopAPI {
  private baseURL = 'https://api.prod.whoop.com/developer';

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
      throw new Error(`Whoop API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getUser(accessToken: string): Promise<WhoopUser> {
    return this.makeRequest<WhoopUser>('/v1/user/profile/basic', accessToken);
  }

  async getRecovery(
    accessToken: string,
    start?: string,
    end?: string,
    limit = 25
  ): Promise<{ records: WhoopRecovery[] }> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (start) params.append('start', start);
    if (end) params.append('end', end);

    return this.makeRequest<{ records: WhoopRecovery[] }>(
      `/v1/recovery?${params}`,
      accessToken
    );
  }

  async getSleep(
    accessToken: string,
    start?: string,
    end?: string,
    limit = 25
  ): Promise<{ records: WhoopSleep[] }> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (start) params.append('start', start);
    if (end) params.append('end', end);

    return this.makeRequest<{ records: WhoopSleep[] }>(
      `/v1/activity/sleep?${params}`,
      accessToken
    );
  }

  async getWorkouts(
    accessToken: string,
    start?: string,
    end?: string,
    limit = 25
  ): Promise<{ records: WhoopWorkout[] }> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (start) params.append('start', start);
    if (end) params.append('end', end);

    const endpoint = `/v1/activity/workout?${params}`;
    console.log('Calling Whoop API endpoint:', endpoint);
    
    const result = await this.makeRequest<{ records: WhoopWorkout[] }>(
      endpoint,
      accessToken
    );
    
    console.log('Raw Whoop API response:', JSON.stringify(result, null, 2));
    return result;
  }


  async refreshToken(refreshToken: string): Promise<WhoopTokens> {
    const response = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.WHOOP_CLIENT_ID!,
        client_secret: process.env.WHOOP_CLIENT_SECRET!,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Whoop token');
    }

    return response.json();
  }
}

export const whoopAPI = new WhoopAPI();
export type { WhoopUser, WhoopRecovery, WhoopSleep, WhoopWorkout };
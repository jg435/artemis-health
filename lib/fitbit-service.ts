import { 
  FitbitTokens, 
  FitbitUser, 
  FitbitActivitySummary, 
  FitbitSleepData, 
  FitbitHeartRateData,
  FitbitIntradayHeartRate,
  UnifiedFitbitRecoveryData,
  UnifiedFitbitSleepData,
  UnifiedFitbitActivityData,
  FitbitError,
  FitbitRateLimitInfo
} from './fitbit-types';

export class FitbitService {
  private baseUrl = 'https://api.fitbit.com/1';
  private clientId = process.env.FITBIT_CLIENT_ID!;
  private clientSecret = process.env.FITBIT_CLIENT_SECRET!;
  private redirectUri = process.env.FITBIT_REDIRECT_URI!;

  // Rate limiting tracking
  private rateLimitInfo: Map<string, FitbitRateLimitInfo> = new Map();

  /**
   * Generate OAuth2 authorization URL
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'activity heartrate sleep profile weight',
      ...(state && { state })
    });

    return `https://www.fitbit.com/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForTokens(code: string): Promise<FitbitTokens> {
    const response = await fetch('https://api.fitbit.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
        code
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to exchange code for tokens: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<FitbitTokens> {
    const response = await fetch('https://api.fitbit.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to refresh token: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  /**
   * Revoke access token
   */
  async revokeToken(accessToken: string): Promise<void> {
    const response = await fetch('https://api.fitbit.com/oauth2/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        token: accessToken
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to revoke token: ${JSON.stringify(error)}`);
    }
  }

  /**
   * Make authenticated API request with rate limiting
   */
  private async makeApiRequest<T>(
    endpoint: string, 
    accessToken: string, 
    options: RequestInit = {}
  ): Promise<T> {
    // Check rate limiting
    await this.checkRateLimit(accessToken);

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    // Update rate limit info from response headers
    this.updateRateLimitInfo(accessToken, response);

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited - throw specific error
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      try {
        const error: FitbitError = await response.json();
        throw new Error(`Fitbit API error: ${error.errors?.[0]?.message || 'Unknown error'}`);
      } catch {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    return response.json();
  }

  /**
   * Check and enforce rate limiting (150 requests/hour per user)
   */
  private async checkRateLimit(accessToken: string): Promise<void> {
    const limitInfo = this.rateLimitInfo.get(accessToken);
    if (!limitInfo) return;

    const now = Math.floor(Date.now() / 1000);
    if (limitInfo.remaining <= 0 && now < limitInfo.reset) {
      const waitTime = (limitInfo.reset - now) * 1000;
      throw new Error(`Rate limit exceeded. Reset in ${Math.ceil(waitTime / 1000)} seconds.`);
    }
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimitInfo(accessToken: string, response: Response): void {
    const remaining = response.headers.get('fitbit-rate-limit-remaining');
    const reset = response.headers.get('fitbit-rate-limit-reset');
    const limit = response.headers.get('fitbit-rate-limit-limit');

    if (remaining && reset && limit) {
      this.rateLimitInfo.set(accessToken, {
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10),
        limit: parseInt(limit, 10)
      });
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(accessToken: string): Promise<FitbitUser> {
    const response = await this.makeApiRequest<{ user: FitbitUser }>(
      '/user/-/profile.json',
      accessToken
    );
    return response.user;
  }

  /**
   * Get daily activity summary for a specific date
   */
  async getActivitySummary(accessToken: string, date: string): Promise<FitbitActivitySummary> {
    return this.makeApiRequest<FitbitActivitySummary>(
      `/user/-/activities/date/${date}.json`,
      accessToken
    );
  }

  /**
   * Get sleep data for a specific date
   */
  async getSleepData(accessToken: string, date: string): Promise<FitbitSleepData> {
    return this.makeApiRequest<FitbitSleepData>(
      `/user/-/sleep/date/${date}.json`,
      accessToken
    );
  }

  /**
   * Get heart rate data for a specific date
   */
  async getHeartRateData(accessToken: string, date: string): Promise<FitbitHeartRateData> {
    return this.makeApiRequest<FitbitHeartRateData>(
      `/user/-/activities/heart/date/${date}/1d.json`,
      accessToken
    );
  }

  /**
   * Get intraday heart rate data for a specific date
   */
  async getIntradayHeartRate(
    accessToken: string, 
    date: string, 
    detailLevel: '1sec' | '1min' | '15min' = '1min'
  ): Promise<FitbitIntradayHeartRate> {
    return this.makeApiRequest<FitbitIntradayHeartRate>(
      `/user/-/activities/heart/date/${date}/1d/${detailLevel}.json`,
      accessToken
    );
  }

  /**
   * Transform Fitbit activity data to unified format
   */
  transformActivityData(
    activityData: FitbitActivitySummary, 
    date: string
  ): UnifiedFitbitActivityData[] {
    const activities: UnifiedFitbitActivityData[] = [];

    // Add individual activities
    activityData.activities.forEach(activity => {
      activities.push({
        activity_id: activity.logId.toString(),
        activity_type: activity.name,
        sport_type: activity.activityName,
        start_time: activity.hasStartTime ? 
          `${activity.startDate}T${activity.startTime}` : undefined,
        duration: activity.duration * 60, // Convert to seconds
        distance: activity.distance * 1609.34, // Convert miles to meters
        calories: activity.calories,
        average_heart_rate: activity.averageHeartRate,
        zones: activity.heartRateZones,
        provider: 'fitbit',
        raw_data: activity
      });
    });

    // Add daily summary as an activity if no specific activities
    if (activities.length === 0 && activityData.summary.steps > 0) {
      activities.push({
        activity_type: 'daily_summary',
        sport_type: 'general',
        calories: activityData.summary.caloriesOut,
        distance: activityData.summary.distances.find(d => d.activity === 'total')?.distance || 0,
        provider: 'fitbit',
        raw_data: activityData.summary
      });
    }

    return activities;
  }

  /**
   * Transform Fitbit sleep data to unified format
   */
  transformSleepData(sleepData: FitbitSleepData, date: string): UnifiedFitbitSleepData | null {
    const mainSleep = sleepData.sleep.find(s => s.isMainSleep) || sleepData.sleep[0];
    if (!mainSleep) return null;

    const efficiency = mainSleep.efficiency || 
      ((mainSleep.minutesAsleep / mainSleep.timeInBed) * 100);

    return {
      date,
      sleep_start: mainSleep.startTime,
      sleep_end: mainSleep.endTime,
      total_sleep_duration: mainSleep.minutesAsleep,
      deep_sleep_duration: mainSleep.levels?.summary?.deep?.minutes,
      rem_sleep_duration: mainSleep.levels?.summary?.rem?.minutes,
      light_sleep_duration: mainSleep.levels?.summary?.light?.minutes,
      awake_duration: mainSleep.levels?.summary?.wake?.minutes,
      sleep_efficiency: efficiency,
      sleep_onset_latency: mainSleep.minutesToFallAsleep,
      wake_count: mainSleep.levels?.summary?.wake?.count,
      provider: 'fitbit',
      raw_data: mainSleep
    };
  }

  /**
   * Transform Fitbit heart rate data to unified recovery format
   */
  transformRecoveryData(
    heartRateData: FitbitHeartRateData,
    sleepData?: FitbitSleepData, 
    date?: string
  ): UnifiedFitbitRecoveryData | null {
    const dayData = heartRateData['activities-heart']?.[0];
    if (!dayData) return null;

    const restingHR = dayData.value.restingHeartRate;
    const sleepScore = sleepData?.sleep?.[0]?.efficiency;

    return {
      date: date || dayData.dateTime,
      resting_heart_rate: restingHR,
      sleep_performance: sleepScore,
      provider: 'fitbit',
      raw_data: {
        heartRate: dayData,
        sleep: sleepData?.sleep?.[0]
      }
    };
  }

  /**
   * Get data for multiple days
   */
  async getMultipleDaysData(
    accessToken: string, 
    startDate: string, 
    endDate: string,
    dataTypes: ('activity' | 'sleep' | 'heartrate')[] = ['activity', 'sleep', 'heartrate']
  ): Promise<{
    activities: UnifiedFitbitActivityData[];
    sleep: UnifiedFitbitSleepData[];
    recovery: UnifiedFitbitRecoveryData[];
  }> {
    const results = {
      activities: [] as UnifiedFitbitActivityData[],
      sleep: [] as UnifiedFitbitSleepData[],
      recovery: [] as UnifiedFitbitRecoveryData[]
    };

    // Generate date range
    const dates = this.generateDateRange(startDate, endDate);

    // Batch requests with rate limiting consideration
    for (const date of dates) {
      try {
        const promises: Promise<any>[] = [];

        if (dataTypes.includes('activity')) {
          promises.push(this.getActivitySummary(accessToken, date));
        }
        if (dataTypes.includes('sleep')) {
          promises.push(this.getSleepData(accessToken, date));
        }
        if (dataTypes.includes('heartrate')) {
          promises.push(this.getHeartRateData(accessToken, date));
        }

        const [activityData, sleepData, heartRateData] = await Promise.all(promises);

        // Transform and store data
        if (activityData) {
          const activities = this.transformActivityData(activityData, date);
          results.activities.push(...activities);
        }

        if (sleepData) {
          const sleep = this.transformSleepData(sleepData, date);
          if (sleep) results.sleep.push(sleep);
        }

        if (heartRateData) {
          const recovery = this.transformRecoveryData(heartRateData, sleepData, date);
          if (recovery) results.recovery.push(recovery);
        }

        // Add small delay to respect rate limits
        await this.delay(100);

      } catch (error) {
        console.error(`Error fetching Fitbit data for ${date}:`, error);
        // Continue with other dates
      }
    }

    return results;
  }

  /**
   * Generate array of date strings between start and end date
   */
  private generateDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    return dates;
  }

  /**
   * Utility function for adding delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const fitbitAPI = new FitbitService();
interface GarminTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

interface GarminUser {
  userId: string;
  email?: string;
  displayName?: string;
}

interface GarminWellnessData {
  summaries: {
    userId: string;
    userAccessToken: string;
    summaryId: string;
    calendarDate: string;
    activityType?: string;
    durationInSeconds?: number;
    steps?: number;
    distanceInMeters?: number;
    activeKilocalories?: number;
    bmrKilocalories?: number;
    activeTimeInSeconds?: number;
    sedentaryTimeInSeconds?: number;
    sleepTimeInSeconds?: number;
    heartRateDuringActivitiesInBeatsPerMinute?: {
      averageHeartRate?: number;
      maxHeartRate?: number;
      restingHeartRate?: number;
    };
    stressQualifier?: string;
    bodyBatteryChargedValue?: number;
    bodyBatteryDrainedValue?: number;
    bodyBatteryHighestValue?: number;
    bodyBatteryLowestValue?: number;
  }[];
}

interface GarminActivity {
  summaries: {
    userId: string;
    userAccessToken: string;
    summaryId: string;
    activityType: string;
    activityName?: string;
    durationInSeconds: number;
    startTimeInSeconds: number;
    startTimeOffsetInSeconds?: number;
    distanceInMeters?: number;
    activeKilocalories?: number;
    averageHeartRateInBeatsPerMinute?: number;
    maxHeartRateInBeatsPerMinute?: number;
    averageSpeedInMetersPerSecond?: number;
    maxSpeedInMetersPerSecond?: number;
    elevationGainInMeters?: number;
    elevationLossInMeters?: number;
  }[];
}

interface GarminSleep {
  sleepMovement: {
    userId: string;
    userAccessToken: string;
    summaryId: string;
    calendarDate: string;
    startTimeInSeconds: number;
    durationInSeconds: number;
    unmeasurableTimeInSeconds?: number;
    deepSleepDurationInSeconds?: number;
    lightSleepDurationInSeconds?: number;
    remSleepDurationInSeconds?: number;
    awakeDurationInSeconds?: number;
    validation?: string;
  }[];
}

class GarminAPI {
  private baseURL = 'https://apis.garmin.com';

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
      throw new Error(`Garmin API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getWellnessData(
    accessToken: string,
    startDate: string,
    endDate: string
  ): Promise<GarminWellnessData> {
    const endpoint = `/wellness-api/rest/userMetrics?uploadStartTimeInSeconds=${startDate}&uploadEndTimeInSeconds=${endDate}`;
    return this.makeRequest<GarminWellnessData>(endpoint, accessToken);
  }

  async getActivities(
    accessToken: string,
    startDate: string,
    endDate: string
  ): Promise<GarminActivity> {
    const endpoint = `/wellness-api/rest/activities?uploadStartTimeInSeconds=${startDate}&uploadEndTimeInSeconds=${endDate}`;
    return this.makeRequest<GarminActivity>(endpoint, accessToken);
  }

  async getSleepData(
    accessToken: string,
    startDate: string,
    endDate: string
  ): Promise<GarminSleep> {
    const endpoint = `/wellness-api/rest/sleepData?uploadStartTimeInSeconds=${startDate}&uploadEndTimeInSeconds=${endDate}`;
    return this.makeRequest<GarminSleep>(endpoint, accessToken);
  }

  async refreshToken(refreshToken: string): Promise<GarminTokens> {
    const response = await fetch('https://connect.garmin.com/oauth-service/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.GARMIN_CLIENT_ID!,
        client_secret: process.env.GARMIN_CLIENT_SECRET!,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Garmin token');
    }

    return response.json();
  }
}

export const garminAPI = new GarminAPI();
export type { 
  GarminUser, 
  GarminWellnessData, 
  GarminActivity, 
  GarminSleep,
  GarminTokens 
};
import type { OuraSleepPeriod, OuraReadiness, OuraActivity } from './oura';
import type { WhoopRecovery, WhoopSleep, WhoopWorkout } from './whoop';

export type WearableType = 'whoop' | 'oura' | null;

export interface UnifiedRecoveryData {
  source: WearableType;
  score: number;
  date: string;
  metrics: {
    heartRate?: number;
    hrv?: number;
    temperature?: number;
    oxygenSaturation?: number;
  };
}

export interface UnifiedSleepData {
  source: WearableType;
  date: string;
  score: number;
  duration: number; // in minutes
  efficiency: number; // percentage
  stages: {
    deep?: number;
    light?: number;
    rem?: number;
    awake?: number;
  };
  respiratoryRate?: number; // breaths per minute
}

export interface UnifiedActivityData {
  source: WearableType;
  date: string;
  score?: number;
  strain?: number;
  calories: number;
  steps?: number;
  distance?: number; // in meters
  averageHeartRate?: number;
  maxHeartRate?: number;
  heartRateZones?: {
    zone1?: number; // seconds in zone
    zone2?: number;
    zone3?: number;
    zone4?: number;
    zone5?: number;
    zone6?: number;
  };
}

export class WearableService {
  static async getConnectedWearable(): Promise<WearableType> {
    try {
      console.log('Checking wearable connections...');
      
      // Check Whoop connection
      const whoopResponse = await fetch('/api/whoop/connection-status');
      console.log('Whoop response status:', whoopResponse.status);
      if (whoopResponse.ok) {
        const whoopData = await whoopResponse.json();
        console.log('Whoop connection data:', whoopData);
        if (whoopData.connected) {
          console.log('Whoop is connected');
          return 'whoop';
        }
      }

      // Check Oura connection
      const ouraResponse = await fetch('/api/oura/connection-status');
      console.log('Oura response status:', ouraResponse.status);
      if (ouraResponse.ok) {
        const ouraData = await ouraResponse.json();
        console.log('Oura connection data:', ouraData);
        if (ouraData.connected) {
          console.log('Oura is connected');
          return 'oura';
        }
      }

      console.log('No wearable connected');
      return null;
    } catch (error) {
      console.error('Error checking wearable connections:', error);
      return null;
    }
  }

  static async getRecoveryData(): Promise<UnifiedRecoveryData[]> {
    const connectedWearable = await this.getConnectedWearable();
    console.log('Getting recovery data for wearable:', connectedWearable);
    
    if (connectedWearable === 'whoop') {
      return this.getWhoopRecoveryData();
    } else if (connectedWearable === 'oura') {
      return this.getOuraRecoveryData();
    }
    
    console.log('No wearable connected for recovery data');
    return [];
  }

  static async getSleepData(): Promise<UnifiedSleepData[]> {
    const connectedWearable = await this.getConnectedWearable();
    
    if (connectedWearable === 'whoop') {
      return this.getWhoopSleepData();
    } else if (connectedWearable === 'oura') {
      return this.getOuraSleepData();
    }
    
    return [];
  }

  static async getActivityData(): Promise<UnifiedActivityData[]> {
    const connectedWearable = await this.getConnectedWearable();
    
    if (connectedWearable === 'whoop') {
      return this.getWhoopActivityData();
    } else if (connectedWearable === 'oura') {
      return this.getOuraActivityData();
    }
    
    return [];
  }

  private static async getWhoopRecoveryData(): Promise<UnifiedRecoveryData[]> {
    try {
      const response = await fetch('/api/whoop/recovery?limit=7');
      if (!response.ok) return [];
      
      const data = await response.json();
      const records: WhoopRecovery[] = data.records || [];
      
      return records.map(record => ({
        source: 'whoop' as const,
        score: record.score.recovery_score,
        date: record.created_at.split('T')[0],
        metrics: {
          heartRate: record.score.resting_heart_rate,
          hrv: record.score.hrv_rmssd_milli,
          temperature: record.score.skin_temp_celsius,
          oxygenSaturation: record.score.spo2_percentage,
        }
      }));
    } catch (error) {
      console.error('Error fetching Whoop recovery data:', error);
      return [];
    }
  }

  private static async getOuraRecoveryData(): Promise<UnifiedRecoveryData[]> {
    try {
      console.log('Fetching Oura readiness data...');
      const response = await fetch('/api/oura/readiness');
      console.log('Oura readiness response status:', response.status);
      
      if (!response.ok) {
        console.log('Oura readiness response not ok');
        return [];
      }
      
      const data = await response.json();
      console.log('Oura readiness raw data:', data);
      const records: OuraReadiness[] = data.data || [];
      console.log('Oura readiness records count:', records.length);
      
      const unifiedData = records.map(record => ({
        source: 'oura' as const,
        score: record.score,
        date: record.day,
        metrics: {
          heartRate: record.contributors.resting_heart_rate,
          hrv: record.contributors.hrv_balance,
          temperature: record.temperature_deviation || 0,
        }
      }));
      
      console.log('Unified Oura data:', unifiedData);
      return unifiedData;
    } catch (error) {
      console.error('Error fetching Oura readiness data:', error);
      return [];
    }
  }

  private static async getWhoopSleepData(): Promise<UnifiedSleepData[]> {
    try {
      const response = await fetch('/api/whoop/sleep?limit=7');
      if (!response.ok) return [];
      
      const data = await response.json();
      const records: WhoopSleep[] = data.records || [];
      
      return records.map(record => ({
        source: 'whoop' as const,
        date: record.start.split('T')[0],
        score: record.score.sleep_performance_percentage,
        duration: Math.round(record.score.stage_summary.total_in_bed_time_milli / (1000 * 60)),
        efficiency: record.score.sleep_efficiency_percentage,
        stages: {
          deep: Math.round(record.score.stage_summary.total_slow_wave_sleep_time_milli / (1000 * 60)),
          light: Math.round(record.score.stage_summary.total_light_sleep_time_milli / (1000 * 60)),
          rem: Math.round(record.score.stage_summary.total_rem_sleep_time_milli / (1000 * 60)),
          awake: Math.round(record.score.stage_summary.total_awake_time_milli / (1000 * 60)),
        },
        respiratoryRate: record.score.respiratory_rate
      }));
    } catch (error) {
      console.error('Error fetching Whoop sleep data:', error);
      return [];
    }
  }

  private static async getOuraSleepData(): Promise<UnifiedSleepData[]> {
    try {
      console.log('Fetching Oura sleep data...');
      const response = await fetch('/api/oura/sleep');
      console.log('Oura sleep response status:', response.status);
      
      if (!response.ok) return [];
      
      const data = await response.json();
      console.log('Raw Oura sleep data:', JSON.stringify(data, null, 2));
      const records: OuraSleepPeriod[] = data.data || [];
      console.log('Oura sleep records count:', records.length);
      
      const unifiedData = records.map(record => {
        console.log('Processing Oura sleep record:', JSON.stringify(record, null, 2));
        
        // Convert seconds to minutes for duration fields
        const totalSleepMinutes = record.total_sleep_duration ? Math.round(record.total_sleep_duration / 60) : 0;
        const deepSleepMinutes = Math.round(record.deep_sleep_duration / 60);
        const lightSleepMinutes = Math.round(record.light_sleep_duration / 60);
        const remSleepMinutes = Math.round(record.rem_sleep_duration / 60);
        const awakeMinutes = Math.round(record.awake_time / 60);
        
        const sleepData = {
          source: 'oura' as const,
          date: record.day,
          score: record.readiness?.score || 85, // Use readiness score as sleep score approximation
          duration: totalSleepMinutes,
          efficiency: record.efficiency,
          stages: {
            deep: deepSleepMinutes,
            light: lightSleepMinutes,
            rem: remSleepMinutes,
            awake: awakeMinutes,
          }
        };
        
        console.log('Converted sleep data:', sleepData);
        return sleepData;
      });
      
      console.log('Final unified sleep data:', unifiedData);
      return unifiedData;
    } catch (error) {
      console.error('Error fetching Oura sleep data:', error);
      return [];
    }
  }

  private static async getWhoopActivityData(): Promise<UnifiedActivityData[]> {
    try {
      const response = await fetch('/api/whoop/workouts?limit=10');
      if (!response.ok) return [];
      
      const data = await response.json();
      const records: WhoopWorkout[] = data.records || [];
      
      return records.map(record => ({
        source: 'whoop' as const,
        date: record.start.split('T')[0],
        strain: record.score.strain,
        calories: Math.round(record.score.kilojoule / 4.184), // Convert kJ to calories
        distance: record.score.distance_meter,
        averageHeartRate: record.score.average_heart_rate,
        maxHeartRate: record.score.max_heart_rate,
      }));
    } catch (error) {
      console.error('Error fetching Whoop activity data:', error);
      return [];
    }
  }

  private static async getOuraActivityData(): Promise<UnifiedActivityData[]> {
    try {
      // Fetch both activity and sessions data
      const [activityResponse, sessionsResponse] = await Promise.all([
        fetch('/api/oura/activity'),
        fetch('/api/oura/sessions')
      ]);

      if (!activityResponse.ok) return [];
      
      const activityData = await activityResponse.json();
      const records: OuraActivity[] = activityData.data || [];
      
      // Get sessions data for heart rate zones (if available)
      let sessionsData: any = { data: [] };
      if (sessionsResponse.ok) {
        sessionsData = await sessionsResponse.json();
      }
      
      const sessions = sessionsData.data || [];
      
      return records.map(record => {
        // Try to find matching session for this day for heart rate zones
        const matchingSession = sessions.find((session: any) => session.day === record.day);
        
        return {
          source: 'oura' as const,
          date: record.day,
          score: record.score,
          calories: record.total_calories,
          steps: record.steps,
          distance: record.equivalent_walking_distance,
          heartRateZones: matchingSession?.heart_rate_zones ? {
            zone1: matchingSession.heart_rate_zones.time_in_zone_1,
            zone2: matchingSession.heart_rate_zones.time_in_zone_2,
            zone3: matchingSession.heart_rate_zones.time_in_zone_3,
            zone4: matchingSession.heart_rate_zones.time_in_zone_4,
            zone5: matchingSession.heart_rate_zones.time_in_zone_5,
            zone6: matchingSession.heart_rate_zones.time_in_zone_6,
          } : undefined
        };
      });
    } catch (error) {
      console.error('Error fetching Oura activity data:', error);
      return [];
    }
  }
}
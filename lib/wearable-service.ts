import type { OuraSleepPeriod, OuraReadiness, OuraActivity } from './oura';
import type { WhoopRecovery, WhoopSleep, WhoopWorkout } from './whoop';

export type WearableType = 'whoop' | 'oura' | 'fitbit' | 'garmin' | null;

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
  sportId?: number;
  sportName?: string;
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

  static async getAllWearableRecoveryData(): Promise<UnifiedRecoveryData[]> {
    try {
      // Fetch data from both wearables simultaneously
      const [whoopData, ouraData] = await Promise.all([
        this.getWhoopRecoveryData().catch(() => []),
        this.getOuraRecoveryData().catch(() => [])
      ]);

      // Combine and aggregate data by date
      const allData = [...whoopData, ...ouraData];
      const aggregatedByDate = new Map<string, UnifiedRecoveryData>();

      allData.forEach(recovery => {
        const existing = aggregatedByDate.get(recovery.date);
        
        if (existing) {
          // Average the recovery scores
          aggregatedByDate.set(recovery.date, {
            ...existing,
            source: 'whoop' as const, // Default to whoop for display purposes
            score: Math.round((existing.score + recovery.score) / 2),
            metrics: {
              heartRate: existing.metrics.heartRate || recovery.metrics.heartRate,
              hrv: existing.metrics.hrv || recovery.metrics.hrv,
              temperature: existing.metrics.temperature || recovery.metrics.temperature,
              oxygenSaturation: existing.metrics.oxygenSaturation || recovery.metrics.oxygenSaturation,
            }
          });
        } else {
          aggregatedByDate.set(recovery.date, recovery);
        }
      });

      // Convert back to array and sort by date (newest first)
      return Array.from(aggregatedByDate.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Error fetching aggregated recovery data:', error);
      return [];
    }
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

  static async getAllWearableSleepData(): Promise<UnifiedSleepData[]> {
    try {
      // Fetch data from both wearables simultaneously
      const [whoopData, ouraData] = await Promise.all([
        this.getWhoopSleepData().catch(() => []),
        this.getOuraSleepData().catch(() => [])
      ]);

      // Combine and aggregate data by date
      const allData = [...whoopData, ...ouraData];
      const aggregatedByDate = new Map<string, UnifiedSleepData>();

      allData.forEach(sleep => {
        const existing = aggregatedByDate.get(sleep.date);
        
        if (existing) {
          // Average the sleep scores and sum durations
          aggregatedByDate.set(sleep.date, {
            ...existing,
            source: 'whoop' as const, // Default to whoop for display purposes
            score: Math.round((existing.score + sleep.score) / 2),
            duration: existing.duration + sleep.duration, // Sum total sleep time
            efficiency: Math.round((existing.efficiency + sleep.efficiency) / 2),
            stages: {
              deep: (existing.stages.deep || 0) + (sleep.stages.deep || 0),
              light: (existing.stages.light || 0) + (sleep.stages.light || 0),
              rem: (existing.stages.rem || 0) + (sleep.stages.rem || 0),
              awake: (existing.stages.awake || 0) + (sleep.stages.awake || 0),
            },
            respiratoryRate: existing.respiratoryRate || sleep.respiratoryRate
          });
        } else {
          aggregatedByDate.set(sleep.date, sleep);
        }
      });

      // Convert back to array and sort by date (newest first)
      return Array.from(aggregatedByDate.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Error fetching aggregated sleep data:', error);
      return [];
    }
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

  static async getAllWearableActivityData(): Promise<UnifiedActivityData[]> {
    try {
      // Fetch data from both wearables simultaneously
      const [whoopData, ouraData] = await Promise.all([
        this.getWhoopActivityData().catch(() => []),
        this.getOuraActivityData().catch(() => [])
      ]);

      // Combine and aggregate data by date
      const allData = [...whoopData, ...ouraData];
      const aggregatedByDate = new Map<string, UnifiedActivityData>();

      allData.forEach(activity => {
        const existing = aggregatedByDate.get(activity.date);
        
        if (existing) {
          // Aggregate calories and strain
          aggregatedByDate.set(activity.date, {
            ...existing,
            source: 'whoop' as const, // Default to whoop for display purposes
            calories: existing.calories + activity.calories,
            strain: (existing.strain || 0) + (activity.strain || 0),
            steps: Math.max(existing.steps || 0, activity.steps || 0), // Take higher step count
            distance: Math.max(existing.distance || 0, activity.distance || 0), // Take higher distance
            averageHeartRate: existing.averageHeartRate || activity.averageHeartRate,
            maxHeartRate: Math.max(existing.maxHeartRate || 0, activity.maxHeartRate || 0),
            score: existing.score || activity.score,
            heartRateZones: existing.heartRateZones || activity.heartRateZones
          });
        } else {
          aggregatedByDate.set(activity.date, activity);
        }
      });

      // Convert back to array and sort by date (newest first)
      return Array.from(aggregatedByDate.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Error fetching aggregated activity data:', error);
      return [];
    }
  }

  private static async getWhoopRecoveryData(): Promise<UnifiedRecoveryData[]> {
    try {
      const response = await fetch('/api/whoop/recovery?limit=7');
      if (!response.ok) return [];
      
      const data = await response.json();
      const records: WhoopRecovery[] = data.records || [];
      
      return records
        .map(record => ({
          source: 'whoop' as const,
          score: record.score.recovery_score,
          date: record.created_at.split('T')[0],
          metrics: {
            heartRate: record.score.resting_heart_rate,
            hrv: record.score.hrv_rmssd_milli,
            temperature: record.score.skin_temp_celsius,
            oxygenSaturation: record.score.spo2_percentage,
          }
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort newest first
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
      return unifiedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort newest first
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
        sportId: record.sport_id,
        sportName: record.sport_name,
      }));
    } catch (error) {
      console.error('Error fetching Whoop activity data:', error);
      return [];
    }
  }

  private static async getOuraActivityData(): Promise<UnifiedActivityData[]> {
    try {
      // Fetch activity, sessions, and heart rate data
      const [activityResponse, sessionsResponse, heartRateResponse] = await Promise.all([
        fetch('/api/oura/activity'),
        fetch('/api/oura/sessions'),
        fetch('/api/oura/heartrate')
      ]);

      if (!activityResponse.ok) return [];
      
      const activityData = await activityResponse.json();
      const records: OuraActivity[] = activityData.data || [];
      
      // Get sessions data for heart rate zones (if available)
      let sessionsData: any = { data: [] };
      if (sessionsResponse.ok) {
        sessionsData = await sessionsResponse.json();
      }
      
      // Get heart rate data
      let heartRateData: any = { data: [] };
      if (heartRateResponse.ok) {
        heartRateData = await heartRateResponse.json();
      }
      
      const sessions = sessionsData.data || [];
      const heartRates = heartRateData.data || [];
      
      console.log('Oura wearable service - Heart rate response status:', heartRateResponse.status);
      console.log('Oura wearable service - Heart rate data count:', heartRates.length);
      if (heartRates.length > 0) {
        console.log('Oura wearable service - Sample heart rate data:', heartRates.slice(0, 2));
      }
      
      // Oura already provides daily aggregated data, so we just need to format it
      return records.map(record => {
        // Try to find matching sessions for this day and aggregate heart rate zones
        const dailySessions = sessions.filter((session: any) => session.day === record.day);
        
        let aggregatedHeartRateZones: any = undefined;
        if (dailySessions.length > 0) {
          // Sum up all heart rate zones for the day
          const totalZones = dailySessions.reduce((acc: any, session: any) => {
            if (session.heart_rate_zones) {
              acc.zone1 += session.heart_rate_zones.time_in_zone_1 || 0;
              acc.zone2 += session.heart_rate_zones.time_in_zone_2 || 0;
              acc.zone3 += session.heart_rate_zones.time_in_zone_3 || 0;
              acc.zone4 += session.heart_rate_zones.time_in_zone_4 || 0;
              acc.zone5 += session.heart_rate_zones.time_in_zone_5 || 0;
              acc.zone6 += session.heart_rate_zones.time_in_zone_6 || 0;
            }
            return acc;
          }, { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0, zone6: 0 });

          // Only include if there's actual heart rate zone data
          if (Object.values(totalZones).some(zone => zone > 0)) {
            aggregatedHeartRateZones = totalZones;
          }
        }
        
        // Calculate average and max heart rate from heart rate endpoint for this day
        let averageHeartRate: number | undefined;
        let maxHeartRate: number | undefined;
        
        // Filter heart rate data for this specific day
        const dayHeartRates = heartRates.filter((hr: any) => {
          const hrDate = new Date(hr.timestamp).toISOString().split('T')[0];
          return hrDate === record.day;
        });
        
        console.log(`Processing day ${record.day}: found ${dayHeartRates.length} heart rate readings`);
        if (dayHeartRates.length > 0) {
          console.log('Sample heart rate readings for day:', dayHeartRates.slice(0, 3).map((hr: any) => ({ bpm: hr.bpm, timestamp: hr.timestamp, source: hr.source })));
        }
        
        if (dayHeartRates.length > 0) {
          const bpmValues = dayHeartRates.map((hr: any) => hr.bpm).filter((bpm: number) => bpm > 0);
          
          if (bpmValues.length > 0) {
            averageHeartRate = Math.round(bpmValues.reduce((sum: number, bpm: number) => sum + bpm, 0) / bpmValues.length);
            maxHeartRate = Math.max(...bpmValues);
            console.log(`Day ${record.day} calculated HR - Avg: ${averageHeartRate}, Max: ${maxHeartRate}`);
          }
        }
        
        return {
          source: 'oura' as const,
          date: record.day,
          score: record.score,
          calories: record.total_calories, // Already daily total
          steps: record.steps, // Already daily total
          distance: record.equivalent_walking_distance, // Already daily total
          averageHeartRate,
          maxHeartRate,
          heartRateZones: aggregatedHeartRateZones
        };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Error fetching Oura activity data:', error);
      return [];
    }
  }
}
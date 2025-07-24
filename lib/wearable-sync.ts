import { supabase } from './supabase'
import { WhoopAuthService } from './whoop-auth'
import { OuraAuthService } from './oura-auth'
import { GarminAuthService } from './garmin-auth'
import { FitbitAuthService } from './fitbit-auth'
import { fitbitAPI } from './fitbit-service'

interface SyncResult {
  success: boolean
  synced: number
  error?: string
}

interface WearableDataSyncer {
  syncRecoveryData(userId: string): Promise<SyncResult>
  syncSleepData(userId: string): Promise<SyncResult>
  syncActivityData(userId: string): Promise<SyncResult>
}

export class WearableDataSyncService {
  private whoopAuth = new WhoopAuthService()
  private ouraAuth = new OuraAuthService()
  private garminAuth = new GarminAuthService()
  private fitbitAuth = new FitbitAuthService()

  /**
   * Sync all wearable data for a user (recovery, sleep, activity)
   */
  async syncAllDataForUser(userId: string): Promise<{ [provider: string]: { [dataType: string]: SyncResult } }> {
    const results: { [provider: string]: { [dataType: string]: SyncResult } } = {}

    // Sync Whoop data
    const whoopToken = await this.whoopAuth.getValidTokenForUser(userId)
    if (whoopToken) {
      results.whoop = {
        recovery: await this.syncWhoopRecovery(userId),
        sleep: await this.syncWhoopSleep(userId),
        activity: await this.syncWhoopActivity(userId)
      }
    }

    // Sync Oura data
    const ouraToken = await this.ouraAuth.getValidTokenForUser(userId)
    if (ouraToken) {
      results.oura = {
        recovery: await this.syncOuraReadiness(userId),
        sleep: await this.syncOuraSleep(userId),
        activity: await this.syncOuraActivity(userId)
      }
    }

    // Sync Garmin data
    const garminToken = await this.garminAuth.getValidTokenForUser(userId)
    if (garminToken) {
      results.garmin = {
        activity: await this.syncGarminActivity(userId)
      }
    }

    // Sync Fitbit data
    const fitbitToken = await this.fitbitAuth.getValidTokenForUser(userId)
    if (fitbitToken) {
      results.fitbit = {
        recovery: await this.syncFitbitRecovery(userId),
        sleep: await this.syncFitbitSleep(userId),
        activity: await this.syncFitbitActivity(userId)
      }
    }

    return results
  }

  /**
   * Sync Whoop recovery data
   */
  private async syncWhoopRecovery(userId: string): Promise<SyncResult> {
    try {
      await this.updateSyncStatus(userId, 'whoop', 'recovery', 'started')

      const token = await this.whoopAuth.getValidTokenForUser(userId)
      if (!token) {
        throw new Error('No valid Whoop token')
      }

      // Get last 60 days of data
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - (60 * 24 * 60 * 60 * 1000))

      const response = await fetch(
        `https://api.prod.whoop.com/developer/v1/recovery?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Whoop API error: ${response.status}`)
      }

      const data = await response.json()
      let syncedCount = 0

      for (const recovery of data.records || []) {
        const recoveryDate = new Date(recovery.created_at).toISOString().split('T')[0]
        
        await supabase
          .from('wearable_recovery_data')
          .upsert({
            user_id: userId,
            provider: 'whoop',
            date: recoveryDate,
            recovery_score: recovery.score?.recovery_score || null,
            hrv_rmssd: recovery.score?.hrv_rmssd_milli || null,
            resting_heart_rate: recovery.score?.resting_heart_rate || null,
            strain: null, // Whoop strain is in workouts, not recovery
            raw_data: recovery,
            data_date: recovery.created_at,
            synced_at: new Date().toISOString()
          })
        
        syncedCount++
      }

      await this.updateSyncStatus(userId, 'whoop', 'recovery', 'success', syncedCount)
      return { success: true, synced: syncedCount }
    } catch (error) {
      console.error('Error syncing Whoop recovery:', error)
      await this.updateSyncStatus(userId, 'whoop', 'recovery', 'error', 0, error instanceof Error ? error.message : 'Unknown error')
      return { success: false, synced: 0, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Sync Whoop sleep data
   */
  private async syncWhoopSleep(userId: string): Promise<SyncResult> {
    try {
      await this.updateSyncStatus(userId, 'whoop', 'sleep', 'started')

      const token = await this.whoopAuth.getValidTokenForUser(userId)
      if (!token) {
        throw new Error('No valid Whoop token')
      }

      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - (60 * 24 * 60 * 60 * 1000))

      const response = await fetch(
        `https://api.prod.whoop.com/developer/v1/activity/sleep?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Whoop API error: ${response.status}`)
      }

      const data = await response.json()
      let syncedCount = 0

      for (const sleep of data.records || []) {
        const sleepDate = new Date(sleep.start).toISOString().split('T')[0]
        
        await supabase
          .from('wearable_sleep_data')
          .upsert({
            user_id: userId,
            provider: 'whoop',
            date: sleepDate,
            sleep_start: sleep.start,
            sleep_end: sleep.end,
            total_sleep_duration: Math.round((sleep.score?.stage_summary?.total_in_bed_time_milli || 0) / 60000),
            deep_sleep_duration: Math.round((sleep.score?.stage_summary?.total_slow_wave_sleep_time_milli || 0) / 60000),
            rem_sleep_duration: Math.round((sleep.score?.stage_summary?.total_rem_sleep_time_milli || 0) / 60000),
            light_sleep_duration: Math.round((sleep.score?.stage_summary?.total_light_sleep_time_milli || 0) / 60000),
            awake_duration: Math.round((sleep.score?.stage_summary?.total_awake_time_milli || 0) / 60000),
            sleep_efficiency: sleep.score?.sleep_performance_percentage || null,
            sleep_score: sleep.score?.sleep_performance_percentage || null,
            raw_data: sleep,
            data_date: sleep.start,
            synced_at: new Date().toISOString()
          })
        
        syncedCount++
      }

      await this.updateSyncStatus(userId, 'whoop', 'sleep', 'success', syncedCount)
      return { success: true, synced: syncedCount }
    } catch (error) {
      console.error('Error syncing Whoop sleep:', error)
      await this.updateSyncStatus(userId, 'whoop', 'sleep', 'error', 0, error instanceof Error ? error.message : 'Unknown error')
      return { success: false, synced: 0, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Sync Whoop activity/workout data
   */
  private async syncWhoopActivity(userId: string): Promise<SyncResult> {
    try {
      await this.updateSyncStatus(userId, 'whoop', 'activity', 'started')

      const token = await this.whoopAuth.getValidTokenForUser(userId)
      if (!token) {
        throw new Error('No valid Whoop token')
      }

      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - (60 * 24 * 60 * 60 * 1000))

      const response = await fetch(
        `https://api.prod.whoop.com/developer/v1/activity/workout?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Whoop API error: ${response.status}`)
      }

      const data = await response.json()
      let syncedCount = 0

      for (const workout of data.records || []) {
        await supabase
          .from('wearable_activity_data')
          .upsert({
            user_id: userId,
            provider: 'whoop',
            activity_id: workout.id?.toString(),
            activity_type: workout.sport_name || 'Unknown',
            sport_type: workout.sport_name,
            start_time: workout.start,
            end_time: workout.end,
            duration: Math.round((new Date(workout.end).getTime() - new Date(workout.start).getTime()) / 1000),
            calories: workout.score?.kilojoule ? Math.round(workout.score.kilojoule * 0.239006) : null,
            average_heart_rate: workout.score?.average_heart_rate || null,
            max_heart_rate: workout.score?.max_heart_rate || null,
            strain: workout.score?.strain || null,
            kilojoules: workout.score?.kilojoule || null,
            raw_data: workout,
            data_date: workout.start,
            synced_at: new Date().toISOString()
          })
        
        syncedCount++
      }

      await this.updateSyncStatus(userId, 'whoop', 'activity', 'success', syncedCount)
      return { success: true, synced: syncedCount }
    } catch (error) {
      console.error('Error syncing Whoop activity:', error)
      await this.updateSyncStatus(userId, 'whoop', 'activity', 'error', 0, error instanceof Error ? error.message : 'Unknown error')
      return { success: false, synced: 0, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Sync Oura readiness (recovery) data
   */
  private async syncOuraReadiness(userId: string): Promise<SyncResult> {
    try {
      await this.updateSyncStatus(userId, 'oura', 'recovery', 'started')

      const token = await this.ouraAuth.getValidTokenForUser(userId)
      if (!token) {
        throw new Error('No valid Oura token')
      }

      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - (60 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]

      const response = await fetch(
        `https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${startDate}&end_date=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Oura API error: ${response.status}`)
      }

      const data = await response.json()
      let syncedCount = 0

      for (const readiness of data.data || []) {
        await supabase
          .from('wearable_recovery_data')
          .upsert({
            user_id: userId,
            provider: 'oura',
            date: readiness.day,
            recovery_score: readiness.score || null,
            hrv_rmssd: readiness.contributors?.hrv || null,
            resting_heart_rate: readiness.contributors?.resting_heart_rate || null,
            body_temperature: readiness.contributors?.body_temperature || null,
            raw_data: readiness,
            data_date: readiness.timestamp || readiness.day,
            synced_at: new Date().toISOString()
          })
        
        syncedCount++
      }

      await this.updateSyncStatus(userId, 'oura', 'recovery', 'success', syncedCount)
      return { success: true, synced: syncedCount }
    } catch (error) {
      console.error('Error syncing Oura readiness:', error)
      await this.updateSyncStatus(userId, 'oura', 'recovery', 'error', 0, error instanceof Error ? error.message : 'Unknown error')
      return { success: false, synced: 0, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Sync Oura sleep data
   */
  private async syncOuraSleep(userId: string): Promise<SyncResult> {
    try {
      await this.updateSyncStatus(userId, 'oura', 'sleep', 'started')

      const token = await this.ouraAuth.getValidTokenForUser(userId)
      if (!token) {
        throw new Error('No valid Oura token')
      }

      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - (60 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]

      const response = await fetch(
        `https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${startDate}&end_date=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Oura API error: ${response.status}`)
      }

      const data = await response.json()
      let syncedCount = 0

      for (const sleep of data.data || []) {
        await supabase
          .from('wearable_sleep_data')
          .upsert({
            user_id: userId,
            provider: 'oura',
            date: sleep.day,
            sleep_start: sleep.bedtime_start,
            sleep_end: sleep.bedtime_end,
            total_sleep_duration: sleep.total_sleep_duration ? Math.round(sleep.total_sleep_duration / 60) : null,
            deep_sleep_duration: sleep.deep_sleep_duration ? Math.round(sleep.deep_sleep_duration / 60) : null,
            rem_sleep_duration: sleep.rem_sleep_duration ? Math.round(sleep.rem_sleep_duration / 60) : null,
            light_sleep_duration: sleep.light_sleep_duration ? Math.round(sleep.light_sleep_duration / 60) : null,
            awake_duration: sleep.awake_time ? Math.round(sleep.awake_time / 60) : null,
            sleep_efficiency: sleep.efficiency || null,
            sleep_score: sleep.score || null,
            sleep_onset_latency: sleep.latency ? Math.round(sleep.latency / 60) : null,
            average_heart_rate: sleep.heart_rate?.average || null,
            lowest_heart_rate: sleep.heart_rate?.minimum || null,
            average_hrv: sleep.hrv?.average || null,
            raw_data: sleep,
            data_date: sleep.bedtime_start || sleep.day,
            synced_at: new Date().toISOString()
          })
        
        syncedCount++
      }

      await this.updateSyncStatus(userId, 'oura', 'sleep', 'success', syncedCount)
      return { success: true, synced: syncedCount }
    } catch (error) {
      console.error('Error syncing Oura sleep:', error)
      await this.updateSyncStatus(userId, 'oura', 'sleep', 'error', 0, error instanceof Error ? error.message : 'Unknown error')
      return { success: false, synced: 0, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Sync Oura activity data
   */
  private async syncOuraActivity(userId: string): Promise<SyncResult> {
    try {
      await this.updateSyncStatus(userId, 'oura', 'activity', 'started')

      const token = await this.ouraAuth.getValidTokenForUser(userId)
      if (!token) {
        throw new Error('No valid Oura token')
      }

      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - (60 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]

      // Sync daily activity summary
      const response = await fetch(
        `https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${startDate}&end_date=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Oura API error: ${response.status}`)
      }

      const data = await response.json()
      let syncedCount = 0

      for (const activity of data.data || []) {
        await supabase
          .from('wearable_activity_data')
          .upsert({
            user_id: userId,
            provider: 'oura',
            activity_id: `daily_${activity.day}`,
            activity_type: 'Daily Activity',
            sport_type: 'Daily Activity',
            start_time: activity.day + 'T00:00:00Z',
            end_time: activity.day + 'T23:59:59Z',
            duration: 86400, // Full day in seconds
            calories: activity.active_calories || null,
            average_heart_rate: activity.average_met_minutes || null,
            raw_data: activity,
            data_date: activity.day,
            synced_at: new Date().toISOString()
          })
        
        syncedCount++
      }

      await this.updateSyncStatus(userId, 'oura', 'activity', 'success', syncedCount)
      return { success: true, synced: syncedCount }
    } catch (error) {
      console.error('Error syncing Oura activity:', error)
      await this.updateSyncStatus(userId, 'oura', 'activity', 'error', 0, error instanceof Error ? error.message : 'Unknown error')
      return { success: false, synced: 0, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Sync Garmin activity data (placeholder - implement based on Garmin API)
   */
  private async syncGarminActivity(userId: string): Promise<SyncResult> {
    try {
      await this.updateSyncStatus(userId, 'garmin', 'activity', 'started')
      
      // TODO: Implement Garmin activity sync when Garmin integration is complete
      await this.updateSyncStatus(userId, 'garmin', 'activity', 'success', 0)
      return { success: true, synced: 0 }
    } catch (error) {
      console.error('Error syncing Garmin activity:', error)
      await this.updateSyncStatus(userId, 'garmin', 'activity', 'error', 0, error instanceof Error ? error.message : 'Unknown error')
      return { success: false, synced: 0, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Sync Fitbit recovery data
   */
  private async syncFitbitRecovery(userId: string): Promise<SyncResult> {
    try {
      await this.updateSyncStatus(userId, 'fitbit', 'recovery', 'started')

      const token = await this.fitbitAuth.getValidTokenForUser(userId)
      if (!token) {
        throw new Error('No valid Fitbit token')
      }

      // Get last 60 days of data
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - (60 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]

      const multiDayData = await fitbitAPI.getMultipleDaysData(
        token,
        startDate,
        endDate,
        ['heartrate', 'sleep']
      )

      let syncedCount = 0

      for (const recovery of multiDayData.recovery) {
        await supabase
          .from('wearable_recovery_data')
          .upsert({
            user_id: userId,
            provider: 'fitbit',
            date: recovery.date,
            recovery_score: recovery.recovery_score || null,
            hrv_rmssd: recovery.hrv_rmssd || null,
            resting_heart_rate: recovery.resting_heart_rate || null,
            body_temperature: recovery.body_temperature || null,
            skin_temp: recovery.skin_temp || null,
            spo2: recovery.spo2 || null,
            sleep_performance: recovery.sleep_performance || null,
            strain: recovery.strain || null,
            raw_data: recovery.raw_data,
            data_date: recovery.date,
            synced_at: new Date().toISOString()
          })
        
        syncedCount++
      }

      await this.updateSyncStatus(userId, 'fitbit', 'recovery', 'success', syncedCount)
      return { success: true, synced: syncedCount }
    } catch (error) {
      console.error('Error syncing Fitbit recovery:', error)
      await this.updateSyncStatus(userId, 'fitbit', 'recovery', 'error', 0, error instanceof Error ? error.message : 'Unknown error')
      return { success: false, synced: 0, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Sync Fitbit sleep data
   */
  private async syncFitbitSleep(userId: string): Promise<SyncResult> {
    try {
      await this.updateSyncStatus(userId, 'fitbit', 'sleep', 'started')

      const token = await this.fitbitAuth.getValidTokenForUser(userId)
      if (!token) {
        throw new Error('No valid Fitbit token')
      }

      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - (60 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]

      const multiDayData = await fitbitAPI.getMultipleDaysData(
        token,
        startDate,
        endDate,
        ['sleep']
      )

      let syncedCount = 0

      for (const sleep of multiDayData.sleep) {
        await supabase
          .from('wearable_sleep_data')
          .upsert({
            user_id: userId,
            provider: 'fitbit',
            date: sleep.date,
            sleep_start: sleep.sleep_start,
            sleep_end: sleep.sleep_end,
            total_sleep_duration: sleep.total_sleep_duration,
            deep_sleep_duration: sleep.deep_sleep_duration,
            rem_sleep_duration: sleep.rem_sleep_duration,
            light_sleep_duration: sleep.light_sleep_duration,
            awake_duration: sleep.awake_duration,
            sleep_efficiency: sleep.sleep_efficiency,
            sleep_score: sleep.sleep_score,
            sleep_onset_latency: sleep.sleep_onset_latency,
            wake_count: sleep.wake_count,
            average_heart_rate: sleep.average_heart_rate,
            lowest_heart_rate: sleep.lowest_heart_rate,
            average_hrv: sleep.average_hrv,
            raw_data: sleep.raw_data,
            data_date: sleep.sleep_start || sleep.date,
            synced_at: new Date().toISOString()
          })
        
        syncedCount++
      }

      await this.updateSyncStatus(userId, 'fitbit', 'sleep', 'success', syncedCount)
      return { success: true, synced: syncedCount }
    } catch (error) {
      console.error('Error syncing Fitbit sleep:', error)
      await this.updateSyncStatus(userId, 'fitbit', 'sleep', 'error', 0, error instanceof Error ? error.message : 'Unknown error')
      return { success: false, synced: 0, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Sync Fitbit activity data
   */
  private async syncFitbitActivity(userId: string): Promise<SyncResult> {
    try {
      await this.updateSyncStatus(userId, 'fitbit', 'activity', 'started')

      const token = await this.fitbitAuth.getValidTokenForUser(userId)
      if (!token) {
        throw new Error('No valid Fitbit token')
      }

      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - (60 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]

      const multiDayData = await fitbitAPI.getMultipleDaysData(
        token,
        startDate,
        endDate,
        ['activity']
      )

      let syncedCount = 0

      for (const activity of multiDayData.activities) {
        await supabase
          .from('wearable_activity_data')
          .upsert({
            user_id: userId,
            provider: 'fitbit',
            activity_id: activity.activity_id,
            activity_type: activity.activity_type,
            sport_type: activity.sport_type,
            start_time: activity.start_time,
            end_time: activity.end_time,
            duration: activity.duration,
            distance: activity.distance,
            calories: activity.calories,
            average_heart_rate: activity.average_heart_rate,
            max_heart_rate: activity.max_heart_rate,
            strain: activity.strain,
            kilojoules: activity.kilojoules,
            altitude_gain: activity.altitude_gain,
            altitude_loss: activity.altitude_loss,
            zones: activity.zones,
            raw_data: activity.raw_data,
            data_date: activity.start_time || new Date().toISOString(),
            synced_at: new Date().toISOString()
          })
        
        syncedCount++
      }

      await this.updateSyncStatus(userId, 'fitbit', 'activity', 'success', syncedCount)
      return { success: true, synced: syncedCount }
    } catch (error) {
      console.error('Error syncing Fitbit activity:', error)
      await this.updateSyncStatus(userId, 'fitbit', 'activity', 'error', 0, error instanceof Error ? error.message : 'Unknown error')
      return { success: false, synced: 0, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Update sync status in database
   */
  private async updateSyncStatus(
    userId: string, 
    provider: string, 
    dataType: string, 
    status: 'started' | 'success' | 'error',
    syncCount: number = 0,
    errorMessage?: string
  ) {
    const now = new Date().toISOString()
    
    const updateData: any = {
      user_id: userId,
      provider,
      data_type: dataType,
      last_sync_at: now,
      sync_count: syncCount
    }

    if (status === 'success') {
      updateData.last_successful_sync_at = now
      updateData.last_sync_error = null
    } else if (status === 'error') {
      updateData.last_sync_error = errorMessage
    }

    await supabase
      .from('wearable_sync_status')
      .upsert(updateData)
  }

  /**
   * Get data from Supabase (for trainers viewing client data)
   */
  async getStoredRecoveryData(userId: string, days: number = 60) {
    const { data, error } = await supabase
      .from('wearable_recovery_data')
      .select('*')
      .eq('user_id', userId)
      .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching stored recovery data:', error)
      return []
    }

    return data || []
  }

  async getStoredSleepData(userId: string, days: number = 60) {
    const { data, error } = await supabase
      .from('wearable_sleep_data')
      .select('*')
      .eq('user_id', userId)
      .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching stored sleep data:', error)
      return []
    }

    return data || []
  }

  async getStoredActivityData(userId: string, days: number = 60) {
    const { data, error } = await supabase
      .from('wearable_activity_data')
      .select('*')
      .eq('user_id', userId)
      .gte('data_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('data_date', { ascending: false })

    if (error) {
      console.error('Error fetching stored activity data:', error)
      return []
    }

    return data || []
  }
}
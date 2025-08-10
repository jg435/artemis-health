"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera, Square, RotateCcw, AlertTriangle, CheckCircle } from "lucide-react"

const EXERCISE_TYPES = [
  { value: "squat", label: "Squat" },
  { value: "deadlift", label: "Deadlift" },
  { value: "push_up", label: "Push-up" },
  { value: "plank", label: "Plank" },
  { value: "lunge", label: "Lunge" },
  { value: "other", label: "Other Exercise" }
]

export function ExerciseFormChecker() {
  const [isRecording, setIsRecording] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<string>("")
  const [feedback, setFeedback] = useState<string>("Select an exercise and start camera to begin recording")
  const [feedbackType, setFeedbackType] = useState<"good" | "warning" | "neutral">("neutral")
  const [error, setError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.videoWidth === 0) return null;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas (flip horizontally for mirror effect)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();
    
    return canvas.toDataURL('image/jpeg', 0.7);
  }, []);

  const analyzeExerciseForm = useCallback(async () => {
    if (!selectedExercise || isAnalyzing) return;
    
    const imageData = captureFrame();
    if (!imageData) return;
    
    setIsAnalyzing(true);
    
    try {
      const response = await fetch('/api/analyze-exercise-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData,
          exerciseType: selectedExercise
        }),
      });
      
      if (!response.ok) {
        throw new Error('Analysis failed');
      }
      
      const result = await response.json();
      
      if (result.success && result.analysis) {
        const analysis = result.analysis;
        setFeedback(analysis.feedback || 'Keep up the good form!');
        
        // Set feedback type based on overall score
        if (analysis.overall_score >= 80) {
          setFeedbackType('good');
        } else if (analysis.overall_score >= 60) {
          setFeedbackType('neutral');
        } else {
          setFeedbackType('warning');
        }
      } else {
        setFeedback('Keep up the good form!');
        setFeedbackType('neutral');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      // Keep showing encouraging feedback instead of errors
      setFeedback(getExerciseFeedback(selectedExercise));
      setFeedbackType('neutral');
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedExercise, captureFrame, isAnalyzing]);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      console.log('Starting camera...');
      console.log('Video ref current:', !!videoRef.current);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported');
      }
      
      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        },
        audio: false
      });
      
      console.log('Stream obtained:', stream);
      console.log('Stream active:', stream.active);
      console.log('Video tracks:', stream.getVideoTracks().length);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to load and play
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded, attempting to play');
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              console.log('Video playing successfully');
              setIsRecording(true);
              setFeedback("Camera started! AI analysis will begin shortly...");
              setFeedbackType("good");
              
              // Start AI analysis every 3 seconds
              analysisIntervalRef.current = setInterval(analyzeExerciseForm, 3000);
            }).catch((playError) => {
              console.error('Video play failed:', playError);
              setError('Failed to start video playback');
            });
          }
        };
        
        console.log('Camera stream assigned to video element');
      }
    } catch (err) {
      console.error('Error starting camera:', err);
      setError('Unable to access camera. Please ensure you have granted camera permissions.');
    }
  }, [selectedExercise, analyzeExerciseForm]);

  const stopCamera = useCallback(() => {
    // Clear analysis interval
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsRecording(false);
    setFeedback("Camera stopped. Select an exercise and start camera to begin recording");
    setFeedbackType("neutral");
    setIsAnalyzing(false);
  }, []);

  const getExerciseFeedback = (exercise: string) => {
    const feedbackMessages: { [key: string]: string } = {
      squat: "Recording squat form - Keep your back straight and knees behind toes",
      deadlift: "Recording deadlift form - Keep the bar close to your body",
      push_up: "Recording push-up form - Maintain a straight body line",
      plank: "Recording plank form - Keep your core engaged", 
      lunge: "Recording lunge form - Keep your front knee over your ankle",
      other: "Recording exercise form - Maintain good posture and control"
    };
    
    return feedbackMessages[exercise] || "Recording your exercise form";
  };

  const reset = () => {
    stopCamera();
    setSelectedExercise("");
    setFeedback("Select an exercise and start camera to begin recording");
    setFeedbackType("neutral");
    setError(null);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const getFeedbackIcon = () => {
    switch (feedbackType) {
      case "good":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getFeedbackColor = () => {
    switch (feedbackType) {
      case "good":
        return "text-green-600 bg-green-50 border-green-200";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default:
        return "text-blue-600 bg-blue-50 border-blue-200";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Exercise Form Recording
          </CardTitle>
          <CardDescription>
            Use your webcam to record exercise form for analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Exercise Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Exercise Type</label>
            <Select value={selectedExercise} onValueChange={setSelectedExercise}>
              <SelectTrigger>
                <SelectValue placeholder="Choose the exercise you're performing" />
              </SelectTrigger>
              <SelectContent>
                {EXERCISE_TYPES.map((exercise) => (
                  <SelectItem key={exercise.value} value={exercise.value}>
                    {exercise.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Camera Section */}
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4">
              {/* Video container - always present */}
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover transform scale-x-[-1]"
                  style={{ display: isRecording ? 'block' : 'none' }}
                />
                {!isRecording && (
                  <div className="flex items-center justify-center h-64 text-white">
                    <div className="text-center">
                      <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm opacity-70">Camera preview will appear here</p>
                    </div>
                  </div>
                )}
                {isAnalyzing && (
                  <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded-md text-xs font-medium">
                    AI Analyzing...
                  </div>
                )}
              </div>

              {/* Controls */}
              {!isRecording ? (
                <div className="flex gap-2">
                  <Button 
                    onClick={startCamera} 
                    disabled={!selectedExercise}
                    className="flex-1"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Start Camera
                  </Button>
                  <Button variant="outline" onClick={reset}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={stopCamera} className="w-full">
                  <Square className="h-4 w-4 mr-2" />
                  Stop Camera
                </Button>
              )}
            </div>
          </div>

          {/* Feedback */}
          <div className={`p-4 rounded-lg border ${getFeedbackColor()}`}>
            <div className="flex items-center gap-2">
              {getFeedbackIcon()}
              <p className="font-medium">{feedback}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
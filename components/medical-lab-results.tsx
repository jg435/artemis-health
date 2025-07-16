"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Stethoscope, AlertTriangle, CheckCircle, TrendingUp, Upload, Camera, Loader2 } from "lucide-react"
import { getMedicalLabResults } from "@/lib/database"
import { useAuth } from "@/context/auth-context"

interface LabResult {
  "Test Name": string
  Result: number
  Unit: string
  "Reference Range": string
  Flag: string
}

export function MedicalLabResults() {
  const { user } = useAuth()
  const [data, setData] = useState<LabResult[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const labData = await getMedicalLabResults(user?.id, user)
      setData(labData)
    } catch (error) {
      console.error("Error fetching lab results:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return


    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file")
      return
    }

    setUploading(true)
    setUploadError(null)
    setUploadSuccess(null)

    try {
      // Convert image to base64
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target?.result as string

        try {
          if (user?.isDemo) {
            // In demo mode, simulate the analysis without saving
            const mockResults: LabResult[] = [
              {
                "Test Name": "Total Cholesterol",
                Result: 195,
                Unit: "mg/dL",
                "Reference Range": "<200",
                Flag: "Normal"
              },
              {
                "Test Name": "HDL Cholesterol",
                Result: 55,
                Unit: "mg/dL", 
                "Reference Range": ">40",
                Flag: "Normal"
              },
              {
                "Test Name": "LDL Cholesterol",
                Result: 120,
                Unit: "mg/dL",
                "Reference Range": "<130",
                Flag: "Normal"
              },
              {
                "Test Name": "Triglycerides",
                Result: 110,
                Unit: "mg/dL",
                "Reference Range": "<150", 
                Flag: "Normal"
              }
            ]
            
            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            // Update local state only (not persisted)
            setData(prev => [...mockResults, ...prev])
            setUploadSuccess("Demo: Medical record analyzed successfully (not saved)")
          } else {
            const response = await fetch("/api/medical-records/upload", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                image: base64,
                userId: user?.id || "anonymous",
              }),
            })

            const result = await response.json()

            if (!response.ok) {
              throw new Error(result.error || "Upload failed")
            }

            setUploadSuccess(result.message)
          }
          fetchData() // Refresh the data
        } catch (error) {
          console.error("Upload error:", error)
          setUploadError(error instanceof Error ? error.message : "Upload failed")
        } finally {
          setUploading(false)
        }
      }

      reader.readAsDataURL(file)
    } catch (error) {
      console.error("File reading error:", error)
      setUploadError("Failed to read file")
      setUploading(false)
    }
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getFlagColor = (flag: string) => {
    switch (flag?.toLowerCase()) {
      case "high":
      case "h":
        return "destructive"
      case "low":
      case "l":
        return "secondary"
      case "critical":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getFlagIcon = (flag: string) => {
    switch (flag?.toLowerCase()) {
      case "high":
      case "h":
      case "critical":
        return <AlertTriangle className="w-4 h-4" />
      case "low":
      case "l":
        return <TrendingUp className="w-4 h-4" />
      default:
        return <CheckCircle className="w-4 h-4" />
    }
  }

  const abnormalResults = data.filter((result) => result.Flag && result.Flag.toLowerCase() !== "normal")
  const normalResults = data.filter((result) => !result.Flag || result.Flag.toLowerCase() === "normal")

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Lab Results</CardTitle>
          <CardDescription>Take a photo or upload an image of your medical lab results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* HIPAA Disclaimer */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Privacy Notice:</strong> This application is not HIPAA compliant. Your medical data will not be stored in a secure, HIPAA-compliant manner. Please do not upload sensitive health information if privacy compliance is required.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                onClick={triggerFileUpload}
                disabled={uploading}
                className="flex items-center gap-2"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploading ? "Processing..." : "Upload Image"}
              </Button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {uploadSuccess && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-green-600">
                  {uploadSuccess}
                </AlertDescription>
              </Alert>
            )}

            {uploadError && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-600">
                  {uploadError}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Lab results available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Normal Results</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{normalResults.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Within reference range</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abnormal Results</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{abnormalResults.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Outside reference range</p>
          </CardContent>
        </Card>
      </div>

      {/* Abnormal Results Alert */}
      {abnormalResults.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have {abnormalResults.length} test result(s) outside the normal range. Please consult with your
            healthcare provider to discuss these findings.
          </AlertDescription>
        </Alert>
      )}

      {/* Lab Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lab Results</CardTitle>
          <CardDescription>Your latest medical test results</CardDescription>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Stethoscope className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No lab results available</p>
              <p className="text-sm">Upload your lab results to see them here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                      {getFlagIcon(result.Flag)}
                    </div>
                    <div>
                      <p className="font-medium">{result["Test Name"]}</p>
                      <p className="text-sm text-muted-foreground">Reference: {result["Reference Range"]}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="text-lg font-semibold">
                          {result.Result} {result.Unit}
                        </p>
                      </div>
                      {result.Flag && <Badge variant={getFlagColor(result.Flag)}>{result.Flag.toUpperCase()}</Badge>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

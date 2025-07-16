export async function GET(request: Request) {
  try {
    // Generate demo medical lab results with hardcoded data
    const demoData = generateDemoMedicalData();
    
    return Response.json(demoData);
  } catch (error) {
    console.error('Error in demo medical endpoint:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateDemoMedicalData() {
  const data = [];
  const now = new Date();
  
  // Recent comprehensive metabolic panel
  const recentDate = new Date(now);
  recentDate.setDate(recentDate.getDate() - 30);
  
  const recentLabs = {
    id: `demo-labs-recent-${Date.now()}`,
    user_id: `demo-user-${Date.now()}`,
    test_date: recentDate.toISOString().split('T')[0],
    test_name: "Comprehensive Metabolic Panel",
    results: {
      "Glucose": { value: 92, unit: "mg/dL", reference_range: "70-100", status: "normal" },
      "BUN": { value: 18, unit: "mg/dL", reference_range: "7-20", status: "normal" },
      "Creatinine": { value: 1.0, unit: "mg/dL", reference_range: "0.7-1.3", status: "normal" },
      "Sodium": { value: 140, unit: "mEq/L", reference_range: "136-145", status: "normal" },
      "Potassium": { value: 4.2, unit: "mEq/L", reference_range: "3.5-5.0", status: "normal" },
      "Chloride": { value: 102, unit: "mEq/L", reference_range: "98-107", status: "normal" },
      "CO2": { value: 24, unit: "mEq/L", reference_range: "22-28", status: "normal" },
      "Total Protein": { value: 7.2, unit: "g/dL", reference_range: "6.0-8.3", status: "normal" },
      "Albumin": { value: 4.5, unit: "g/dL", reference_range: "3.5-5.0", status: "normal" },
      "Total Bilirubin": { value: 0.8, unit: "mg/dL", reference_range: "0.3-1.2", status: "normal" },
      "ALT": { value: 28, unit: "U/L", reference_range: "7-40", status: "normal" },
      "AST": { value: 25, unit: "U/L", reference_range: "10-40", status: "normal" }
    },
    created_at: recentDate.toISOString(),
    updated_at: recentDate.toISOString()
  };
  
  // Lipid panel from 3 months ago
  const lipidDate = new Date(now);
  lipidDate.setDate(lipidDate.getDate() - 90);
  
  const lipidPanel = {
    id: `demo-labs-lipid-${Date.now()}`,
    user_id: `demo-user-${Date.now()}`,
    test_date: lipidDate.toISOString().split('T')[0],
    test_name: "Lipid Panel",
    results: {
      "Total Cholesterol": { value: 185, unit: "mg/dL", reference_range: "<200", status: "normal" },
      "LDL Cholesterol": { value: 110, unit: "mg/dL", reference_range: "<100", status: "high" },
      "HDL Cholesterol": { value: 58, unit: "mg/dL", reference_range: ">40", status: "normal" },
      "Triglycerides": { value: 85, unit: "mg/dL", reference_range: "<150", status: "normal" },
      "Non-HDL Cholesterol": { value: 127, unit: "mg/dL", reference_range: "<130", status: "normal" }
    },
    created_at: lipidDate.toISOString(),
    updated_at: lipidDate.toISOString()
  };
  
  // Complete Blood Count from 6 months ago
  const cbcDate = new Date(now);
  cbcDate.setDate(cbcDate.getDate() - 180);
  
  const cbcPanel = {
    id: `demo-labs-cbc-${Date.now()}`,
    user_id: `demo-user-${Date.now()}`,
    test_date: cbcDate.toISOString().split('T')[0],
    test_name: "Complete Blood Count",
    results: {
      "White Blood Cells": { value: 6.8, unit: "K/uL", reference_range: "4.0-10.0", status: "normal" },
      "Red Blood Cells": { value: 4.7, unit: "M/uL", reference_range: "4.2-5.4", status: "normal" },
      "Hemoglobin": { value: 15.2, unit: "g/dL", reference_range: "13.5-17.5", status: "normal" },
      "Hematocrit": { value: 44.8, unit: "%", reference_range: "41-50", status: "normal" },
      "Platelets": { value: 285, unit: "K/uL", reference_range: "150-400", status: "normal" },
      "Neutrophils": { value: 58, unit: "%", reference_range: "50-70", status: "normal" },
      "Lymphocytes": { value: 32, unit: "%", reference_range: "20-40", status: "normal" }
    },
    created_at: cbcDate.toISOString(),
    updated_at: cbcDate.toISOString()
  };
  
  data.push(recentLabs, lipidPanel, cbcPanel);
  
  return data;
}
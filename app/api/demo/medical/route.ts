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
  
  // Recent lab results - Latest Test
  const recentDate = new Date(now);
  recentDate.setDate(recentDate.getDate() - 15);
  
  const recentLabs = {
    id: `demo-labs-recent-${Date.now()}`,
    user_id: `demo-user-${Date.now()}`,
    test_date: recentDate.toISOString().split('T')[0],
    test_name: "Basic Metabolic Panel",
    results: {
      "Glucose": { value: 50, unit: "mg/dL", reference_range: "70-100", status: "low" }
    },
    created_at: recentDate.toISOString(),
    updated_at: recentDate.toISOString()
  };
  
  // Cholesterol panel from 1 month ago
  const cholesterolDate = new Date(now);
  cholesterolDate.setDate(cholesterolDate.getDate() - 30);
  
  const cholesterolPanel = {
    id: `demo-labs-cholesterol-${Date.now()}`,
    user_id: `demo-user-${Date.now()}`,
    test_date: cholesterolDate.toISOString().split('T')[0],
    test_name: "Lipid Panel",
    results: {
      "Total Cholesterol": { value: 245, unit: "mg/dL", reference_range: "<200", status: "high" }
    },
    created_at: cholesterolDate.toISOString(),
    updated_at: cholesterolDate.toISOString()
  };
  
  // Protein panel from 2 months ago
  const proteinDate = new Date(now);
  proteinDate.setDate(proteinDate.getDate() - 60);
  
  const proteinPanel = {
    id: `demo-labs-protein-${Date.now()}`,
    user_id: `demo-user-${Date.now()}`,
    test_date: proteinDate.toISOString().split('T')[0],
    test_name: "Protein Studies",
    results: {
      "Globulin": { value: 2.8, unit: "g/dL", reference_range: "2.3-3.4", status: "normal" }
    },
    created_at: proteinDate.toISOString(),
    updated_at: proteinDate.toISOString()
  };
  
  data.push(recentLabs, cholesterolPanel, proteinPanel);
  
  return data;
}
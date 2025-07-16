import { AuthService } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // Get the authenticated user
    const authService = new AuthService();
    const cookies = request.headers.get('cookie') || '';
    const userSessionMatch = cookies.match(/user_session=([^;]*)/);
    const userSession = userSessionMatch ? userSessionMatch[1] : null;

    if (!userSession) {
      return Response.json({ foodEntries: [] });
    }

    const user = await authService.getUser(userSession);
    if (!user) {
      return Response.json({ foodEntries: [] });
    }

    // Generate demo food entries
    const demoData = generateDemoFoodEntries(user.id);
    
    return Response.json({ foodEntries: demoData });
  } catch (error) {
    console.error('Error in demo food-entries endpoint:', error);
    return Response.json({ foodEntries: [] });
  }
}

function generateDemoFoodEntries(userId: string) {
  const data = [];
  const now = new Date();
  
  const demoEntries = [
    {
      meal_type: "breakfast",
      food_name: "Avocado Toast with Eggs",
      calories: 420,
      logged_at_offset: 0, // today
      photo_url: null,
      metadata: {
        location: "Home",
        socialContext: "alone",
        hungerLevel: 7,
        moodBefore: "tired",
        moodAfter: "energetic",
        portionSize: "normal",
        preparationMethod: "Toasted",
        healthScore: 85,
        recommendations: [
          "Excellent protein and healthy fat combination",
          "Good choice for sustained energy"
        ]
      }
    },
    {
      meal_type: "lunch",
      food_name: "Mediterranean Quinoa Bowl",
      calories: 480,
      logged_at_offset: 0,
      photo_url: null,
      metadata: {
        location: "Office",
        socialContext: "colleagues",
        hungerLevel: 8,
        moodBefore: "focused",
        moodAfter: "satisfied",
        portionSize: "large",
        preparationMethod: "Fresh",
        healthScore: 92,
        recommendations: [
          "Great variety of nutrients",
          "High fiber content supports digestion"
        ]
      }
    },
    {
      meal_type: "snack",
      food_name: "Greek Yogurt with Berries",
      calories: 180,
      logged_at_offset: 1, // yesterday
      photo_url: null,
      metadata: {
        location: "Home",
        socialContext: "alone",
        hungerLevel: 4,
        moodBefore: "neutral",
        moodAfter: "content",
        portionSize: "small",
        preparationMethod: "Fresh",
        healthScore: 88,
        recommendations: [
          "Great source of probiotics",
          "Perfect pre-workout snack"
        ]
      }
    }
  ];
  
  demoEntries.forEach((entry, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - entry.logged_at_offset);
    
    data.push({
      id: `demo-food-entry-${userId}-${index}`,
      meal_type: entry.meal_type,
      food_name: entry.food_name,
      calories: entry.calories,
      logged_at: date.toISOString(),
      photo_url: entry.photo_url,
      metadata: entry.metadata
    });
  });
  
  return data;
}
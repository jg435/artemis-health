import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

interface WhoopWebhookEvent {
  id: string;
  type: string;
  data: {
    user_id: number;
    id?: number;
  };
  created_at: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('whoop-signature');
    
    // Verify webhook signature (recommended for security)
    const webhookSecret = process.env.WHOOP_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');
      
      if (`sha256=${expectedSignature}` !== signature) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const event: WhoopWebhookEvent = JSON.parse(body);
    console.log('Received Whoop webhook:', event);

    // Handle different event types
    switch (event.type) {
      case 'recovery.updated':
        console.log('Recovery data updated for user:', event.data.user_id);
        // You could trigger a data refresh or cache invalidation here
        break;
      
      case 'sleep.updated':
        console.log('Sleep data updated for user:', event.data.user_id);
        break;
      
      case 'workout.updated':
        console.log('Workout data updated for user:', event.data.user_id);
        break;
      
      default:
        console.log('Unknown webhook event type:', event.type);
    }

    // Respond with 200 to acknowledge receipt
    return NextResponse.json({ received: true });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Handle webhook verification (some services send GET requests to verify the endpoint)
export async function GET() {
  return NextResponse.json({ status: 'Webhook endpoint active' });
}
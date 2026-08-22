const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { dates, reservation } = await request.json();
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    const fromEmail = Deno.env.get('FROM_EMAIL');

    if (!resendApiKey || !adminEmail || !fromEmail) {
      throw new Error('Missing email service secrets.');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [adminEmail],
        subject: `New reservation for ${dates.join(', ')}`,
        text: [
          'A new reservation was made.',
          `Dates: ${dates.join(', ')}`,
          `Name: ${reservation.name || 'Test reservation'}`,
          `Email: ${reservation.email || 'Not provided'}`,
          `Dogs: ${reservation.dogCount}`,
          `Drop-off: ${reservation.dropOff || 'Not selected'}`,
          `Pick-up: ${reservation.pickUp || 'Not selected'}`
        ].join('\n')
      })
    });

    if (!response.ok) {
      throw new Error(`Resend returned ${response.status}: ${await response.text()}`);
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

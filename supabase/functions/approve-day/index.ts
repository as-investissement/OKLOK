import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
}

interface ApproveDayRequest {
  status: 'APPROVED' | 'REJECTED' | 'PENDING'
  comment?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: isAdminData, error: adminError } = await supabase.rpc('is_admin')
    if (adminError || !isAdminData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract timesheetId and dayId from URL
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const timesheetId = pathParts[pathParts.length - 3] // /timesheets/{id}/days/{dayId}
    const dayId = pathParts[pathParts.length - 1]

    if (!timesheetId || !dayId) {
      return new Response(
        JSON.stringify({ error: 'Missing timesheetId or dayId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { status, comment }: ApproveDayRequest = await req.json()

    if (!status || !['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return new Response(
        JSON.stringify({ error: 'Invalid status. Must be APPROVED, REJECTED, or PENDING' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the specific day
    const updateData: any = {
      status: status,
      updated_at: new Date().toISOString()
    }

    if (status !== 'PENDING') {
      updateData.decision_by = user.id
      updateData.decision_at = new Date().toISOString()
      updateData.decision_comment = comment || null
    } else {
      // Reset decision fields when setting back to PENDING
      updateData.decision_by = null
      updateData.decision_at = null
      updateData.decision_comment = null
    }

    const { data, error } = await supabase
      .from('timesheet_days')
      .update(updateData)
      .eq('id', dayId)
      .eq('timesheet_id', timesheetId)
      .select()
      .single()

    if (error) {
      console.error('Error updating timesheet day:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to update day status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get updated week status (calculated automatically by trigger)
    const { data: timesheetData, error: timesheetError } = await supabase
      .from('timesheets')
      .select('status')
      .eq('id', timesheetId)
      .single()

    return new Response(
      JSON.stringify({ 
        success: true,
        day: data,
        weekStatus: timesheetData?.status || 'PENDING'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in approve-day function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
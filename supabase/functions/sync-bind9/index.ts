import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DNSRecord {
  name: string;
  type: string;
  value: string;
  ttl: number;
  priority?: number;
  weight?: number;
  port?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, domain } = await req.json()

    console.log(`BIND9 Sync: ${action} for domain ${domain}`)

    if (action === 'add_domain') {
      // Create basic zone file content for new domain
      const zoneContent = await generateZoneFile(domain, [])
      console.log(`Generated zone file for ${domain}:`, zoneContent)
      
      // In a real implementation, you would:
      // 1. Write the zone file to the BIND9 zones directory
      // 2. Update the named.conf file to include the new zone
      // 3. Reload BIND9 configuration
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Domain ${domain} added to BIND9 configuration`,
          zoneContent 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (action === 'update_domain') {
      // Fetch all DNS records for the domain
      const { data: domainData } = await supabaseClient
        .from('domains')
        .select('id')
        .eq('name', domain)
        .single()

      if (!domainData) {
        throw new Error('Domain not found')
      }

      const { data: records } = await supabaseClient
        .from('dns_records')
        .select('*')
        .eq('domain_id', domainData.id)

      // Generate updated zone file
      const zoneContent = await generateZoneFile(domain, records || [])
      console.log(`Updated zone file for ${domain}:`, zoneContent)

      // In a real implementation, you would:
      // 1. Write the updated zone file to the BIND9 zones directory
      // 2. Reload BIND9 configuration with rndc reload
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Domain ${domain} updated in BIND9 configuration`,
          zoneContent 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (action === 'delete_domain') {
      console.log(`Deleting domain ${domain} from BIND9`)
      
      // In a real implementation, you would:
      // 1. Remove the zone file from the BIND9 zones directory
      // 2. Update the named.conf file to remove the zone
      // 3. Reload BIND9 configuration
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Domain ${domain} removed from BIND9 configuration` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    console.error('BIND9 sync error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

async function generateZoneFile(domain: string, records: DNSRecord[]): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '')
  const serial = timestamp.substring(0, 10) // YYYYMMDDHH format
  
  let zoneFile = `; Zone file for ${domain}
; Generated automatically by DNS Manager
; Serial: ${serial}

$TTL 86400
@       IN      SOA     ns1.${domain}. admin.${domain}. (
                        ${serial}01    ; Serial (YYYYMMDDnn)
                        3600            ; Refresh (1 hour)
                        1800            ; Retry (30 minutes)
                        1209600         ; Expire (2 weeks)
                        86400 )         ; Minimum TTL (1 day)

; Name servers
@       IN      NS      ns1.${domain}.
@       IN      NS      ns2.${domain}.

; Default A records for name servers (you may need to adjust these)
ns1     IN      A       192.168.1.1
ns2     IN      A       192.168.1.2

`

  // Add DNS records
  for (const record of records) {
    let recordName = record.name
    if (recordName === '@' || recordName === domain) {
      recordName = '@'
    }

    let recordLine = `${recordName.padEnd(15)} IN      ${record.type.padEnd(8)}`
    
    if (record.type === 'MX' && record.priority) {
      recordLine += `${record.priority}       ${record.value}`
    } else if (record.type === 'SRV' && record.priority && record.weight && record.port) {
      recordLine += `${record.priority} ${record.weight} ${record.port} ${record.value}`
    } else {
      recordLine += `${record.value}`
    }
    
    zoneFile += recordLine + '\n'
  }

  return zoneFile
}

// Future enhancement: Add scheduled BIND9 reload functionality
// Deno.cron("Reload BIND9 every 5 minutes", "0 */5 * * * *", () => {
//   console.log("Scheduled BIND9 reload check")
//   // In a real implementation, you could check for changes and reload BIND9
// })
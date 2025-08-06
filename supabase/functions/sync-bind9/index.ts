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
      
      try {
        // Sync with local BIND9 via webhook
        await syncWithLocalBind9('add_domain', domain, [])
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Domain ${domain} successfully added to BIND9 and configuration reloaded`,
            zoneContent 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      } catch (error) {
        console.error(`Failed to add domain ${domain} to BIND9:`, error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to add domain to BIND9: ${error.message}`,
            zoneContent // Still return zone content for debugging
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          },
        )
      }
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

      try {
        // Sync with local BIND9 via webhook
        await syncWithLocalBind9('update_domain', domain, records || [])
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Domain ${domain} successfully updated in BIND9 and configuration reloaded`,
            zoneContent 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      } catch (error) {
        console.error(`Failed to update domain ${domain} in BIND9:`, error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to update domain in BIND9: ${error.message}`,
            zoneContent // Still return zone content for debugging
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          },
        )
      }
    }

    if (action === 'delete_domain') {
      console.log(`Deleting domain ${domain} from BIND9`)
      
      try {
        // Sync with local BIND9 via webhook
        await syncWithLocalBind9('delete_domain', domain)
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Domain ${domain} successfully removed from BIND9 and configuration reloaded` 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      } catch (error) {
        console.error(`Failed to delete domain ${domain} from BIND9:`, error)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to delete domain from BIND9: ${error.message}`
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          },
        )
      }
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

// BIND9 Integration via Webhook (for local/WSL setups)
async function syncWithLocalBind9(action: string, domain: string, records?: DNSRecord[]): Promise<void> {
  const webhookUrl = Deno.env.get('BIND9_WEBHOOK_URL') || 'http://localhost:3001/sync-bind9';
  
  const payload = {
    action,
    domain,
    records: records || []
  };
  
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`BIND9 webhook failed: ${error}`);
  }
  
  const result = await response.json();
  console.log('BIND9 sync result:', result);
}

async function deleteZoneFile(domain: string): Promise<void> {
  const zonePath = `/etc/bind/zones/${domain}.zone`
  const command = new Deno.Command("sudo", {
    args: ["rm", "-f", zonePath]
  })
  
  const { code, stderr } = await command.output()
  if (code !== 0) {
    const error = new TextDecoder().decode(stderr)
    throw new Error(`Failed to delete zone file: ${error}`)
  }
}

async function addZoneToNamedConf(domain: string): Promise<void> {
  const zoneConfig = `
zone "${domain}" {
    type master;
    file "/etc/bind/zones/${domain}.zone";
    allow-update { none; };
};
`
  
  const command = new Deno.Command("sudo", {
    args: ["tee", "-a", "/etc/bind/named.conf.local"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  })
  
  const child = command.spawn()
  const writer = child.stdin.getWriter()
  await writer.write(new TextEncoder().encode(zoneConfig))
  await writer.close()
  
  const { code, stderr } = await child.output()
  if (code !== 0) {
    const error = new TextDecoder().decode(stderr)
    throw new Error(`Failed to add zone to named.conf: ${error}`)
  }
}

async function removeZoneFromNamedConf(domain: string): Promise<void> {
  // Read current named.conf.local
  const readCommand = new Deno.Command("sudo", {
    args: ["cat", "/etc/bind/named.conf.local"]
  })
  
  const { code: readCode, stdout, stderr: readStderr } = await readCommand.output()
  if (readCode !== 0) {
    const error = new TextDecoder().decode(readStderr)
    throw new Error(`Failed to read named.conf.local: ${error}`)
  }
  
  let content = new TextDecoder().decode(stdout)
  
  // Remove the zone block for this domain
  const zoneRegex = new RegExp(`zone\\s+"${domain}"\\s*{[^}]*};?\\s*`, 'g')
  content = content.replace(zoneRegex, '')
  
  // Write back the updated content
  const writeCommand = new Deno.Command("sudo", {
    args: ["tee", "/etc/bind/named.conf.local"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  })
  
  const child = writeCommand.spawn()
  const writer = child.stdin.getWriter()
  await writer.write(new TextEncoder().encode(content))
  await writer.close()
  
  const { code: writeCode, stderr: writeStderr } = await child.output()
  if (writeCode !== 0) {
    const error = new TextDecoder().decode(writeStderr)
    throw new Error(`Failed to update named.conf.local: ${error}`)
  }
}

async function reloadBind9(): Promise<void> {
  // First check configuration
  const checkCommand = new Deno.Command("sudo", {
    args: ["named-checkconf"]
  })
  
  const { code: checkCode, stderr: checkStderr } = await checkCommand.output()
  if (checkCode !== 0) {
    const error = new TextDecoder().decode(checkStderr)
    throw new Error(`BIND9 configuration check failed: ${error}`)
  }
  
  // Reload BIND9
  const reloadCommand = new Deno.Command("sudo", {
    args: ["rndc", "reload"]
  })
  
  const { code: reloadCode, stderr: reloadStderr } = await reloadCommand.output()
  if (reloadCode !== 0) {
    const error = new TextDecoder().decode(reloadStderr)
    throw new Error(`Failed to reload BIND9: ${error}`)
  }
}
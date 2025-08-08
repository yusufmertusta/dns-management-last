#!/usr/bin/env node

const express = require('express');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json());

const ZONES_DIR = '/etc/bind/zones';
const NAMED_CONF = '/etc/bind/named.conf.local';

// Webhook endpoint for Supabase
app.post('/sync-bind9', async (req, res) => {
  try {
    const { action, domain, records = [] } = req.body;
    
    console.log(`BIND9 Sync: ${action} for domain ${domain}`);
    
    if (action === 'add_domain' || action === 'update_domain') {
      await createZoneFile(domain, records);
      if (action === 'add_domain') {
        await addZoneToNamedConf(domain);
      }
      await reloadBind9();
      
      res.json({ 
        success: true, 
        message: `Domain ${domain} successfully ${action === 'add_domain' ? 'added' : 'updated'}` 
      });
    } else if (action === 'delete_domain') {
      await deleteZoneFile(domain);
      await removeZoneFromNamedConf(domain);
      await reloadBind9();
      
      res.json({ 
        success: true, 
        message: `Domain ${domain} successfully deleted` 
      });
    } else {
      throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('BIND9 sync error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

async function createZoneFile(domain, records) {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
  const serial = timestamp.substring(0, 10);
  
  let zoneContent = `; Zone file for ${domain}
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

; Default A records for name servers
ns1     IN      A       192.168.1.1
ns2     IN      A       192.168.1.2

`;

  // Add DNS records
  for (const record of records) {
    let recordName = record.name === '@' || record.name === domain ? '@' : record.name;
    let recordLine = `${recordName.padEnd(15)} IN      ${record.type.padEnd(8)}`;
    
    if (record.type === 'MX' && record.priority) {
      recordLine += `${record.priority}       ${record.value}`;
    } else if (record.type === 'SRV' && record.priority && record.weight && record.port) {
      recordLine += `${record.priority} ${record.weight} ${record.port} ${record.value}`;
    } else {
      recordLine += `${record.value}`;
    }
    
    zoneContent += recordLine + '\n';
  }

  const zonePath = path.join(ZONES_DIR, `${domain}.zone`);
  await fs.writeFile(zonePath, zoneContent);
  
  // Set proper permissions
  await execCommand(`sudo chmod 644 ${zonePath}`);
}

async function deleteZoneFile(domain) {
  const zonePath = path.join(ZONES_DIR, `${domain}.zone`);
  await execCommand(`sudo rm -f ${zonePath}`);
}

async function addZoneToNamedConf(domain) {
  const zoneConfig = `
zone "${domain}" {
    type master;
    file "/etc/bind/zones/${domain}.zone";
    allow-update { none; };
};
`;
  
  await execCommand(`echo '${zoneConfig}' | sudo tee -a ${NAMED_CONF}`);
}

async function removeZoneFromNamedConf(domain) {
  // Read current named.conf.local
  const content = await fs.readFile(NAMED_CONF, 'utf8');
  
  // Remove the zone block for this domain
  const zoneRegex = new RegExp(`zone\\s+"${domain}"\\s*{[^}]*};?\\s*`, 'g');
  const updatedContent = content.replace(zoneRegex, '');
  
  // Write back the updated content
  await execCommand(`echo '${updatedContent}' | sudo tee ${NAMED_CONF}`);
}

async function reloadBind9() {
  // Check configuration first
  await execCommand('sudo named-checkconf');
  
  // Reload BIND9
  await execCommand('sudo rndc reload');
}

function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Command failed: ${error.message}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`BIND9 webhook server running on port ${PORT}`);
});
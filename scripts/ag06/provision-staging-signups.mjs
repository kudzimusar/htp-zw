import crypto from 'node:crypto';
import fs from 'node:fs';

const url=String(process.env.AG06_STAGING_SUPABASE_URL||'').replace(/\/$/,'');
const key=String(process.env.AG06_STAGING_SUPABASE_PUBLISHABLE_KEY||'');
const envFile=process.env.GITHUB_ENV;
const run=String(process.env.GITHUB_RUN_ID||Date.now());
if(!url.includes('gcdohgbmqhqwydgaxrcr')||!key||!envFile) throw new Error('Bounded HealthTimes Staging configuration is required.');

const specs=[
  ['REPORTER','reporter','Reporter / Journalist'],
  ['EDITOR','editor','Editor-in-Chief'],
  ['COMMERCIAL','commercial','Commercial Manager'],
  ['PUBLISHER','publisher','Publisher / Owner']
];

function password(){
  return 'Ht!'+crypto.randomBytes(24).toString('base64url')+'7aA';
}

for(const [envName,label,role] of specs){
  const email=`ag06-${label}-${run}@healthtimes-staging.example.com`;
  const secret=password();
  const response=await fetch(url+'/auth/v1/signup',{
    method:'POST',
    headers:{apikey:key,'Content-Type':'application/json'},
    body:JSON.stringify({
      email,
      password:secret,
      data:{ag06_staging_test:true,ag06_run_id:run,ag06_role:role}
    })
  });
  const body=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(`Staging signup failed for ${label}: ${body.msg||body.message||body.error_description||response.status}`);
  process.stdout.write(`::add-mask::${secret}\n`);
  fs.appendFileSync(envFile,`AG06_${envName}_EMAIL=${email}\nAG06_${envName}_PASSWORD=${secret}\n`);
}
fs.appendFileSync(envFile,`AG06_CERTIFICATION_RUN_ID=${run}\n`);
process.stdout.write(`AG06_STAGING_SIGNUPS_CREATED count=4 run_id=${run}\n`);

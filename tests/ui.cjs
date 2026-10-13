// QA aislada: todas las llamadas Supabase se interceptan; nunca toca el proyecto real.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path'); const fs = require('node:fs');
const outputDir=process.env.SUBTEK_QA_OUTPUT_DIR || path.join(process.cwd(),'test-results'); fs.mkdirSync(outputDir,{recursive:true});
(async()=>{
 const options = { headless:true };
 if(process.env.SUBTEK_CHROMIUM_PATH) { options.args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']; options.executablePath=process.env.SUBTEK_CHROMIUM_PATH; }
 const browser=await chromium.launch(options); const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
 const uid='11111111-1111-4111-8111-111111111111';
 const roadmap={fase1_cctv:true,fase1_vactor:true,fase1_inspeccion:true,fase2_saas:false,fase2_etiquetador:false,fase2_recomendaciones:false,fase2_vision:false,fase3_predictivo:false,fase3_vision_rt:false,fase3_macp:false};
 let config={id:1,total:1000,mes:'Octubre',anio:2026,roadmap,revision:1,updated_at:new Date().toISOString()};
 let notes=[{id:'33333333-3333-4333-8333-333333333333',week_start:'2026-10-12',task:'Validar piloto CCTV',responsible:'Nixon Castiblanco',due_date:'2026-10-16',status:'En curso',notes:'Revisar evidencia del piloto y documentar resultados para el weekly.',archived:false,revision:1}];
 let writes=0;const calls=[];
 await ctx.route('https://fzjovmnudqbwukyzsznc.supabase.co/**',async route=>{
   const req=route.request(),url=new URL(req.url());calls.push({method:req.method(),path:url.pathname});
   let body=[],status=200;
   if(url.pathname.includes('/auth/')) body={id:uid};
   else if(url.pathname.includes('/rpc/subtek_save_dashboard_config')) {
     writes++;const p=req.postDataJSON();
     if(p.p_expected_revision!==config.revision){status=409;body={code:'40001',message:'Conflicto de revisión'};}
     else {config={...config,total:p.p_total,mes:p.p_mes,anio:p.p_anio,roadmap:p.p_roadmap,revision:config.revision+1};body=config;}
   } else if(url.pathname.includes('/rpc/subtek_save_weekly_note')) {
     writes++;const p=req.postDataJSON();const existing=notes.find(n=>n.id===p.p_id);
     if(existing && existing.revision!==p.p_expected_revision) { status=409;body={code:'40001',message:'Conflicto de nota'}; }
     else { body={id:p.p_id,task:p.p_task,responsible:p.p_responsible,due_date:p.p_due_date,week_start:p.p_week_start,status:p.p_status,notes:p.p_notes,archived:p.p_archived,revision:p.p_expected_revision+1};notes=notes.filter(n=>n.id!==p.p_id);notes.push(body); }
   } else if(url.pathname.endsWith('subtek_config_members')) body=[{user_id:uid}];
   else if(url.pathname.endsWith('subtek_dashboard_config')) body=[config];
   else if(url.pathname.endsWith('presupuesto_global')) body=[{total:800}];
   else if(url.pathname.endsWith('subtek_weekly_notes')) {body=notes;if(url.searchParams.has('id')) { const row=notes.find(n=>n.id===url.searchParams.get('id').slice(3));body=req.headers().accept?.includes('object')?row:[row]; }}
   await route.fulfill({status,headers:{'access-control-allow-origin':'*','access-control-expose-headers':'content-range','content-type':'application/json','content-range':`0-${Array.isArray(body)?Math.max(body.length-1,0):0}/${Array.isArray(body)?body.length:1}`},body:JSON.stringify(body)});
 });
 await ctx.addInitScript(({uid,roadmap})=>{
   const b64=o=>btoa(JSON.stringify(o)).replace(/=/g,'');
   const token=b64({alg:'HS256',typ:'JWT'})+'.'+b64({sub:uid,exp:Math.floor(Date.now()/1000)+3600})+'.fake';
   localStorage.setItem('sb-fzjovmnudqbwukyzsznc-auth-token',JSON.stringify({access_token:token,refresh_token:'fake',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:uid,aud:'authenticated',email:'qa@example.com'}}));
   localStorage.setItem('subtek-roadmap-v6',JSON.stringify(roadmap));localStorage.setItem('subtek-ppto-v6','500');localStorage.setItem('subtek-ppto-mes-v6','Octubre');localStorage.setItem('subtek-ppto-anio-v6','2026');
 },{uid,roadmap});
 const page=await ctx.newPage();page.setDefaultTimeout(10000); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',d=>d.dismiss());
 await page.goto('http://127.0.0.1:3100');
 await page.getByRole('button',{name:'Salir',exact:true}).waitFor();
 await page.waitForFunction(()=>!!document.querySelector('input[type=number]') && !document.querySelector('input[type=number]').disabled);
 assert.equal(await page.getByRole('region',{name:'Sincronización y transición'}).count(),0);
 assert.equal(writes,0,'No debe publicar defaults ni migrar automáticamente');
 assert.equal(await page.evaluate(()=>localStorage.getItem('subtek-ppto-v6')),'500');
 await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
 await page.getByRole('button',{name:'Usar datos del equipo',exact:true}).click();
 await page.getByRole('button',{name:'Nuevo compromiso',exact:true}).click();
 await page.getByLabel('Tarea o acuerdo').fill('Preparar evidencia para weekly');
 await page.getByLabel('Responsable del compromiso').fill('Edwin Escalante');
 await page.getByLabel('Fecha del compromiso').fill('2026-10-16');
 await page.getByLabel('Notas y seguimiento').fill('Responsable asignado. Revisar avance durante la reunión del viernes.');
 await page.getByRole('button',{name:'Guardar compromiso',exact:true}).click();
 try { await page.getByRole('heading',{name:'Preparar evidencia para weekly',exact:true}).waitFor(); } catch(e) { console.log(await page.locator('body').innerText()); console.log(calls);throw e; }
 assert.equal(notes.length,2);
 await page.locator('input[type=number]').nth(1).fill('1200');
 config={...config,total:1100,revision:2};
 await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
 await page.getByText('Hay una versión más reciente. Actualiza los datos antes de guardar.', {exact:true}).waitFor();
 assert.equal(config.total,1100,'No sobrescribir revisión nueva');
 assert.equal(await page.locator('input[type=number]').nth(1).inputValue(),'1200','Conservar borrador en conflicto');
 await page.getByRole('button',{name:'Abrir / editar',exact:true}).first().click();
 await page.getByLabel('Notas y seguimiento').fill('Borrador del dispositivo B');
 notes[0]={...notes[0],revision:2,notes:'Acuerdo del dispositivo A'};
 await page.getByRole('button',{name:'Guardar compromiso',exact:true}).click();
 await page.getByText('La nota cambió en otro dispositivo. El borrador se conserva.',{exact:true}).waitFor();
 assert.equal(notes[0].notes,'Acuerdo del dispositivo A');
 assert.equal(await page.getByLabel('Notas y seguimiento').inputValue(),'Borrador del dispositivo B');
 assert.equal(errors.length,0,errors.join('\n'));
 await page.getByRole('region',{name:'Bitácora Weekly Subtek'}).scrollIntoViewIfNeeded();
 await page.screenshot({path:path.join(outputDir,'weekly-qa.png')});
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('region',{name:'Bitácora Weekly Subtek'}).screenshot({path:path.join(outputDir,'weekly-mobile-qa.png')});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),'Sin overflow horizontal en móvil');
 assert.ok(!calls.some(c=>c.method==='DELETE'),'No se envían DELETE');
 console.log('PASS: UI desktop/móvil, revisión explícita, conservación v6, creación weekly, conflictos de configuración y notas, cero escrituras automáticas y cero errores de navegador.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

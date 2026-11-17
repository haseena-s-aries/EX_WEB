const {chromium}=require('C:/Users/AL414/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}});
 const token='h.'+Buffer.from(JSON.stringify({exp:Date.now()/1000+3600})).toString('base64url')+'.s';
 const projects=Array.from({length:16},(_,i)=>({id:'p'+i,projectName:'Field project '+i+' with a longer descriptive title',jobNo:'Job-'+i,location:'Dubai',status:'InProgress',createdAt:'2026-11-10T00:00:00Z',updatedAt:'2026-11-16T00:00:00Z',areas:[],areaCount:1}));
 let mode='ok'; let role='Admin';
 await page.route('**/api/**',async route=>{
 const path=new URL(route.request().url()).pathname;
 let data=[];let status=200;
 if(path.endsWith('/auth/me')) {await new Promise(r=>setTimeout(r,700));if(mode==='expired')status=401; data={id:'fixture-admin',displayName:'Dashboard test',email:'test@example.invalid',role,approvalStatus:'Approved'};}
 else if(path.endsWith('/projects'))data=projects;
 else if(/\/projects\/p\d+$/.test(path))data=projects.find(p=>path.endsWith('/'+p.id));
 else if(path.endsWith('/defects'))data={summary:{openCount:0},items:[]};
 else if(path.endsWith('/dashboard'))data={};
 await route.fulfill({status,json:data,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}});
 });
 await page.goto('http://localhost:3000');
 await page.evaluate(token=>sessionStorage.setItem('ex-survey-tab-session',token),token);
 await page.reload();
 await page.getByText('Restoring your secure workspace…').waitFor();
 assert.equal(await page.getByText('Sign In',{exact:true}).count(),0);
 await page.getByText('Active Site Operations',{exact:true}).waitFor();
 const results=[];
 for(const width of [320,360,375,390,414,430,768,1024,1600]){
 await page.setViewportSize({width,height:1000});await page.waitForTimeout(120);
 const boxes=await page.evaluate(()=>{
 const a=document.querySelector('#ex-operations-sites-panel'),b=document.querySelector('#ex-operations-updates-panel'),list=document.querySelector('#ex-operations-table-scroll');
 if(!a||!b)return {panels:false,overflow:document.documentElement.scrollWidth>innerWidth};
 const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();return {panels:true,a:ar.height,b:br.height,topA:ar.top,topB:br.top,overflow:document.documentElement.scrollWidth>innerWidth,scroll:list.scrollHeight>list.clientHeight};});
 assert.equal(boxes.overflow,false,JSON.stringify({width,...boxes}));
 if(boxes.panels){assert.equal(boxes.a,boxes.b);if(width>=901)assert.ok(Math.abs(boxes.topA-boxes.topB)<1);assert.ok(boxes.scroll);}
 results.push({width,...boxes});
 }
 const heading = page.getByText('Active Site Operations',{exact:true});
 const before = await heading.boundingBox();
 await page.locator('#ex-operations-table-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);
 assert.equal((await heading.boundingBox()).y,before.y);
 assert.equal(await page.locator('#ex-operations-updates-scroll').evaluate(el=>el.scrollTop),0);
 await page.locator('#ex-operations-table-scroll').evaluate(el=>el.scrollTop=0);
 await page.screenshot({path:'artifacts/dashboard-layout-1600.png',fullPage:true});
 // Refresh with a delayed validator never displays a login form.
 await page.reload();await page.getByText('Restoring your secure workspace…').waitFor();assert.equal(await page.locator('input[type=password]').count(),0);await page.getByText('Active Site Operations',{exact:true}).waitFor();
 const create=page.getByText(/New Project|Create Project/,{exact:false});console.log('Create buttons',await create.allTextContents());
 await create.first().click();await page.locator('#create-project-form').waitFor();
 const labels=await page.locator('#create-project-form [data-testid="project-form-label"], #create-project-form [role=heading]').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,transform:getComputedStyle(n).textTransform})));
 assert.ok(labels.length>8);assert.ok(labels.every(l=>l.transform==='uppercase'),JSON.stringify(labels));
 const name=page.getByPlaceholder('e.g. MV Resolute Annual Inspection');await name.fill('Mixed Case Vessel');assert.equal(await name.inputValue(),'Mixed Case Vessel');assert.equal(await name.evaluate(el=>getComputedStyle(el).textTransform),'uppercase');
 await page.screenshot({path:'artifacts/create-project-uppercase.png',fullPage:true});
 for(const width of [320,375,768,1024]) {
 await page.setViewportSize({width,height:900});await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'create overflow '+width);
 assert.equal(await name.inputValue(),'Mixed Case Vessel');
 }
 await page.screenshot({path:'artifacts/create-project-1024.png',fullPage:true});
 role='Manager';await page.reload();await page.getByText('Active Site Operations',{exact:true}).waitFor();
 mode='expired';await page.reload();await page.locator('input[type=password]').waitFor();assert.equal(await page.evaluate(()=>sessionStorage.getItem('ex-survey-tab-session')),null);
 console.log(JSON.stringify({passed:true,viewports:results,labels:labels.length,refresh:'validated; no login flash',expired:'login; token cleared'},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

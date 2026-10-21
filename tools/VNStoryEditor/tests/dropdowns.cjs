const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox']}:{})});
 const page=await browser.newPage({viewport:{width:1600,height:1000}});page.setDefaultTimeout(15000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 try{
 await page.goto(process.env.VN_EDITOR_URL||'http://localhost:8765/vn_editor.html');
 await page.getByText('+ Write first line',{exact:true}).click();
 await page.getByRole('button',{name:'Characters & visuals',exact:true}).click();
 const cell=(pos,field)=>page.getByLabel(`Line 1: ${pos} · ${field}`,{exact:true});
 for(const pos of ['left','center','right']){await cell(pos,'Character').fill('hero');await cell(pos,'Character').press('Tab');}
 assert.equal(await cell('left','Outfit').evaluate(el=>el.tagName),'SELECT');
 assert.ok((await cell('left','Outfit').innerText()).includes('library character first'));
 // Create and save the character through the existing editor while the sheet already exists.
 await page.evaluate(()=>createNewCharacter());
 await page.locator('#charId').fill('hero');await page.locator('#charName').fill('Hero');
 await page.evaluate(()=>{currentEditingCharacter.outfits=[{outfitID:'10',outfitName:'School',poses:[{poseID:'20',poseName:'Idle',expressions:[{fileName:'happy.png'},{fileName:'sad.png'}]},{poseID:'21',poseName:'Wave',expressions:[{fileName:'wave.png'}]}]},{outfitID:'30',outfitName:'Casual',poses:[{poseID:'40',poseName:'Sit',expressions:[{fileName:'sit.png'}]}]}]});
 await page.getByRole('button',{name:'Save Character',exact:true}).click();
 for(const pos of ['left','center','right']){
   assert.ok((await cell(pos,'Outfit').innerText()).includes('10 · School'));
   await cell(pos,'Outfit').selectOption('10');assert.ok((await cell(pos,'Pose').innerText()).includes('20 · Idle'));
   await cell(pos,'Pose').selectOption('20');assert.ok((await cell(pos,'Expression').innerText()).includes('1 · sad.png'));
   await cell(pos,'Expression').selectOption('1');
 }
 assert.deepEqual(await page.evaluate(()=>['left','center','right'].map(p=>{const n=chapter.nodes[0][p+'Character'];return[n.outfitID,n.poseID,n.expressionIndex]})),[['10','20','1'],['10','20','1'],['10','20','1']]);
 await cell('left','Outfit').selectOption('30');assert.ok((await cell('left','Pose').innerText()).includes('40 · Sit'));
 assert.ok((await cell('left','Pose').innerText()).includes('20 · Unlisted value'));
 assert.equal(await page.evaluate(()=>chapter.nodes[0].leftCharacter.poseID),'20');
 await cell('left','Pose').selectOption('40');await cell('left','Expression').selectOption('0');
 assert.ok((await cell('left','Expression').innerText()).includes('0 · sit.png'));
 await page.locator('#sheetUndo').click();assert.equal(await page.evaluate(()=>chapter.nodes[0].leftCharacter.expressionIndex),'1');
 await page.locator('#sheetRedo').click();assert.equal(await cell('left','Expression').inputValue(),'0');
 await cell('right','Character').fill('missing');await cell('right','Character').press('Tab');
 assert.ok((await cell('right','Outfit').innerText()).includes('10 · Unlisted value'));
 await cell('right','Character').fill('hero');await cell('right','Character').press('Tab');
 await page.evaluate(()=>{characterLibrary.hero.outfits[0].outfitName='Uniform';saveCharacterLibrary()});
 assert.ok((await cell('right','Outfit').innerText()).includes('10 · Uniform'));
 const promise=page.waitForEvent('download');await page.getByRole('button',{name:'💾 Export Chapter',exact:true}).click();const download=await promise;
 const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);const data=JSON.parse(Buffer.concat(chunks));
 assert.equal(data.metadata.version,'1.0');assert.equal(data.chapter.nodes[0].leftCharacter.poseID,'40');assert.equal(data.chapter.nodes[0].leftCharacter.expressionIndex,'0');
 assert.ok((await page.locator('.tool-version').innerText()).includes('ver20261019.002'));
 assert.deepEqual(errors,[]);console.log('PASS: character creation/save refreshes all three slots; dependent outfit/pose/expression options; ID/name labels; unlisted preservation; library edits; undo/redo; JSON IDs; version .002.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
(async () => {
    const browser = await chromium.launch({headless:true, ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox']} : {})});
    const page = await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
    page.setDefaultTimeout(15000);
    page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
    const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vn-assets-')), root=path.join(temp,'Assets');
    const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7XkAAAAASUVORK5CYII=','base64');
    for (const name of ['Background/classroom.png','Hero/0_Default/0_Idle/expression_0.png','Other/0_Default/0_Idle/expression_0.png','CG/ending.png','DialogueImage/photo.png',...Array.from({length:120},(_,i)=>`Background/unused${i}.png`)]) {
        const dest=path.join(root,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,pixel);
    }
    try {
        await page.goto(process.env.VN_EDITOR_URL || 'http://localhost:8765/vn_editor.html');
        await page.evaluate(() => {
            chapter.nodes = Array.from({length:5},(_,i)=>({...createEmptyNode(),dialogue:`Line ${i}`,speakingCharacterId:`speaker${i}`}));
            const node=chapter.nodes[0];node.backgroundSprite='classroom';node.dialogueImageSprite='photo';
            node.leftCharacter={...createEmptyCharacterState(),action:'Enter',characterId:'hero',outfitID:'0',poseID:'0',expressionIndex:'0'};
            node.soundEffect='disabled_sfx';node.characterVoice='hero_voice';node.showSoundOptions=false;
            node.hasChoices=false;node.choiceList.choices=[{choiceText:'Hidden choice',nextChapterName:'Next',isEnabled:false,onChoiceSelectedCommands:['set flag 1'],onChoiceSelectedEvents:[{event:'custom'}]}];
            node.customDebug={nested:[false,0,'exact text']};
            characterLibrary.hero={characterId:'hero',characterName:'Hero',outfits:[{outfitID:'0',poses:[{poseID:'0',expressions:[{fileName:'expression_0.png'}]}]}]};
            autoSaveChapter();renderNodeTable();
        });
        await page.getByRole('button',{name:'🖼️ Local Images',exact:true}).click();
        await page.locator('#assetFolder').setInputFiles(root);
        await page.waitForFunction(()=>VNLocalAssets.stats().files===125);
        await page.locator('#assetClose').click();
        await page.waitForFunction(()=>[...document.querySelectorAll('#sheetPreview img')].length===3 && [...document.querySelectorAll('#sheetPreview img')].every(img=>img.complete && img.naturalWidth));
        assert.ok(await page.locator('.cast-image').getAttribute('alt').then(s=>s.includes('hero')));
        assert.ok((await page.locator('#nodeDebug').innerText()).includes('disabled_sfx'));
        assert.ok((await page.locator('#nodeDebug').innerText()).includes('onChoiceSelectedEvents.0.event'));
        assert.ok((await page.locator('#nodeDebug').innerText()).includes('customDebug.nested.2'));
        assert.equal(await page.evaluate(()=>localStorage.getItem('vn_background_cache')),null);
        assert.ok((await page.evaluate(()=>VNLocalAssets.stats().objectURLs))<=3,'Only displayed assets should acquire URLs');
        const imageURL=await page.locator('.cast-image').getAttribute('src');
        await page.getByLabel('Line 1: Dialogue',{exact:true}).fill('Typing preserves the stage');
        await page.getByLabel('Line 1: Dialogue',{exact:true}).press('Tab');
        assert.equal(await page.locator('.cast-image').getAttribute('src'),imageURL);
        // Pointer fill copies down, including source value, as one undo step.
        const source=page.getByLabel('Line 1: Speaker',{exact:true});await source.fill('Filled');await source.press('Tab');
        await source.focus();const handle=page.getByLabel('Fill from line 1: Speaker',{exact:true});
        const box=await handle.boundingBox(), target=await page.getByLabel('Line 4: Speaker',{exact:true}).boundingBox();
        await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:10});await page.mouse.up();
        assert.deepEqual(await page.evaluate(()=>chapter.nodes.slice(0,4).map(n=>n.speakingCharacterId)),['Filled','Filled','Filled','Filled']);
        await page.locator('#sheetUndo').click();assert.equal(await page.evaluate(()=>chapter.nodes[3].speakingCharacterId),'speaker3');
        // Upward fill and cancellation must behave symmetrically.
        await page.getByLabel('Line 4: Speaker',{exact:true}).focus();
        const up=await page.getByLabel('Fill from line 4: Speaker',{exact:true}).boundingBox(), upTarget=await page.getByLabel('Line 2: Speaker',{exact:true}).boundingBox();
        await page.mouse.move(up.x+5,up.y+5);await page.mouse.down();await page.mouse.move(upTarget.x+30,upTarget.y+15,{steps:8});await page.mouse.up();
        assert.deepEqual(await page.evaluate(()=>chapter.nodes.slice(1,4).map(n=>n.speakingCharacterId)),['speaker3','speaker3','speaker3']);
        await page.locator('#sheetUndo').click();
        const cancelled = await page.evaluate(()=>JSON.stringify(chapter.nodes));
        await page.getByLabel('Line 1: Speaker',{exact:true}).focus();
        const cancelHandle=await page.getByLabel('Fill from line 1: Speaker',{exact:true}).boundingBox();
        await page.mouse.move(cancelHandle.x+5,cancelHandle.y+5);await page.mouse.down();await page.mouse.move(upTarget.x+30,upTarget.y+15,{steps:5});await page.keyboard.press('Escape');await page.mouse.up();
        assert.equal(await page.evaluate(()=>JSON.stringify(chapter.nodes)),cancelled);
        if(process.env.VN_SCREENSHOT_DIR) await page.screenshot({path:process.env.VN_SCREENSHOT_DIR+'/upgrade-desktop.png',fullPage:true});
        // Reordering moves the complete nodes, not just displayed fields.
        const before=await page.evaluate(()=>JSON.stringify(chapter.nodes[0]));
        await page.getByLabel('Drag line 1',{exact:true}).dragTo(page.locator('.sheet-row').nth(3),{targetPosition:{x:100,y:70}});
        assert.equal(await page.evaluate(()=>JSON.stringify(chapter.nodes[3])),before);
        await page.locator('#sheetUndo').click();
        await page.getByLabel('Select line 1',{exact:true}).check();await page.getByLabel('Select line 2',{exact:true}).check();
        await page.getByLabel('Drag line 1',{exact:true}).dragTo(page.locator('.sheet-row').nth(4),{targetPosition:{x:100,y:70}});
        assert.deepEqual(await page.evaluate(()=>chapter.nodes.slice(3).map(n=>n.dialogue)),['Typing preserves the stage','Line 1']);
        await page.locator('#sheetUndo').click();
        // All means all matching rows, not a second hidden limit.
        await page.evaluate(()=>{chapter.nodes=Array.from({length:1100},(_,i)=>({...createEmptyNode(),dialogue:`Line ${i}`}));autoSaveChapter();renderNodeTable()});
        assert.equal(await page.locator('.sheet-row').count(),100);
        const allStart=Date.now();await page.getByLabel('Rows per page').selectOption('all');assert.ok(await page.locator('.sheet-row').count()<100);
        assert.ok((await page.locator('#sheetPage').innerText()).includes('1100'));
        await page.locator('.node-table-container').evaluate(el=>el.scrollTop=el.scrollHeight);
        await page.getByLabel('Line 1100: Dialogue',{exact:true}).waitFor();
        await page.getByLabel('Line 1100: Dialogue',{exact:true}).fill('Last line edit');await page.getByLabel('Line 1100: Dialogue',{exact:true}).press('Tab');assert.equal(await page.evaluate(()=>chapter.nodes[1099].dialogue),'Last line edit');
        console.log('All view: 1100 rows accessible with bounded DOM in',Date.now()-allStart,'ms');
        await page.getByLabel('Search story').fill('Last line edit');assert.equal(await page.locator('.sheet-row').count(),1);
        await page.getByLabel('Search story').fill('');await page.getByLabel('Rows per page').selectOption('100');
        await page.getByLabel('Line 1: Dialogue',{exact:true}).focus();
        // Continuous All mode recycles rows while a fill gesture keeps pointer capture.
        await page.getByLabel('Rows per page').selectOption('all');
        await page.getByLabel('Line 1: Speaker',{exact:true}).fill('AllFill');await page.getByLabel('Line 1: Speaker',{exact:true}).press('Tab');
        await page.getByLabel('Line 1: Speaker',{exact:true}).focus();
        const allHandle=await page.getByLabel('Fill from line 1: Speaker',{exact:true}).boundingBox();const viewport=await page.locator('.node-table-container').boundingBox();
        await page.mouse.move(allHandle.x+5,allHandle.y+5);await page.mouse.down();await page.mouse.move(allHandle.x,Math.min(viewport.y+viewport.height-5,990),{steps:10});await page.waitForTimeout(1500);await page.mouse.up();
        assert.ok(await page.evaluate(()=>chapter.nodes.filter(n=>n.speakingCharacterId==='AllFill').length>8));
        await page.locator('#sheetUndo').click();assert.equal(await page.evaluate(()=>chapter.nodes.filter(n=>n.speakingCharacterId==='AllFill').length),1);
        await page.getByLabel('Rows per page').selectOption('100');await page.getByLabel('Line 1: Dialogue',{exact:true}).focus();
        // Repeated asset switching bounds the URL pool despite linking a large folder.
        for(let i=0;i<40;i++) {
            if(i%10===0) console.log("Switch image",i);
            await page.evaluate(i=>{chapter.nodes[0].backgroundSprite=`unused${i}`;autoSaveChapter();renderNodeTable()},i);
            await page.waitForFunction(i=>document.querySelector('.stage-label')?.textContent.includes(`unused${i}`),i);
        }
        assert.ok(await page.evaluate(()=>VNLocalAssets.stats().objectURLs<=24));
        console.log("URL pool verified");
        // Original modal image uploads use File URLs and never write a cache.
        await page.getByRole('button',{name:'Edit details ↗',exact:true}).first().click();
        await page.locator('#bgFileInput').setInputFiles(path.join(root,'Background/classroom.png'));
        await page.waitForFunction(()=>document.getElementById('bgPreviewImg').src.startsWith('blob:'));
        await page.locator('.close-modal-btn').click();
        assert.equal(await page.evaluate(()=>localStorage.getItem('vn_background_cache')),null);
        assert.ok(!(await page.evaluate(()=>JSON.stringify(chapter))).includes('blob:'));
        console.log("Advanced image upload verified");
        // Unlink revokes every object URL and removes preview images.
        await page.getByRole('button',{name:'🖼️ Local Images',exact:true}).click();await page.locator('#assetClear').click();await page.locator('#assetClose').click();
        await page.waitForFunction(()=>VNLocalAssets.stats().objectURLs===0 && !document.querySelector('#sheetPreview img'));
        assert.equal(await page.evaluate(()=>VNLocalAssets.stats().files),0);
        await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        assert.deepEqual(errors,[]);
        console.log('PASS: local folder images, scoped character matching, zero persistent image data, stage reuse, downward/upward fill + undo, single/multiple-row drag, All 1100 rows, full inspector, bounded object URLs, advanced image upload, unlink, mobile width.');
    } finally { await browser.close();fs.rmSync(temp,{recursive:true,force:true}); }
})().catch(e=>{console.error(e);process.exit(1)});

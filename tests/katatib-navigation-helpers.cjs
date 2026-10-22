// Exercise the same main-page then tool-tab path as a user.
async function openScreen(page,screen){
 const selector=`[data-screen="${screen}"]`;await page.locator(selector).waitFor({state:'attached'});
 const group=await page.locator(selector).getAttribute('data-parent-page');
 if(!await page.locator(`[data-page-tabs="${group}"]`).isVisible())await page.locator(`[data-main-page="${group}"]`).click();
 // A rejected unsaved-work dialog deliberately keeps the current page.
 if(!await page.locator(`[data-page-tabs="${group}"]`).isVisible())return;
 const advanced=page.locator(selector).locator('xpath=ancestor::details');
 if(await advanced.count()&&!await advanced.evaluate(el=>el.open))await advanced.locator('summary').click();
 await page.locator(selector).click();
}
module.exports={openScreen};

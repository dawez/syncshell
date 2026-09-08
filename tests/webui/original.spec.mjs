import {test, expect} from '@playwright/test';
import {folderFixture} from './folder-fixture.mjs';

test('original overview retains three columns and the folder editor', async ({page}, info) => {
    await folderFixture(page);
    await page.goto('/');
    const folders = page.locator('.dashboard-folders');
    await expect(folders.getByRole('button', {name:/Folder under test/})).toBeVisible();
    const local = page.locator('.dashboard-devices > .panel').first();
    const remote = page.locator('.dashboard-remotes');
    const [a,b,c] = await Promise.all([folders.boundingBox(),local.boundingBox(),remote.boundingBox()]);
    expect(a.x).toBeLessThan(b.x); expect(b.x).toBeLessThan(c.x);
    await folders.getByRole('button',{name:/Folder under test/}).click();
    await expect(folders.locator('.folder-state-summary')).toContainText('109.2k');
    await folders.getByRole('button',{name:/Edit$/}).click();
    await expect(page.locator('#editFolder')).toBeVisible();
    await expect(page.locator('#editFolder input[name="folderLabel"]')).toHaveValue('Folder under test');
    await page.locator('#editFolder').getByRole('button',{name:/Close$/}).click();
    await expect(page.locator('#editFolder')).toBeHidden();
    await page.screenshot({path:info.outputPath('original-overview.png')});
});

test('original notifications show warning severity and clear after acknowledgement', async ({page}, info) => {
    let cleared = false;
    await page.route('**/rest/system/error', route => route.fulfill({json:{errors:cleared?[]:[
        {when:'2026-09-08T12:00:00Z',message:'Disposable notification for acceptance'},
    ]}}));
    await page.route('**/rest/system/error/clear', route => {cleared=true;return route.fulfill({body:''});});
    await page.goto('/');
    const tab = page.getByRole('tab',{name:/Notifications/});
    await expect(tab.locator('.text-warning')).toBeVisible({timeout:15000});
    await tab.click();
    const notice = page.locator('#dashboard-notifications .panel-warning').filter({hasText:'Disposable notification for acceptance'});
    await expect(notice).toBeVisible();
    await page.screenshot({path:info.outputPath('original-notification.png')});
    await notice.getByRole('button',{name:/OK$/}).click();
    await expect(notice).toHaveCount(0);
    await expect.poll(()=>cleared).toBe(true);
    await expect(tab.locator('.text-warning')).toBeHidden();
});

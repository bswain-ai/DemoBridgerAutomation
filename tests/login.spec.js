import {test,expect} from '@playwright/test'

test('Login to Application', async ({page}) => {

    //Credentials
    const userName = "kpatnaik+agent_tunn@bridgerins.com"
    const passWord = "Gunu@7861"

    //Locators
    const url = 'https://bridgerins-test.com/signin?callbackUrl=%2F'
    const agentPortal = `//button[normalize-space()='Agent Portal']`
    const userNameLoc = `//input[@id='username']`
    const passwordLoc = `//input[@id='password']`
    const submitButton = `//button[@type='submit']`
    const bridgerLogo = `//img[@alt='App-bar-logo']`

    //Navigate to Application in Browser
    await page.goto(url)

    //Fill UserName & Password to login
    await page.locator(agentPortal).click()
    await page.locator(userNameLoc).fill(userName)
    await page.locator(passwordLoc).fill(passWord)

    //Click on the Login Button
    await page.locator(submitButton).click()

    await expect(page.locator(bridgerLogo)).toBeVisible()

})
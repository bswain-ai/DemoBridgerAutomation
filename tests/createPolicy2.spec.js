    import {test,expect} from '@playwright/test'
    import { faker } from '@faker-js/faker'

     const { log } = require('./customLogger');
    let stepLog = '';
    
    test('Login to Application', async ({page}) => {
    
        test.setTimeout(150000);
        //Credentials
        const userName = "kpatnaik+agent_tunn@bridgerins.com"
        const passWord = "Gunu@78612"
    
        //Locators
        const url = 'https://bridgerins-test.com/signin?callbackUrl=%2F'
        const agentPortal = `//button[normalize-space()='Agent Portal']`
        const userNameLoc = `//input[@id='username']`
        const passwordLoc = `//input[@id='password']`
        const submitButton = `//button[@type='submit']`
        const bridgerLogo = `//img[@alt='App-bar-logo']`
        const newSubmissionBtn = `//button[normalize-space()='New Submission']`
        const stateDropdown = `//button[normalize-space()='New Submission']`
        const selectState = `#pol_issued_state`
        const programDrodown = `//select[@id='pol_lob']`
        const selectProgram = `#pol_lob`
        const selectTerm = `#pol_term`
        const fName = `[data-test="f_firstName"]`
        const lName = `[data-test="f_lastName"]`
        const continueBtn = `[data-test="dialogActions-continue-btn"]`
        const cellPhone = `//input[@id='pol_insured_cell_phone']`
        const emailid = `//input[@id='pol_insured_email']`
        const nextBtn = `//button[@type='submit']`
        const streetAddress = `//input[@id=':r4o:']`
        const selectaddress = '//li[1]/div/p'
        const addVehicleBtn = `[data-test="add-vehicle-button"]`
        const vehicleYear = `[data-test="f_vehicle_year"]`
        const vehicleVin = `[data-test="f_vehicle_vin"]`
        const searchVinBtn = `[data-test="search-by-vin-btn"]`
        const disabledSearchVinBtn = `//button[@disabled]`
        const filledMakeTextBox = `//label[@id='vehicle_make-label' and @data-shrink='true']`
        const vehicleCost = `//input[@id='vehicle_msrp']`
        const vehicleUse = `[data-test="f_vehicle_use"]`
        const purchasedDate = `//input[@id='vehicle_purchased']`
        const purchasedStatus = `[data-test="f_vehicle_is_new"]`
        const damageStatus = `[data-test="f_vehicle_damage"]`
        const saveButton = `//button[normalize-space()='Save']`
        const addedVehicle = `//span[text()='1C4PJLDN5MD156228']`
        const nextButton = `[data-test="next-btn"]`
        const insuredRated = `//span[contains(text(),'Insured,')]`
        const updateDriver = `//span[normalize-space()='Update']`
        const driverGender = `#driver_gender`
        const driverMaritalStatus = `[data-test="f_driver_marital_status"]`
        const driverDOB = `[data-test="f_driver_dob"]`
        const driverLicenseStatus = `[data-test="f_driver_license_status"]`
        const driverLicenseYears = `//input[@id='driver_license_years']`
        const driverLicenseMonths = `//input[@id='driver_license_month']`
        const licenseTxtBox = `//input[@id='driver_license_number']`
        const driverOccupation = `[data-test="f_driver_occupation"]`
        const selectAccountant = `//ul[@id='driver_occupation-listbox']/li[text()='Accountant']`
        const selectAgriculture = `//ul[@id='driver_occupation-listbox']/li[contains(text(),'Agriculture')]`
        const addDriver = `//p[text()='Add driver']`
        const driverFirstName = `//input[@id='driver_first_name']`
        const driverLastName = `//input[@id='driver_last_name']`
        const insuredRelationship = `#driver_relations_to_named_insured`
        const licenseState = `#driver_license_state`
        const selectTexas = `#driver_license_state-option-44`
        const driverSubmitBtn = `[data-test="driver-drawer-submit"]`
        const policyEffectiveDate = `//h5[normalize-space()='Policy Effective Date']`
        const coveragePage = `//h5[normalize-space()='Coverages']`
        const pipSwitch = `[data-test="coverage-item-switch-Personal Injury Protection (PIP)"]`
        const refreshPriceBtn = ` //button[normalize-space()='Refresh Price']`
        const premiumValue = `[data-test='premium-summary-price-0']`
        const paymentOptions = `//h5[normalize-space()='Payment Options']`
        const proceedQuoteBtn = `//button[@type='button'][normalize-space()='Proceed to Quote']`
        const disabledProceedBtn = `//button[@data-test='refresh-price-btn']/following-sibling::span/button[@disabled]`
        const validateEligibilityBtn = `//button[@type='submit']`
        const uwQueryPage = `//h5[normalize-space()='Underwriting/Eligibility Questions']`
        const Question_1 =`//div[div[span[contains(text(),'Are all household members')]]]/div[2]//span[2][text()='Yes']`
        const Question_2 = `//div[div[span[contains(text(),'Is the spouse of any')]]]/div[2]//span[2][text()='Yes']`
        const Question_3 = `//div[div[span[contains(text(),'Does any operator have')]]]/div[2]//span[2][text()='No']`
        const Question_4 = `//div[div[span[contains(text(),'Any drivers self-employed')]]]/div[2]//span[2][text()='No']`
        const Question_5 = `//div[div[span[contains(text(),'Has any driver been convicted')]]]/div[2]//span[2][text()='No']`
        const Question_6 = `//div[div[span[contains(text(),'Will any vehicle be used')]]]/div[2]//span[2][text()='No']`
        const Question_7 = `//div[div[span[contains(text(),'Are any automobiles')]]]/div[2]//span[2][text()='No']`
        const Question_8 = `//div[div[span[contains(text(),'Have any automobiles')]]]/div[2]//span[2][text()='No']`
        const Question_9 = `//div[div[span[contains(text(),'Are any of the automobiles')]]]/div[2]//span[2][text()='No']`
        const paymentSigningDetails = `//h5[normalize-space()='Payment and Signing Details']`
        const checkNumberTextBox = `//input[@id='pol_payment_check_number']`
        const confirmPage = `//h4[normalize-space()='Confirm and Sign to Complete Purchase']`
        const agentCheckBox = `//div[h5[contains(text(), "Agent's Signature")]]//span[contains(text(),'the')]`
        const applicantCheckBox = `//div[h5[contains(text(), "Applicant's Signature")]]//span[contains(text(),'the')]`
        const agentSignature = `//input[@placeholder='KK Pattnaik']`
        const applicantSignature = `//div[h5[contains(text(), concat('Applicant', "'", 's Signature'))]]//div[div/span[text()='Full Legal Name*']]//input`
        const termAndConditions = `//h5[normalize-space()='Terms and Conditions']`
        const disabledagreeButton = `//button[@data-testid='agree-button'][@disabled]`
        const agreeButton = `//button[text()='Agree']`
        const officeEsign = `//div[text()='In Office eSign']`
        const applicantPlaceholder = `//div[h5[contains(text(), "Applicant's Signature")]]//input[@placeholder]`
        const modal = `//div[@class='MuiBox-root mui-wvmse7']`
        const AuthText = `//h6[text()='Authentication']`
        const purchaseButton = `//button[text()='Proceed with Purchase']`
        const successPolicyMsg = `//h5[contains(text(),'successfully purchased the policy.')]`
        const gotoPolicyPageBtn = `[data-test="go-to-policy-page-btn"]`
        const coverageSummaryLink = `[data-test="tab_coverage_summary"]`
        const otherCollisionText = `//td[text()='Other than Collision']`

    
        //Create firstname,lastname, phone number and email id
                const firstName = faker.person.firstName();
                const lastName = faker.person.lastName();
                const phone = faker.phone.number('(###) ###-####');
                const email = faker.internet.email()

                const firstName2 = faker.person.firstName();
                const lastName2 = faker.person.lastName();
            
                stepLog += "Step 1 : Open Browser and Proceed for Login\n"
            
                /*
                Step 1 : Navigate to Application in Browser
                Step 2 : Fill UserName & Password to login
                Step 3 : Click on the Login Button
                Step 4 : Verify bridger logo displayed after login
                */
                await page.goto(url)
                await page.locator(agentPortal).click()
                await page.locator(userNameLoc).fill(userName)
                await page.locator(passwordLoc).fill(passWord)
                await page.locator(submitButton).click()
                await expect(page.locator(bridgerLogo)).toBeVisible()
        
                stepLog += "Step 2 : User is able to Login And Verify the Bridger Logo in Landing Page\n"
            
                //Create Policy
                 stepLog += "Step 3 : Creating Policy for Texas Entering Valid Informations\n"
                await page.locator(newSubmissionBtn).click()
                await page.locator(stateDropdown).click()
                await page.selectOption(selectState, { label: 'Texas' })
                await page.locator(programDrodown).click()
                await page.selectOption(selectProgram, { label: 'Bridger Auto Segundo' })
                await page.selectOption(selectTerm, '6');
                stepLog += "Step 4 : Valid Informations are entered in New Submission Popup\n"
            
                //Enter Valid Name Insured Deatils 
                await page.locator(fName).fill(firstName)
                await page.locator(lName).fill(lastName)
                await page.click(continueBtn)
                await page.fill(cellPhone, phone)
                await page.fill(emailid,email)
                await page.locator(nextBtn).click()
                stepLog += "Step 5 : Valid Informations are entered in Name Insured Popup\n"
            
                //Enter Address Details
                await expect(page.locator(streetAddress)).toBeVisible({ timeout: 5000 })
                const streetInput = page.locator(streetAddress);
                await streetInput.pressSequentially('3216 Southwest Military Drive', { delay: 40 })
                await expect(page.locator(selectaddress)).toBeVisible()
                await page.locator(selectaddress).click()
                await page.locator(nextBtn).click()
        
                stepLog += "Step 6 : Valid Address entered in Address Popup\n"
            
                
                //Enter all details of vehicle
                await page.locator(addVehicleBtn).click()
                await page.locator(vehicleYear).click()
                await page.locator(`//li[text()='2021']`).click()
        
                
                // Locators
                const vinInput = page.locator(vehicleVin);
                const searchVinButton = page.locator(searchVinBtn);
                const makeField = page.locator(filledMakeTextBox);

                const VIN = '1C4PJLDN5MD156228';

                for (let i = 0; i < 5; i++) {
                console.log(`VIN Search Attempt: ${i + 1}`);

                // Clear & re-enter VIN every time
                await expect(vinInput).toBeEditable();
                await vinInput.click();
                await vinInput.fill('');
                await vinInput.pressSequentially(VIN, { delay: 40 });

                // Wait until search button enabled
                await expect(searchVinButton).toBeEnabled({ timeout: 5000 });
                await searchVinButton.click();

                try {
                    // Wait for Make field to get populated
                    await expect(makeField).toBeVisible({ timeout: 8000 });
                    const makeValue = await makeField.inputValue();

                    if (makeValue && makeValue.trim() !== '') {
                    console.log('Make/Model loaded successfully');
                    break;
                    }

            } catch (e) {
                console.log(`Retrying VIN search... Attempt ${i + 1}`);
                await page.waitForTimeout(2000);
        }

            // If last attempt → fail test
            if (i === 4) {
                throw new Error('VIN search failed after multiple attempts');
            }
        }

            await expect(page.locator(filledMakeTextBox)).toBeVisible()
            await page.locator(vehicleCost).fill('16000')
            await page.locator(vehicleUse).selectOption({ label: 'Business' });
            await page.locator(purchasedDate).fill(`01/13/2026`)
            await page.locator(purchasedStatus).selectOption({ label: 'Used - Not Original Owner' })
            await page.locator(damageStatus).selectOption({ label: 'None' })
            await page.locator(saveButton).click()
            await expect(page.locator(addedVehicle)).toBeVisible()

        //Capture First Vehicle Year Make Model
        const firstVehicleName = await page
        .locator('[data-test^="vehicle-card-"]')
        .first()
        .locator('span[class*="MuiTypography-labelLarge"]')
        .textContent();

        console.log(firstVehicleName?.trim());

      
        //Add 2nd Vehicle 
        await page.locator(addVehicleBtn).click()
        await page.locator(vehicleYear).click()
        await page.locator(`//li[text()='2015']`).click()
        await page.locator(vehicleVin).fill('1N4AL3AP9FC118473')
        await expect(page.locator(disabledSearchVinBtn)).not.toBeVisible()
        for (let i = 0; i < 5; i++) {
        await expect(searchVinButton).toBeEnabled({ timeout: 5000 });
        await searchVinButton.click();
        await page.waitForTimeout(5000)

        try {
            // wait until Make field gets value or becomes visible
            await expect(makeField).toBeVisible({ timeout: 5000 });
            console.log('Make/Model loaded');
            break;

        }   catch (e) {
            console.log(`Retrying VIN search... Attempt ${i + 1}`);
    }
}
        await expect(page.locator(filledMakeTextBox)).toBeVisible()
        await page.locator(vehicleCost).fill('12000')
        await page.locator(vehicleUse).selectOption({ label: 'Farm' });
        await page.locator(purchasedDate).fill(`01/20/2026`)
        await page.locator(purchasedStatus).selectOption({ label: 'New - Original Owner' })
        await page.locator(damageStatus).selectOption({ label: 'Existing Damage - More than Deductible' });
        await page.locator(saveButton).click()
        await expect(page.locator(addedVehicle)).toBeVisible() 

        
         //Capture Second Vehicle Year Make Model
        const secondVehicleName = await page
        .locator("//div[h5[text()='Insured Vehicles']]/div[2]/div/div[2]/div/div/div[2]/div[1]/span")
        .innerText();

        console.log(secondVehicleName.trim());


    
        //Driver Info Updated
        await page.locator(nextButton).click()
        await expect(page.locator(insuredRated)).toBeVisible()
        await page.locator(updateDriver).click();
        await page.locator(driverGender).selectOption({ label: 'Male' });
        await page
        .locator(driverMaritalStatus)
        .selectOption({ label: 'Divorced' });

        await page.locator(driverDOB).fill('02/20/1988');
        await page.locator(licenseTxtBox).fill('77282892');

        await page
        .locator(driverLicenseStatus)
        .selectOption({ label: 'Active' });

        await page.locator(driverLicenseYears).fill('1');
        await page.locator(driverLicenseMonths).fill('3');

        await page.locator(driverOccupation).click();
        await page.locator(selectAccountant).click();
         await page.locator(driverSubmitBtn).click();

          
        //Add Another Driver
        await page.locator(addDriver).click()
        await page.locator(driverFirstName).fill(firstName2)
        await page.locator(driverLastName).fill(lastName2)
        await page.locator(driverGender).selectOption({ label: 'Male' })
        await page
        .locator(driverMaritalStatus)
        .selectOption({ label: 'Separated' })

        await page.locator(driverDOB).fill('02/20/1989')
        
        await page
        .locator(insuredRelationship)
        .selectOption({ value: 'Sibling' })

        await page.locator(licenseState).click()
        await page.locator(selectTexas).click()
        await page.locator(licenseTxtBox).fill('77282891')


        await page
        .locator(driverLicenseStatus)
        .selectOption({ label: 'Active' });

        await page.locator(driverLicenseYears).fill('2');
        await page.locator(driverLicenseMonths).fill('7');

        await page.locator(driverOccupation).click();
        await page.locator(selectAgriculture).click();

        await page.locator(driverSubmitBtn).click();

        await page.locator(nextButton).click();
        await page.locator(nextButton).click();

        await expect(page.locator(policyEffectiveDate)).toBeVisible({
        timeout: 15000,
        });

        //Clicking on Next button without changing anything in "Policy Effective Date" page
        await page.locator(nextButton).click()
        await page.locator(nextButton).click()
        await expect(page.locator(coveragePage)).toBeVisible({ timeout: 5000 })

        //Action on Changes on Coverages
        await page.locator(pipSwitch).click()

        //Verify the 2nd Vehicle Coll is diactivated
        const coverageSection2 = page.locator('div', {
        has: page.getByRole('heading', {
        name: new RegExp(`Vehicle Coverages\\s*-\\s*${secondVehicleName}`)
    })
});

        const comprehensiveToggle = coverageSection2.locator(
        '[data-test^="coverage-item-switch-Other than Collision"][aria-disabled="true"]'
    )
          await expect(comprehensiveToggle).toBeVisible();

        
       
          // Select the 1st vehicle coll as it is activated
        const coverageSection = page.locator('div', {
        has: page.getByRole('heading', {
        name: new RegExp(`Vehicle Coverages\\s*-\\s*${firstVehicleName}`)
    })
 });
        const comprehensiveCheckbox = coverageSection.locator(
        '[data-test^="coverage-item-switch-Other than Collision"] input[type="checkbox"]'
        ).first();

        await comprehensiveCheckbox.scrollIntoViewIfNeeded();
        await comprehensiveCheckbox.check();  
        await page.locator(refreshPriceBtn).click()
        await page.locator(refreshPriceBtn).click()
        await expect(page.locator(disabledProceedBtn)).not.toBeVisible({ timeout: 5000 });
        await expect(page.locator(premiumValue)).toBeVisible({ timeout: 5000 });
        await expect(page.locator(proceedQuoteBtn)).toBeEnabled({ timeout: 5000 });
        await page.locator(proceedQuoteBtn).click();
        await expect(page.locator(paymentOptions)).toBeVisible({ timeout: 5000 });

        //Action On Payment Options
        await page.locator(validateEligibilityBtn).click()
        await expect(page.locator(uwQueryPage)).toBeVisible({ timeout: 5000 });

        //Action on UnderWriting/Eligibilty Question
        await page.locator(Question_1).click()
        await page.locator(Question_2).click()
        await page.locator(Question_3).click()
        await page.locator(Question_4).click()
        await page.locator(Question_5).click()
        await page.locator(Question_6).click()
        await page.locator(Question_7).click()
        await page.locator(Question_8).click()
        await page.locator(Question_9).click()
        await page.locator(nextButton).click()
        await page.waitForTimeout(5000)
        await expect(page.locator(paymentSigningDetails)).toBeVisible({ timeout: 5000 })

        //Payment Signing Details
        await page.locator(officeEsign).click()
        await page.locator(checkNumberTextBox).fill('1234567')
        await page.locator(nextButton).click()

        //Confirm and Sign to Complete Purchase
        await page.waitForTimeout(10000)
        await expect(page.locator(confirmPage)).toBeVisible({ timeout: 5000 })
        //await page.locator(agentCheckBox).hover()
         await page.waitForTimeout(5000)
        //await page.locator(agentCheckBox).click()
        await page.locator(agentCheckBox).click()
        await expect(page.locator(termAndConditions)).toBeVisible({ timeout: 5000 })
        //Scroll Down in the Modal
        for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, 400);   // scroll down
        await page.waitForTimeout(200);   // small pause for UI reaction
        }
        await expect(page.locator(modal)).toBeVisible({ timeout: 5000 })
        await expect(page.locator(disabledagreeButton)).not.toBeVisible({ timeout: 5000 });
        await page.locator(agreeButton).click()
        await page.locator(agentSignature).fill('KK Pattnaik')

        await page.locator(applicantCheckBox).click()
        await expect(page.locator(termAndConditions)).toBeVisible({ timeout: 5000 })
        await expect(page.locator(modal)).toBeVisible({ timeout: 5000 })
        await page.waitForTimeout(2000); 
        await page.locator(AuthText).hover({ timeout: 5000 })
        await expect(page.locator(disabledagreeButton)).not.toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(2000); 
        await page.locator(agreeButton).click()

        const placeholderText = await page.locator(applicantPlaceholder).getAttribute("placeholder");

        console.log("Placeholder:", placeholderText);

        await page.locator(applicantSignature).fill(placeholderText)

        await page.locator(purchaseButton).click()
        await expect(page.locator(successPolicyMsg)).toBeVisible({ timeout: 10000 });

        //Goto Policy Page
        await page.locator(gotoPolicyPageBtn).click()
        await page.locator(coverageSummaryLink).click()
        await expect(page.locator(otherCollisionText)).toBeVisible({ timeout: 10000 });
    
    })
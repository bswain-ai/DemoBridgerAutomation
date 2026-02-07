   import { test,expect } from '@playwright/test';
   import { credentials } from '../config/credentials.js';
   import { locators } from '../Locators/selectors.js';
   import xlsx from 'xlsx';
   import { faker } from '@faker-js/faker'
   

    const { log } = require('./customLogger');
    let stepLog = '';

    
    test('Create Policy', async ({page},testInfo) => {
    
        test.setTimeout(150000);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        const filePath = credentials.dataFile;
        const resultPath = credentials.resultFile;

        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets['CreatePolicy'];
        const excelData = xlsx.utils.sheet_to_json(sheet);

        const policyData = excelData[0];

    
        //Create firstname,lastname, phone number and email id
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const phone = faker.phone.number('(###) ###-####');
        const email = faker.internet.email()
    
        stepLog += "Step 1 : Open Browser and Proceed for Login\n"
    
        /*
        Step 1 : Navigate to Application in Browser
        Step 2 : Fill UserName & Password to login
        Step 3 : Click on the Login Button
        Step 4 : Verify bridger logo displayed after login
        */
        await page.goto(credentials.baseUrl)
        await page.reload();
        await page.locator(locators.agentPortal).click()
        await page.locator(locators.userNameLoc).fill(credentials.username)
        await page.locator(locators.passwordLoc).fill(credentials.password)
        await page.locator(locators.submitButton).click()
        await expect(page.locator(locators.bridgerLogo)).toBeVisible()

        stepLog += "Step 2 : User is able to Login And Verify the Bridger Logo in Landing Page\n"
    
        //Create Policy
        //Enter Valid Name Insured Deatils
         stepLog += "Step 3 : Creating Policy for Texas Entering Valid Informations\n"
        
         await page.locator(locators.newSubmissionBtn).click()
        await page.locator(locators.stateDropdown).click()
        await page.selectOption(locators.selectState, { label: policyData.State });
        await page.locator(locators.programDrodown).click()
        await page.selectOption(locators.selectProgram, { label: policyData.Program });
        await page.selectOption(locators.selectTerm, policyData.TermLength.toString());
        
        stepLog += "Step 4 : Valid Informations are entered in New Submission Popup\n"
    
         
        await page.locator(locators.fName).fill(firstName)
        await page.locator(locators.lName).fill(lastName)
        await page.click(locators.continueBtn)
        await page.fill(locators.cellPhone, phone)
        await page.fill(locators.emailid,email)
        await page.locator(locators.nextBtn).click()
        stepLog += "Step 5 : Valid Informations are entered in Name Insured Popup\n"
    
        //Enter Address Details
        await expect(page.locator(locators.streetAddress)).toBeVisible({ timeout: 5000 })
        const streetInput = page.locator(locators.streetAddress);
        await streetInput.pressSequentially(policyData.Address.toString(), { delay: 40 })
        const selectAddress = page.locator(locators.selectaddress)
        await expect(selectAddress).toBeVisible()
        await selectAddress.click();
        await page.locator(locators.nextBtn).click()

        stepLog += "Step 6 : Valid Address entered in Address Popup\n"
    
        
        //Enter all details of vehicle
        await page.locator(locators.addVehicleBtn).click()
        await page.locator(locators.vehicleYear).click()
        await page.locator(locators.selectYear(policyData.Vyear)).click()

        // Locators
        const vinInput = page.locator(locators.vehicleVin);
        const searchVinButton = page.locator(locators.searchVinBtn);
        const makeField = page.locator(locators.filledMakeTextBox);

        for (let i = 0; i < 5; i++) {
        console.log(`VIN Search Attempt: ${i + 1}`);

        // Clear & re-enter VIN every time
        //await page.waitForTimeout(5000)
        if (await vinInput.isEditable()) {
        await vinInput.fill('');
        await vinInput.type(policyData.VIN.toString(), { delay: 400 });

        await expect(searchVinButton).toBeEnabled({ timeout: 5000 });
        await searchVinButton.click();
        }


    try {
        await expect(makeField).toBeVisible({ timeout: 30000 });

        const makeValue = await makeField.inputValue();

        if (makeValue && makeValue.trim() !== '') {
            console.log('Make/Model loaded successfully');
            break;
        }
    } catch {
        console.log(`Retrying VIN search... Attempt ${i + 1}`);
    }

        // If last attempt → fail test
        if (i === 4) {
            throw new Error('VIN search failed after multiple attempts');
        }
    }
        
        await expect(page.locator(locators.filledMakeTextBox)).toBeVisible()
        await page.locator(locators.vehicleCost).fill(policyData.Vcost.toString())
        await page.locator(locators.vehicleUse).selectOption({ label: policyData.Vuse });
        await page.locator(locators.purchasedDate).fill(policyData.Pdate.toString())
        await page.locator(locators.purchasedStatus).selectOption({ label: policyData.Pstatus })
        await page.locator(locators.damageStatus).selectOption({ label: policyData.Dstatus });
        await page.locator(locators.saveButton).click()
        await expect(page.locator(locators.addedVehicle(policyData.VIN))).toBeVisible();
        await page.locator(locators.nextButton).click()
        await expect(page.locator(locators.insuredRated)).toBeVisible()
        
        //Driver Info Updated
        await page.locator(locators.updateDriver).click();
        await page.locator(locators.driverGender).selectOption({ label: policyData.Dgender });
        await page
        .locator(locators.driverMaritalStatus)
        .selectOption({ label: policyData.DMaritalStatus });

        await page.locator(locators.driverDOB).fill(policyData.Ddob.toString());
        await page.locator(locators.licenseTxtBox).fill(policyData.LicenseNo.toString());

        await page
        .locator(locators.driverLicenseStatus)
        .selectOption({ label: policyData.DLicenseStatus });

        await page.locator(locators.driverLicenseYears).fill(policyData.DLicenseYears.toString());
        await page.locator(locators.driverLicenseMonths).fill(policyData.DLicenseMonths.toString());

        await page.locator(locators.driverOccupation).click();
        await page.locator(locators.selectAccountant).click();

        await page.locator(locators.driverSubmitBtn).click();

        await page.locator(locators.nextButton).click();
        await page.locator(locators.nextButton).click();

        await expect(page.locator(locators.policyEffectiveDate)).toBeVisible({
        timeout: 15000,
        });

        //Clicking on Next button without changing anything in "Policy Effective Date" page
        await page.locator(locators.nextButton).click()
        await page.locator(locators.nextButton).click()
        await expect(page.locator(locators.coveragePage)).toBeVisible({ timeout: 5000 })
        
        stepLog += "Step 7 : All Valid Details of Driver information entered\n"

        //Action on Changes on Coverages
        await page.locator(locators.pipSwitch).click()
        await page.locator(locators.refreshPriceBtn).click()
        await page.locator(locators.refreshPriceBtn).click()
        await expect(page.locator(locators.disabledProceedBtn)).not.toBeVisible({ timeout: 5000 });
        await expect(page.locator(locators.premiumValue)).toBeVisible({ timeout: 5000 });
        await expect(page.locator(locators.proceedQuoteBtn)).toBeEnabled({ timeout: 5000 });
        await page.locator(locators.proceedQuoteBtn).click();
        await expect(page.locator(locators.paymentOptions)).toBeVisible({ timeout: 5000 });

        //Action On Payment Options
        await page.locator(locators.validateEligibilityBtn).click()
        await expect(page.locator(locators.uwQueryPage)).toBeVisible({ timeout: 5000 });

        //Action on UnderWriting/Eligibilty Questions
        await page.locator(locators.Question_1).click()
        await page.locator(locators.Question_2).click()
        await page.locator(locators.Question_3).click()
        await page.locator(locators.Question_4).click()
        await page.locator(locators.Question_5).click()
        await page.locator(locators.Question_6).click()
        await page.locator(locators.Question_7).click()
        await page.locator(locators.Question_8).click()
        await page.locator(locators.Question_9).click()
        await page.locator(locators.nextButton).click()
        await page.waitForTimeout(5000)
        await expect(page.locator(locators.paymentSigningDetails)).toBeVisible({ timeout: 5000 })
        
        stepLog += "Step 8 : Payment & UW Question details are entered\n"

        //Payment Signing Details
        await page.locator(locators.officeEsign).click()
        await page.locator(locators.checkNumberTextBox).fill(policyData.ChkNumber.toString())
        await page.locator(locators.nextButton).click()

        //Confirm and Sign to Complete Purchase
        //await page.waitForTimeout(10000)
        await expect(page.locator(locators.confirmPage)).toBeVisible({ timeout: 50000 })
         //await page.waitForTimeout(5000)
        await page.locator(locators.agentCheckBox).click()
        await expect(page.locator(locators.termAndConditions)).toBeVisible({ timeout: 50000 })
        //Scroll Down in the Modal
        for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, 400);   // scroll down
        await page.waitForTimeout(200);   // small pause for UI reaction
        }
        await expect(page.locator(locators.modal)).toBeVisible({ timeout: 5000 })
        await expect(page.locator(locators.disabledagreeButton)).not.toBeVisible({ timeout: 5000 });
        await page.locator(locators.agreeButton).click()
        const agentText = await page.locator(locators.agentSignaturePlaceholder).getAttribute("placeholder");
        console.log("Placeholder:", agentText);
        await page.locator(locators.agentSignature).fill(agentText)

        await page.locator(locators.applicantCheckBox).click()
        await expect(page.locator(locators.termAndConditions)).toBeVisible({ timeout: 50000 })
        await expect(page.locator(locators.modal)).toBeVisible({ timeout: 5000 })
        //await page.waitForTimeout(2000); 
        await page.locator(locators.AuthText).hover({ timeout: 5000 })
        await expect(page.locator(locators.disabledagreeButton)).not.toBeVisible({ timeout: 50000 });
        await page.locator(locators.agreeButton).click()

        const placeholderText = await page.locator(locators.applicantSignaturePlaceholder).getAttribute("placeholder");
        console.log("Placeholder:", placeholderText);
        await page.locator(locators.applicantSignature).fill(placeholderText)
        
        stepLog += "Step 9 : Enter Payment Details and Agree for Agent Modal & Applicant Modal\n"

        await expect(page.locator(locators.purchaseButton)).toBeVisible({ timeout: 30000 })
        await page.locator(locators.purchaseButton).click()
        await expect(page.locator(locators.successPolicyMsg)).toBeVisible({ timeout: 30000 });
        const policyNo = (await page.locator(locators.policyNumber).textContent())?.trim();
        const nameInsured = (await page.locator(locators.insuredName).textContent())?.trim();
        const policyTerm = (await page.locator(locators.policyTerm).textContent())?.trim();
        const totalPremium = (await page.locator(locators.totalPremium).textContent())?.trim();
        const paymentPlan = (await page.locator(locators.paymentPlan).textContent())?.trim();


        //Capurte Deatils in Coverage Summary
        await expect(page.locator(locators.policyPageBtn)).toBeVisible({ timeout: 30000 })
        await page.locator(locators.policyPageBtn).click()
        
        
        await expect(page.locator(locators.coverageSummaryBtn)).toBeVisible({ timeout: 30000 })
        await page.locator(locators.coverageSummaryBtn).click()
        await page.reload();
        await page.locator(locators.coverageSummaryBtn).click()
        await page.waitForTimeout(2000); 
        const BiLimit = (await page.locator(locators.BiLimit).textContent())?.trim();
        const BiPremium = (await page.locator(locators.BiPremium).textContent())?.trim();
        const PdLimit = (await page.locator(locators.PdLimit).textContent())?.trim();
        const PdPremium = (await page.locator(locators.PdPremium).textContent())?.trim();
        const PipLimit = (await page.locator(locators.PipLimit).textContent())?.trim();
        const PipPremium = (await page.locator(locators.PipPremium).textContent())?.trim();
        const fraudFee = (await page.locator(locators.fraudFee).textContent())?.trim();
        const policyFee = (await page.locator(locators.policyFee).textContent())?.trim();

        //Capture All Deatils regarding Created Policy
        stepLog += `Step 10 : Policy is Created and the Policy Number is : ${policyNo}\n`
        stepLog += `Step 11 : Policy is Created with Insured name : ${nameInsured}\n`
        stepLog += `Step 12 : Policy is Created with Policy Term : ${policyTerm}\n`
        stepLog += `Step 13 : Policy is Created with Premium Total : ${totalPremium}\n`
        stepLog += `Step 14 : Policy is Created with Playment Plan : ${paymentPlan}\n`
        
        stepLog += `Step 15 : BI Limits : ${BiLimit.padEnd(15)} BI Premium : ${BiPremium}\n`;
        stepLog += `Step 16 : PD Limits : ${PdLimit.padEnd(15)} PD Premium : ${PdPremium}\n`;
        stepLog += `Step 17 : PIP Limits: ${PipLimit.padEnd(15)} PIP Premium: ${PipPremium}\n`;
        stepLog += `Step 18 : Fraud Fee Tax is : ${fraudFee}\n`
        stepLog += `Step 14 : Policy Fee Tax is : ${policyFee}`

        //Capture Policy Number in Excel
        const resultWorkbook = xlsx.readFile(resultPath);
        const resultSheet = resultWorkbook.Sheets['CreatePolicy'];
        const policyNumberCell = xlsx.utils.encode_cell({ r: 1, c: 19 });
        const insuredNameCell = xlsx.utils.encode_cell({ r: 1, c: 20 });
        const policyTermCell = xlsx.utils.encode_cell({ r: 1, c: 21 });
        const totalPremiumCell = xlsx.utils.encode_cell({ r: 1, c: 22 });
        const paymentPlanCell = xlsx.utils.encode_cell({ r: 1, c: 23 });
        const biLimitCell = xlsx.utils.encode_cell({ r: 1, c: 24 });
        const biPremiumCell = xlsx.utils.encode_cell({ r: 1, c: 25 });
        const pdLimitCell = xlsx.utils.encode_cell({ r: 1, c: 26 });
        const pdPremiumCell = xlsx.utils.encode_cell({ r: 1, c: 27 });
        const pipLimitCell = xlsx.utils.encode_cell({ r: 1, c: 28 });
        const pipPremiumCell = xlsx.utils.encode_cell({ r: 1, c: 29 });
        const policyFeeCell = xlsx.utils.encode_cell({ r: 1, c: 30 });
        const fraudFeeCell = xlsx.utils.encode_cell({ r: 1, c: 31 });
        resultSheet[policyNumberCell] = { t: 's', v: policyNo };
        resultSheet[insuredNameCell] = { t: 's', v: nameInsured };
        resultSheet[policyTermCell] = { t: 's', v: policyTerm };
        resultSheet[totalPremiumCell] = { t: 's', v: totalPremium };
        resultSheet[paymentPlanCell] = { t: 's', v: paymentPlan };
        resultSheet[biLimitCell] = { t: 's', v: BiLimit };
        resultSheet[biPremiumCell] = { t: 's', v: BiPremium };
        resultSheet[pdLimitCell] = { t: 's', v: PdLimit };
        resultSheet[pdPremiumCell] = { t: 's', v: PdPremium };
        resultSheet[pipLimitCell] = { t: 's', v: PipLimit };
        resultSheet[pipPremiumCell] = { t: 's', v: PipPremium };
        resultSheet[policyFeeCell] = { t: 's', v: policyFee };
        resultSheet[fraudFeeCell] = { t: 's', v: fraudFee };
        xlsx.writeFile(resultWorkbook, resultPath);

       
        log(testInfo, stepLog);

        await page.screenshot({
        path: `screenshots/policy_completed_${timestamp}.png`,
        fullPage: true
    });


    
})
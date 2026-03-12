export const locators = {

  // ==================== Login Portal ======================

  agentPortal: `//button[normalize-space()='Agent Portal']`,
  userNameLoc: `//input[@id='username']`,
  passwordLoc: `//input[@id='password']`,
  submitButton: `//button[@type='submit']`,

  // ==================== Submission Page ====================

  bridgerLogo: `//img[@alt='App-bar-logo']`,
  quoteList: `[data-test="quoteList"]`,
  newSubmissionBtn: `//button[normalize-space()='New Submission']`,
  stateDropdown: `//button[normalize-space()='New Submission']`,
  selectState: `#pol_issued_state`,
  programDrodown: `//select[@id='pol_lob']`,
  selectProgram: `#pol_lob`,
  effectiveDate: `#startTime`,
  selectTerm: `#pol_term`,
  
  // ================= Named Owner Questions =================

  namedOwnerYes: '[data-test="f_pol_vehicle_owner_type_true"]',
  namedOwnerNo: '[data-test="f_pol_vehicle_owner_type_false"]',
  vehicleRegisteredNo: '[data-test="f_pol_vehicle_regular_access_false"]',
  fName: `[data-test="f_firstName"]`,
  lName: `[data-test="f_lastName"]`,
  continueBtn: `[data-test="dialogActions-continue-btn"]`,
  cellPhone: `//input[@id='pol_insured_cell_phone']`,
  emailid: `//input[@id='pol_insured_email']`,
  nextBtn: `//button[@type='submit']`,

  // ================== Address Details ========================
  streetAddress: `[data-test="f_pol_insured_garaging_address_street"]`,
  selectaddress: "//li[1]/div/p",

  // ================== Vehicle Details ========================
  addVehicleBtn: `[data-test="add-vehicle-button"]`,
  vehicleYear: `[data-test="f_vehicle_year"]`,
  selectYear: (year) => `//li[text()='${year}']`,
  vehicleVin: `[data-test="f_vehicle_vin"]`,
  vehicleMake: `[data-test="f_vehicle_make"]`,
  vehicleModel: `[data-test="f_vehicle_model"]`,
  searchVinBtn: `[data-test="search-by-vin-btn"]`,
  disabledSearchVinBtn: `//button[@disabled]`,
  filledMakeTextBox: `//label[@id='vehicle_make-label' and @data-shrink='true']`,
  vehicleCost: `[data-test="f_vehicle_msrp"]`,
  vehicleUse: `[data-test="f_vehicle_use"]`,
  purchasedDate: `//input[@id='vehicle_purchased']`,
  purchasedStatus: `[data-test="f_vehicle_is_new"]`,
  damageStatus: `[data-test="f_vehicle_damage"]`,
  vehicleSalvageYes: '[data-test="vehicle_salvaged_true"]',
  vehicleSalvageNo: '[data-test="vehicle_salvaged_false"]',
  saveButton: `//button[normalize-space()='Save']`,
  addedVehicle: (vin) => `//span[text()='${vin}']`,
  nextButton: `[data-test="next-btn"]`,

  // ================== Driver Details ===========================

  insuredRated: `//span[contains(text(),'Insured,')]`,
  updateDriver: `//span[normalize-space()='Update']`,
  driverGender: `#driver_gender`,
  driverMaritalStatus: `[data-test="f_driver_marital_status"]`,
  driverDOB: `[data-test="f_driver_dob"]`,
  driverLicenseState: '[data-test="f_driver_license_state"]',
  driverLicenseStatus: `[data-test="f_driver_license_status"]`,
  driverLicenseYears: `//input[@id='driver_license_years']`,
  driverLicenseMonths: `//input[@id='driver_license_month']`,
  licenseTxtBox: `//input[@id='driver_license_number']`,
  sr22CheckBox: `[data-test="f_driver_sr22"]`,
  defensiveDriverCheckBox: `[data-test="f_driver_defensive"]`,
  drugDiscountCheckBox: `[data-test="f_driver_alcohol_awareness"]`,
  driverOccupation: `[data-test="f_driver_occupation"]`,
  selectOccupation: (occupation) =>
    `//ul[@id='driver_occupation-listbox']/li[contains(text(),'${occupation}')]`,
  driverSubmitBtn: `[data-test="driver-drawer-submit"]`,
  policyEffectiveDate: `//h5[normalize-space()='Policy Effective Date']`,

  // ============================== Violation Details =============================
  

  // =========================================  Coverage Details  ===============================
  coveragePage: `//h5[normalize-space()='Coverages']`,
  pipToggle:
    '[data-test="coverage-item-switch-Personal Injury Protection (PIP)"] input[type="checkbox"]',

  medpayToggle:
    '[data-test="coverage-item-switch-Medical Payments (MEDPAY)"] input[type="checkbox"]',

  umbiToggle:
    '[data-test="coverage-item-switch-Uninsured Motorist Bodily Injury (UMBI)"] input[type="checkbox"]',

  umpdToggle:
    '[data-test="coverage-item-switch-Uninsured Motorist Property Damage (UMPD)"] input[type="checkbox"]',

  motorclubToggle:
    '[data-test="coverage-item-switch-Motorclub"] input[type="checkbox"]',

  compToggle:
    '[data-test="coverage-item-switch-Other than Collision (Comprehensive Coverage)-0"]  input[type="checkbox"]',

  collToggle: `[data-test="coverage-item-switch-Collision-0"] input[type="checkbox"]`,

  rentalToggle:
    '[data-test="coverage-item-switch-Rental Reimbursement-0"] input[type="checkbox"]',

  roadsideToggle:
    '[data-test="coverage-item-switch-Roadside Assistance-0"] input[type="checkbox"]',

  rrLimit: '[data-test="coverage-item-limit-Rental Reimbursement-0"]',
  rrDuration: '[data-test="coverage-item-deductible-Rental Reimbursement-0"]',
  rsaLimit: '[data-test="coverage-item-limit-Roadside Assistance-0"]',
  rsaOption: (value) => `//li[contains(text(),'${value}')]`,

  compDeductible: `[aria-labelledby*="Other than Collision"]`,
  collDeductible: `[aria-labelledby="Collision-deductible-label Collision-deductible"]`,
  refreshPriceBtn: ` //button[normalize-space()='Refresh Price']`,
  compDeductibleOption: (value) => `li[role="option"] >> text="$${value}"`,
  collDeductibleOption: (value) => `li[role="option"] >> text="$${value}"`,
  premiumValue: `[data-test='premium-summary-price-0']`,

  // ============================== Payment Option Details ==============================

  paymentOptions: `//h5[normalize-space()='Payment Options']`,
  compText: `//td[text()='Other than Collision']`,
  collText: `//td[text()='Collision']`,
  pipText: `//td[text()='PIP']`,
  backBtn: `[data-test='back-btn']`,
  proceedQuoteBtn: `//button[@type='button'][normalize-space()='Proceed to Quote']`,
  disabledProceedBtn: `//button[@data-test='refresh-price-btn']/following-sibling::span/button[@disabled]`,
  validateEligibilityBtn: `//button[@type='submit']`,

  //=================== UnderWriter Details ======================================
  uwQueryPage: `//h5[normalize-space()='Underwriting/Eligibility Questions']`,
  uuwRadio: (id, value) =>
    `xpath=//*[@id="${id}"]//input[@type="radio" and @value="${value}"]`,

  //============================== Payment and Signing Details ==================================
  paymentSigningDetails: `//h5[normalize-space()='Payment and Signing Details']`,
  checkNumberTextBox: `//input[@id='pol_payment_check_number']`,
  confirmPage: `//h4[normalize-space()='Confirm and Sign to Complete Purchase']`,
  agentCheckBox: `//div[h5[contains(text(), "Agent's Signature")]]//span[contains(text(),'the')]`,
  applicantCheckBox: `//div[h5[contains(text(), "Applicant's Signature")]]//span[contains(text(),'the')]`,
  agentSignature: (placeholder) => `//input[@placeholder='${placeholder}']`,
  applicantSignature: `//div[h5[contains(text(), concat('Applicant', "'", 's Signature'))]]//div[div/span[text()='Full Legal Name*']]//input`,
  termAndConditions: `//h5[normalize-space()='Terms and Conditions']`,
  disabledagreeButton: `//button[@data-testid='agree-button'][@disabled]`,
  agreeButton: `//button[text()='Agree']`,
  officeEsign: `//div[text()='In Office eSign']`,
  agentSignaturePlaceholder: `//div[h5[contains(text(), "Agent's Signature")]]//input[@placeholder]`,
  applicantSignaturePlaceholder: `//div[h5[contains(text(), "Applicant's Signature")]]//input[@placeholder]`,
  modal: `//div[@class='MuiBox-root mui-wvmse7']`,
  AuthText: `//h6[text()='Authentication']`,
  purchaseButton: `//button[text()='Proceed with Purchase']`,

  // ===============================  Success Page After Policy Creation  ================================
  successPolicyMsg: `//h5[contains(text(),'successfully purchased the policy.')]`,
  policyNumber: `//div[span[text()='Policy Number']]/following-sibling::div/span`,
  insuredName: `//div[span[text()='Named Insured']]/following-sibling::div/span`,
  policyTerm: `//div[span[text()='Policy Term']]/following-sibling::div/span`,
  paymentPlan: `//div[span[text()='Payment Plan']]/following-sibling::div/span`,
  totalPremium: `//div[span[text()='Premium Total']]/following-sibling::div/span`,
  policyPageBtn: `//button[@data-test='go-to-policy-page-btn']`,

  // =================================== Policy Summary Page ============================
  coverageSummaryBtn: `//button[@data-test='tab_coverage_summary']`,
  vehiclesBtn: `//span[text()='Vehicles']`,
  addedfirstVehicle: `div[role='cell'] button span`,

  // ================================== Coverage Summary Page =============================
  BiLimit: `//div[h5[text()='Coverage Summary']]/following-sibling::div[1]//tr[2]/td[4]`,
  BiPremium: `[data-test="coverage-premium-0-BI"]`,
  PdLimit: `//div[h5[text()='Coverage Summary']]/following-sibling::div[1]//tr[3]/td[4]`,
  PdPremium: `[data-test="coverage-premium-0-PD"]`,
  PipLimit: `//div[h5[text()='Coverage Summary']]/following-sibling::div[1]//tr[4]/td[2]`,
  PipPremium: `[data-test="coverage-premium-0-PIP"]`,
  medpayPremium: `[data-test="coverage-premium-0-MEDPAY"]`,
  umbiPremium: `[data-test="coverage-premium-0-UMBI"]`,
  uimbiPremium: `[data-test="coverage-premium-0-UIMBI"]`,
  umpdPremium: `[data-test="coverage-premium-0-UMPD"]`,
  uimpdPremium: `[data-test="coverage-premium-0-UIMPD"]`,
  compPremium: `[data-test="coverage-premium-0-Other than Collision"]`,
  collPremium: `[data-test="coverage-premium-0-Collision"]`,
  rentalPremium: `[data-test="coverage-premium-0-Rental Reimbursement"]`,
  roadPremium: `[data-test="coverage-premium-0-Roadside Assistance"]`,
  coveragePremium: `[data-test="coverages-total"]`,
  frFee: `[data-test="tax-fee-Financial Responsibility Fee"]`,
  fraudFee: `[data-test='tax-fee-Fraud Fee']`,
  policyFee: `[data-test='tax-fee-Policy Fee']`,
  // searchTextBox: `//input[@placeholder='Search']`,
  // searchPolicy: (policyNumber) => `//span[text()='Policy - ${policyNumber}']`,
  submissionNo: `//p[text()='Submission No.']`,
  closeVehicleDetails: `[data-test="vehicle-drawer-close"]`,
  submissionBtn: `[data-test="sidebar-Submissions-btn"]`,
  loader: `//div[text()='Searching for vehicle information']`,
};

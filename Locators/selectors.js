const getIndex = (v) => Number(v.replace("V", "")) - 1;

export const locators = {
  // ==================== Login Portal ======================

  agentPortal: `[data-test="agent-portal-btn"]`,
  underwriterPortal: `[data-test="underwriter-portal-btn"]`,
  userNameLoc: `//input[@id='username']`,
  passwordLoc: `//input[@id='password']`,
  submitButton: `//button[@type='submit']`,

  // ==================== Submission Page ====================

  bridgerLogo: `//img[@alt='App-bar-logo']`,
  quoteList: `[data-test="quoteList"]`,
  newSubmissionBtn: `[data-test="new-submission-btn"]`,
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
  vehicleSalvageYes: '[data-test="f_vehicle_salvaged_true"]',
  vehicleSalvageNo: '[data-test="f_vehicle_salvaged_false"]',
  saveButton: `[data-test="vehicle-drawer-submit"]`,
  addedVehicle: (vin) => `//span[text()='${vin}']`,
  nextButton: `[data-test="next-btn"]`,

  // ================== Driver Details ===========================

  insuredRated: `//span[contains(text(),'Insured,')]`,
  updateDriver: `//span[normalize-space()='Update']`,
  addDriverBtn: `[data-test="add-driver-button"]`,
  driverFirstName: `[data-test="f_driver_first_name"]`,
  driverLastName: `[data-test="f_driver_last_name"]`,
  driverRelation: `[data-test="f_driver_relations_to_named_insured"]`,
  driverGender: `[data-test="f_driver_gender"]`,
  driverMaritalStatus: `[data-test="f_driver_marital_status"]`,
  driverDOB: `[data-test="f_driver_dob"]`,
  driverLicenseState: '[data-test="f_driver_license_state"]',
  driverLicenseStatus: `[data-test="f_driver_license_status"]`,
  driverLicenseYears: `//input[@id='driver_license_years']`,
  driverLicenseMonths: `//input[@id='driver_license_month']`,
  licenseTxtBox: `//input[@id='driver_license_number']`,
  sr22CheckBox: `[data-test="f_driver_sr22"]`,
  age55Checkbox: '[data-test="f_driver_mature_driver_improvement_course"]',
  goodStudentCheckbox: '[data-test="f_driver_good_student"]',
  youthfulDriverCheckbox: '[data-test="f_driver_drive_training"]',
  defensiveDriverCheckBox: `[data-test="f_driver_defensive"]`,
  drugDiscountCheckBox: `[data-test="f_driver_alcohol_awareness"]`,
  driverOccupation: `[data-test="f_driver_occupation"]`,
  selectOccupation: (occupation) =>
    `//ul[@id='driver_occupation-listbox']/li[contains(text(),'${occupation}')]`,
  driverSubmitBtn: `[data-test="driver-drawer-submit"]`,
  policyEffectiveDate: `//h5[normalize-space()='Policy Effective Date']`,
  driverExperience: `#driver_experience`,
  // ============================== Violation Details =============================
  hasViolationYesRadio: '[data-test="f_has_violations_true"]',
  hasViolationNoRadio: '[data-test="f_has_violations_false"]',
  addViolationBtn: '[data-test="add-violation-button"]',
  violationDriverDropdown: '[data-test="f_selected_driver_index"]',
  violationIncidentCodeDropdown: '[data-test="f_driver_incident_code"]',
  selectViolationIncidentCode: (code) =>
    `//ul[@id='driver_incident_code-listbox']//li[normalize-space()='${code}']`,
  violationDate: '[data-test="f_driver_violation_date"]',
  convictionDate: '[data-test="f_driver_conviction_date"]',
  violationSaveBtn: '[data-test="violation-drawer-submit"]',

  // =========================================  Coverage Details  ===============================
  coveragePage: `//h5[normalize-space()='Coverages']`,
  pipToggle:
    '[data-test="coverage-item-switch-Personal Injury Protection (PIP)"] input[type="checkbox"]',

  medpayToggle:
    '[data-test="coverage-item-switch-Medical Payments (MEDPAY)"] input[type="checkbox"]',

  medpayLimit: `[id="Medical Payments (MEDPAY)-limit"]`,

  umbiToggle:
    '[data-test="coverage-item-switch-Uninsured Motorist Bodily Injury (UMBI)"] input[type="checkbox"]',

  umpdToggle:
    '[data-test="coverage-item-switch-Uninsured Motorist Property Damage (UMPD)"] input[type="checkbox"]',

  motorclubToggle:
    '[data-test="coverage-item-switch-Motorclub"] input[type="checkbox"]',

  compToggle: (v) =>
    `[data-test="coverage-item-switch-Other than Collision (Comprehensive Coverage)-${getIndex(v)}"] input[type="checkbox"]`,

  collToggle: (v) =>
    `[data-test="coverage-item-switch-Collision-${getIndex(v)}"] input[type="checkbox"]`,

  rentalToggle: (v) =>
    `[data-test="coverage-item-switch-Rental Reimbursement-${getIndex(v)}"] input[type="checkbox"]`,

  roadsideToggle: (v) =>
    `[data-test="coverage-item-switch-Roadside Assistance-${getIndex(v)}"] input[type="checkbox"]`,

  rrLimit: (v) =>
    `[data-test="coverage-item-limit-Rental Reimbursement-${getIndex(v)}"]`,

  rrDuration: (v) =>
    `[data-test="coverage-item-deductible-Rental Reimbursement-${getIndex(v)}"]`,

  rsaLimit: (v) =>
    `[data-test="coverage-item-limit-Roadside Assistance-${getIndex(v)}"]`,
  rsaOption: (value) => `//li[contains(text(),'${value}')]`,

  compDeductible: (v) =>
    `[data-test="coverage-item-deductible-Other than Collision (Comprehensive Coverage)-${getIndex(v)}"]`,

  collDeductible: (v) =>
    `[data-test="coverage-item-deductible-Collision-${getIndex(v)}"]`,

  cdwToggle: `[data-test="coverage-item-switch-CDW"] input[type="checkbox"]`,
  tripleDedToggle: `[data-test="coverage-item-switch-Triple Deductible"] input[type="checkbox"]`,

  refreshPriceBtn: ` //button[normalize-space()='Refresh Price']`,
  compDeductibleOption: (value) => `li[role="option"] >> text="$${value}"`,
  collDeductibleOption: (value) => `li[role="option"] >> text="$${value}"`,
  premiumValue: `[data-test='premium-summary-price-0']`,

  // ============================== Payment Option Details ==============================

  paymentOptions: `//h5[normalize-space()='Payment Options']`,
  paymentOptionCheckbox: (paymentType) =>
    `//td[div[text()='${paymentType}']]/preceding-sibling::td//input`,
  compText: `//td[text()='Other than Collision']`,
  collText: `//td[text()='Collision']`,
  pipText: `//td[text()='PIP']`,
  backBtn: `[data-test='back-btn']`,
  proceedQuoteBtn: `//button[@type='button'][normalize-space()='Proceed to Quote']`,
  disabledProceedBtn: `//button[@data-test='refresh-price-btn']/following-sibling::span/button[@disabled]`,
  validateEligibilityBtn: `//button[@type='submit']`,
  mvrReportCompletePopup: "//h5[normalize-space()='MVR Report Complete']",
  mvrContinueButton: "[data-test='premium-update-modal-confirm-purchase-btn']",

  //=================== UnderWriter Details ======================================
  uwQueryPage: `//h5[normalize-space()='Underwriting/Eligibility Questions']`,
  uuwRadio: (id, value) =>
    `xpath=//*[@id="${id}"]//input[@type="radio" and @value="${value}"]`,

  //============================== Payment and Signing Details ==================================
  paymentSigningDetails: `//h5[normalize-space()='Payment and Signing Details']`,
  checkNumberTextBox: `//input[@id='pol_payment_check_number']`,
  producerOnlyChkBox: `//div[h5[text()='Producer Only']]//input[@type='checkbox']`,
  officeEsign: `//div[text()='In Office eSign']`,
  identityPreflightPage: `//h4[contains(text(),'Identity')]`,
  handoffDeviceCheckbox: `//span[contains(text(),'I confirm I')]/preceding-sibling::span/input[@type='checkbox']`,
  beginSigningBtn: `//button[text()='Begin Signing']`,
  nxtButton: `//button[text()='Next']`,
  reviewedGaragingAddress: `//div[span[contains(text(),'Please')]]/div/div[1]//input`,
  reviewedCoverages: `//div[span[contains(text(),'Please')]]/div/div[2]//input`,
  confirmedESignature: `//div[span[contains(text(),'Please')]]/div/div[3]//input`,
  eSignatureCheckbox: `//div[span[contains(text(),'Please')]]/div/div[4]//input`,
  vehicleReleaseCheckbox: `//span[contains(text(),'By')]/preceding-sibling::span/input`,
  marketingConsentCheckbox: `//span[contains(text(),'I, ')]/preceding-sibling::span/input`,
  electronicDeliveryCheckbox: `//span[strong[contains(text(),'Electronic')]]/preceding-sibling::span/input`,
  fullLegalName: (placeholder) => `//input[@placeholder='${placeholder}']`,
  fullLegalNamePlaceholder: `//div[span[contains(text(),'Full Legal Name')]]//input[@placeholder]`,
  producerFullLegalNamePlaceholder: `//div[span[contains(text(),'Legal')]]//input`,
  allFullLegalNameFields: `//input[@placeholder]`,
  eDeliveryNameField: `//input[contains(@aria-label,'e-delivery')]`,
  vehicleReleaseNameField: `//input[contains(@aria-label,'vehicle release')]`,
  consolidatedDisclosureNameField: `//span[contains(text(),'Full Legal Name')]/following::input[1]`,
  selectAllCheckbox: `//label[span[contains(text(),'Select All')]]//input[@type='checkbox']`,
  caaSection: `//span[contains(text(),'APP-1:')]`,
  pipWaiverAgreement:
    "//h5[contains(.,'PIP Waiver')]/following::input[@type='checkbox'][1]",
  pipWaiverNameField: `//input[contains(@aria-label,'PIP Waiver')]`,
  umuimWaiverNameField: "//input[contains(@aria-label,'UM/UIM Waiver')]",
  umuimWaiverAgreement:
    "//h5[contains(.,'UM/UIM Waiver')]/following::input[@type='checkbox'][1]",
  coverageWaiverHeader: `//h6[contains(.,'Coverage Waivers')]`,
  returnToProducer: `//button[contains(.,'Return')]`,
  agentAgreementCheckbox: `//span[contains(text(),'By clicking')]/preceding-sibling::span/span/input`,
  PurchasePolicyBtn: `button[type='button']:has-text("Purchase Policy")`,

  // ===============================  Success Page After Policy Creation  ================================
  successPolicyMsg: `//h5[contains(text(),'successfully purchased the policy.')]`,
  policyNumber: `//div[span[text()='Policy Number']]/following-sibling::div/span`,
  insuredName: `//div[span[text()='Named Insured']]/following-sibling::div/span`,
  policyTerm: `//div[span[text()='Policy Term']]/following-sibling::div/span`,
  paymentPlan: `//div[span[text()='Payment Plan']]/following-sibling::div/span`,
  totalPremium: `//div[span[text()='Premium Total']]/following-sibling::div/span`,
  policyPageBtn: `//button[@data-test='go-to-policy-page-btn']`,

  // =================================== Policy Summary Page ============================
  coverageSummaryBtn: `[data-test='tab_coverage_summary']`,
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
  submissionNo: `//p[text()='Submission No.']`,
  closeVehicleDetails: `[data-test="drawer-close"]`,
  submissionBtn: `[data-test="sidebar-Submissions-btn"]`,
  loader: `//div[text()='Searching for vehicle information']`,

  // ================================== Underwriter Details ========================

  searchTextBox: `//input[@placeholder='Search']`,
  searchPolicy: (policyNumber) => `//span[text()='Policy - ${policyNumber}']`,
  policyList: `[data-test="policyList"]`,
  underWritingBtn: `[data-test="sidebar-Underwriting Review-btn"]`,
  viewPriceTraceBtn: `//button/span[text()='View Price Trace']`,
  pricetraceCloseBtn: `//button[normalize-space()='Close']`,
  coverageSummaryData: `//td[text()='Coverages Total']`,
  priceTraceHeaders: `//table//thead//th`,
  //getBIFactor: (label) => `//tr[td[normalize-space(text())="${label}"]]/td[2]`,
  // getBICalculation: (label) =>
  //   `//tr[td[normalize-space(text())="${label}"]]/td[2]/span`,
  // getPDFactor: (label) => `//tr[td[normalize-space(text())="${label}"]]/td[3]`,
  // getPDCalculation: (label) =>
  //   `//tr[td[normalize-space(text())="${label}"]]/td[3]/span`,
  // getPIPFactor: (label) => `//tr[td[normalize-space(text())="${label}"]]/td[4]`,
  // getPIPCalculation: (label) =>
  //   `//tr[td[normalize-space(text())="${label}"]]/td[4]/span`,
  // getMedpayFactor: (label) =>
  //   `//tr[td[normalize-space(text())="${label}"]]/td[5]`,
  // getMedpayCalculation: (label) =>
  //   `//tr[td[normalize-space(text())="${label}"]]/td[5]/span`,
  // getUmbiFactor: (label) =>
  //   `//tr[td[normalize-space(text())="${label}"]]/td[6]`,
  // getUmbiCalculation: (label) =>
  //   `//tr[td[normalize-space(text())="${label}"]]/td[6]/span`,
  // getUimbiFactor: (label) =>
  //   `//tr[td[normalize-space(text())="${label}"]]/td[7]`,
  // getUimbiCalculation: (label) =>
  //   `//tr[td[normalize-space(text())="${label}"]]/td[7]/span`,
  // getUmpdFactor: (label) =>
  //   `//tr[td[normalize-space(text())="${label}"]]/td[8]`,
  // getUmpdCalculation: (label) =>
  //   `//tr[td[normalize-space(text())="${label}"]]/td[8]/span`,
  // getUimpdFactor: (label) =>
  //   `//tr[td[normalize-space(text())="${label}"]]/td[9]`,
  // getUimpdCalculation: (label) =>
  //   `//tr[td[normalize-space(text())="${label}"]]/td[9]/span`,
  // getCompFactor: (label) =>
  //   `//tr[td[normalize-space(text())="${label}"]]/td[10]`,
  // getCompCalculation: (label) =>
  //   `//tr[td[normalize-space(text())="${label}"]]/td[10]/span`,
  // getCollFactor: (label) =>
  //   `//tr[td[normalize-space(text())="${label}"]]/td[11]`,
  // getCollCalculation: (label) =>
  //   `//tr[td[normalize-space(text())="${label}"]]/td[11]/span`,
  // getRRBFactor: (label) =>
  //   `//tr[td[normalize-space(text())="${label}"]]/td[12]`,
  // getRRBCalculation: (label) =>
  //   `//tr[td[normalize-space(text())="${label}"]]/td[12]/span`,
  // getRSAFactor: (label) =>
  //   `//tr[td[normalize-space(text())="${label}"]]/td[13]`,
  // getRSACalculation: (label) =>
  //   `//tr[td[normalize-space(text())="${label}"]]/td[13]/span`,
};

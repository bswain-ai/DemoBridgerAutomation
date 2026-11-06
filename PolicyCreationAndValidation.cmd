@echo off

REM Set Playwright workers
set WORKERS=5

echo ========================================
echo Running Create Policies Test...
echo ========================================

call npx playwright test createPolicy.spec.js --project=chromium --headed

echo.
echo ========================================
echo Running Premium Validation Test...
echo ========================================

call npx playwright test tests/policyValidation.spec.js --project=chromium

echo.
echo ========================================
echo Running Trace Validation Test...
echo ========================================

call npx playwright test tests/traceValidation.spec.js --project=chromium --headed

echo.
echo ========================================
echo All tests completed!
echo ========================================

pause
@echo off
echo Running Create Policies Test...
call npx playwright test createPolicy.spec.js --project=chromium --headed

echo.
echo Running Premium Validation Test...
call npx playwright test policyValidation.spec.js --project=chromium

echo.
echo All tests completed!
pause

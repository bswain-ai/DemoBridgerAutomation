@echo off
echo Running Create Policies Test...
call npx playwright test tests/createPolicy.spec.js --project=chromium --headed
echo.
echo Running Premium Validation Test...
call npx playwright test tests/policyValidation.spec.js --project=chromium
echo.
echo Running Trace Validation Test...
call npx playwright test tests/traceValidation.spec.js --project=chromium --headed
echo.
echo All tests completed!
pause
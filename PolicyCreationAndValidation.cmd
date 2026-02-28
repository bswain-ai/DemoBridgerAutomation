@echo off
echo Running Create Policies Test...
call npx playwright test createPolicy.spec.js --project=chromium --headed

echo.
echo All tests completed!
pause

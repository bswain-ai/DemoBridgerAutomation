param(
    [string]$file,
    [string]$json
)

# ================= READ JSON =================

$decodedJson = [System.Text.Encoding]::UTF8.GetString(
    [System.Convert]::FromBase64String($json)
)

$data = $decodedJson | ConvertFrom-Json


# ================= OPEN EXCEL =================

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$wb = $excel.Workbooks.Open($file)
$rate = $wb.Sheets.Item("RateOrder")


# ================= CONVERT VALUES =================

$nonOwnerValue = if ($data.NonOwner -eq 1) { "Yes" } else { "No" }
$sr22Value = if ($data.SR22 -eq 1) { "Yes" } else { "No" }
$defensiveDriverValue = if ($data.DefensiveDriver -eq 1) { "Y" } else { "N" }
$drugDiscountValue = if ($data.DrugDiscount -eq 1) { "Y" } else { "N" }
$unacceptableRiskValue = if ($data.'Unacceptable Risk' -eq 1) { "Y" } else { "N" }
$learnersPermitValue = if ($data.LearnersPermit -eq 1) { "Y" } else { "N" }
$rolloverDiscountValue = if ($data.'Rollover Discount' -eq 1) { "Y" } else { "N" }


# ================= DRIVER INFORMATION =================

Write-Host "Writing driver information..."

$rate.Range("Q38").Value2 = "$($data.'Effective Date')"
$rate.Range("Q40").Value2 = "$($data.'Driver DOB')"
$rate.Range("Q42").Value2 = "$($data.'Driver Gender')"
$rate.Range("Q44").Value2 = "$($data.'License State')"
$rate.Range("Q45").Value2 = "$($data.'License Status')"


# ================= BASIC POLICY INPUT =================

Write-Host "Writing policy data..."

$rate.Range("Q48").Value2 = [int]$data.Zip
$rate.Range("Q51").Value2 = "$($data.LicenseType)"

$rate.Range("Q58").Value2 = [int]$data.DriverCount
$rate.Range("Q59").Value2 = [int]$data.VehicleCount

$rate.Range("Q61").Value2 = "$($data.VIN)"
$rate.Range("Q62").Value2 = [int]$data.Year
$rate.Range("Q63").Value2 = "$($data.Make)"
$rate.Range("Q64").Value2 = "$($data.Model)"


# ================= SYMBOL VALUES =================

Write-Host "Writing Comp/Coll symbols..."

$rate.Range("Q66").Value2 = [int]$data.CompSymbol
$rate.Range("Q67").Value2 = [int]$data.CollSymbol


# ================= OTHER FLAGS =================

$rate.Range("Q68").Value2 = $nonOwnerValue
$rate.Range("Q69").Value2 = $sr22Value

$rate.Range("Q71").Value2 = [int]$data.Term
$rate.Range("Q72").Value2 = [int]$data.'Prior Coverage'


# ================= VEHICLE USE =================

Write-Host "Setting vehicle use..."

$rate.Range("Q74").Value2 = "$($data.VehUse)"


# ================= DRIVER / RISK =================

$rate.Range("Q76").Value2 = [int]$data.IsRenew
$rate.Range("Q77").Value2 = [int]$data.DaysInForce
$rate.Range("Q78").Value2 = [int]$data.MajorViolation
$rate.Range("Q79").Value2 = [int]$data.MinorViolation
$rate.Range("Q80").Value2 = [int]$data.ChargableViolation


# ================= SELECT ROW VALUES =================

Write-Host "Writing SELECT row..."

$rate.Range("E45").Value2 = [int]$data.UMBI
$rate.Range("F45").Value2 = [int]$data.UIMBI
$rate.Range("G45").Value2 = [int]$data.MED
$rate.Range("H45").Value2 = [int]$data.UMPD
$rate.Range("I45").Value2 = [int]$data.UIMPD
$rate.Range("J45").Value2 = [int]$data.PIP

$rate.Range("K45").Value2 = [int]$data.CompFlag
$rate.Range("L45").Value2 = [int]$data.CollFlag

$rate.Range("M45").Value2 = [int]$data.RoadSide
$rate.Range("N45").Value2 = "$($data.Rental)"


# ================= DEDUCTIBLES =================

Write-Host "Writing deductibles..."

if ($data.CompFlag -eq 1) {
    $rate.Range("K46").Value2 = [int]$data.CompDed
}
else {
    $rate.Range("K46").Value2 = 250
}

if ($data.CollFlag -eq 1) {
    $rate.Range("L46").Value2 = [int]$data.CollDed
}
else {
    $rate.Range("L46").Value2 = 250
}


# ================= ADDONS =================

Write-Host "Writing RSA and Rental..."

if ($null -ne $data.RSALimit -and $data.RSALimit -ne "") {
    $rate.Range("M46").Value2 = [int]$data.RSALimit
}

if ($null -ne $data.RentalValue -and $data.RentalValue -ne "") {
    $rate.Range("N46").Value2 = "$($data.RentalValue)"
}


# ================= DRIVER DISCOUNTS =================

Write-Host "Writing driver discounts..."

$rate.Range("Q82").Value2 = $defensiveDriverValue
$rate.Range("Q83").Value2 = $drugDiscountValue
$rate.Range("Q84").Value2 = $unacceptableRiskValue
$rate.Range("Q81").Value2 = $learnersPermitValue
$rate.Range("Q88").Value2 = $rolloverDiscountValue


# ================= CALCULATE =================

Write-Host "Recalculating rater..."

$excel.CalculateFullRebuild()
Start-Sleep 2


# ================= SAVE =================

Write-Host "Saving rater..."

$wb.Save()
$wb.Close($true)
$excel.Quit()


# ================= CLEAN MEMORY =================

[System.Runtime.InteropServices.Marshal]::ReleaseComObject($rate) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($wb) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null

[GC]::Collect()
[GC]::WaitForPendingFinalizers()

Write-Host "Rater execution completed successfully"
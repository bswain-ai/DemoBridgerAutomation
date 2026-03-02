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


# ================= BASIC POLICY INPUT =================

Write-Host "Writing policy data..."

$rate.Range("Q55").Value2 = "$($data.ASM)"
$rate.Range("Q57").Value2 = [int]$data.Zip
$rate.Range("Q60").Value2 = "$($data.LicenseType)"

$rate.Range("Q64").Value2 = [int]$data.FullCoverage
$rate.Range("Q67").Value2 = [int]$data.DriverCount
$rate.Range("Q68").Value2 = [int]$data.VehicleCount

$rate.Range("Q71").Value2 = "$($data.VIN)"
$rate.Range("Q72").Value2 = [int]$data.Year
$rate.Range("Q73").Value2 = "$($data.Make)"
$rate.Range("Q74").Value2 = "$($data.Model)"


# ================= SYMBOL VALUES =================
# These must stay 32 / 32

Write-Host "Writing Comp/Coll symbols..."

$rate.Range("Q76").Value2 = [int]$data.Comp
$rate.Range("Q77").Value2 = [int]$data.Coll


# ================= OTHER FLAGS =================

$rate.Range("Q79").Value2 = $nonOwnerValue
$rate.Range("Q80").Value2 = $sr22Value

$rate.Range("Q82").Value2 = [int]$data.Term
$rate.Range("Q84").Value2 = [int]$data.'Prior Coverage'
$rate.Range("Q85").Value2 = "$($data.'Multi-Car')"


# ================= VEHICLE USE =================

Write-Host "Setting vehicle use..."

$rate.Range("Q87").Value2 = "$($data.VehUse)"


# ================= SELECT ROW VALUES =================
# ⭐ THIS MUST BE BEFORE CALCULATION

Write-Host "Writing SELECT row..."

$rate.Range("E52").Value2 = [int]$data.UMBI
$rate.Range("F52").Value2 = [int]$data.UIMBI
$rate.Range("G52").Value2 = [int]$data.MED
$rate.Range("H52").Value2 = [int]$data.UMPD
$rate.Range("I52").Value2 = [int]$data.UIMPD
$rate.Range("J52").Value2 = [int]$data.PIP

# ⭐ IMPORTANT VALUES
$rate.Range("K52").Value2 = [int]$data.COMP
$rate.Range("L52").Value2 = [int]$data.COLL

$rate.Range("M52").Value2 = [int]$data.'ROAD-SIDE'
$rate.Range("N52").Value2 = [int]$data.RENTAL


# ================= DEDUCTIBLES =================

Write-Host "Writing deductibles..."

if ($data.COMP -eq 1) {
    $rate.Range("K54").Value2 = [int]$data.CompDed
}
else {
    $rate.Range("K54").Value2 = 0
}

if ($data.COLL -eq 1) {
    $rate.Range("L54").Value2 = [int]$data.CollDed
}
else {
    $rate.Range("L54").Value2 = 0
}


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
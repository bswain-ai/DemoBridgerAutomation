param(
  [string]$file,
  [string]$json
)

# ================= READ JSON =================

$decodedJson = [System.Text.Encoding]::UTF8.GetString(
    [System.Convert]::FromBase64String($json)
)

$data = $decodedJson | ConvertFrom-Json

# ================= EXCEL OPEN =================

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$wb   = $excel.Workbooks.Open($file)
$rate = $wb.Sheets.Item("RateOrder")

# ================= READ BUSINESS USE FROM MISC =================

$miscSheet = $wb.Sheets.Item("Misc")

$found = $miscSheet.Columns(1).Find("BusinessUse")

if (-not $found) {
    throw "BusinessUse not found in Misc sheet"
}

# Column B = FloatValue:F
$businessUseValue = [double]$miscSheet.Cells($found.Row, 2).Value2

Write-Host "BusinessUse value from Misc:" $businessUseValue

# ================= INPUT VALUES =================

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

# Comp / Coll
$rate.Range("Q76").Value2 = [int]$data.Comp
$rate.Range("Q77").Value2 = [int]$data.Coll

# Deductibles
$rate.Range("K54").Value2 = [int]$data.CompDeductible
$rate.Range("L54").Value2 = [int]$data.CollDeductible

$rate.Range("Q79").Value2 = "$($data.NonOwner)"
$rate.Range("Q80").Value2 = "$($data.SR22)"

$rate.Range("Q82").Value2 = [int]$data.Term
$rate.Range("Q84").Value2 = [int]$data.PriorCoverage
$rate.Range("Q85").Value2 = "$($data.MultiCar)"

# Business Use BI / PD
$rate.Range("C69").Value2 = [double]$data.BusinessUseBI
$rate.Range("D69").Value2 = [double]$data.BusinessUsePD

# ================= CONDITIONAL COVERAGE LOGIC =================

if ($data.ZeroCoverages -eq $true) {

    # Base Rate Row
    $r = 57

    # BusinessUse Row
    $row = 69

    $pipYes  = [int]$data.PIPSection -eq 1
    $compYes = [int]$data.CompCollSection -eq 1

    # CASE 1 – PIP ONLY
    if ($pipYes -and -not $compYes) {

        $rate.Range("E$r","I$r").Value2 = 0
        $rate.Range("K$r","N$r").Value2 = 0

        Write-Host "Case1: Only PIP active"
    }

    # CASE 2 – COMP/COLL ONLY
    elseif (-not $pipYes -and $compYes) {

        $rate.Range("E$r","J$r").Value2 = 0
        $rate.Range("M$r","N$r").Value2 = 0

        # Apply BusinessUse from Misc
        $rate.Range("K$row","L$row").Value2 = $businessUseValue

        Write-Host "Case2: Only Comp/Coll active - BusinessUse applied"
    }

    # CASE 3 – BOTH YES
    elseif ($pipYes -and $compYes) {
        Write-Host "Case3: All active"
    }

    # CASE 4 – BOTH NO
    else {

        $rate.Range("E$r","N$r").Value2 = 0
        Write-Host "Case4: All zero"
    }
}

# ================= RECALCULATE =================

$excel.CalculateFullRebuild()
Start-Sleep 3

$wb.Save()
$wb.Close($true)
$excel.Quit()

[System.Runtime.InteropServices.Marshal]::ReleaseComObject($rate) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($miscSheet) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($wb) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
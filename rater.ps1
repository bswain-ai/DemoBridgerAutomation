param(
    [string]$file,
    [string]$jsonPath,
    [string]$vehicle,
    [string]$driver
)

# ==========================================
# APPLY ONLY VEHICLE / DRIVER MAPPING
# ==========================================

if ($vehicle -and $driver) {

    Write-Host "Applying Mapping"
    Write-Host "Vehicle: $vehicle"
    Write-Host "Driver : $driver"

    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false

    $wb = $excel.Workbooks.Open($file)

    $rate = $wb.Sheets.Item("RateOrder")

    # ======================================
    # APPLY VALUES
    # ======================================

    $rate.Range("B29").Value2 = $vehicle
    $rate.Range("E29").Value2 = $driver

    Write-Host "B29 updated -> $vehicle"
    Write-Host "E29 updated -> $driver"

    # ======================================
    # RECALCULATE
    # ======================================

    $excel.CalculateUntilAsyncQueriesDone()

    $excel.CalculateFull()

    $excel.CalculateFullRebuild()

    Start-Sleep -Seconds 5

    # ======================================
    # FORCE SHEET RECALC
    # ======================================

    $rate.Calculate()

    Start-Sleep -Seconds 3

    # ======================================
    # SAVE
    # ======================================

    $wb.Save()

    Start-Sleep -Seconds 3

    Write-Host "Workbook recalculated and saved"

    $wb.Close($true)

    $excel.Quit()

    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($rate) | Out-Null
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($wb) | Out-Null
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null

    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()

    Write-Host "Workbook recalculated and saved"

    exit
}

# Stop on any error — prevents silent failures where a cell write throws and
# the script continues populating the rater with partial/wrong data.
$ErrorActionPreference = "Stop"

# ── INPUT ─────────────────────────────────────────────────────────────────────
# Read structured JSON from a temp file written by policyValidation.spec.js.
# Base64 CLI arg (old approach) replaced because multi-vehicle payloads
# (up to 8 vehicles x 22 fields + 8 drivers x 15 fields) can exceed
# Windows' 32,767-character command-line limit and fail silently.
$json = Get-Content -Path $jsonPath -Raw
$data = $json | ConvertFrom-Json

$tcId = $data.policy.tcId
$pol = $data.policy

Write-Host "[RATER][$tcId] Input loaded - $($data.vehicles.Count) vehicles, $($data.drivers.Count) drivers"

# ── FORMAT HELPERS ────────────────────────────────────────────────────────────
# Cells expecting "Yes" or "No" text: Non-Owner (D4), SR22 (driver col G)
function To-YesNo([int]$val) { if ($val -eq 1) { "Yes" } else { "No" } }
# Cells expecting "Y" or "N" text: Rollover Discount (G4), Defensive Driver (H),
# Drug Discount (I), Unacceptable Risk (vehicle col I)
function To-YN([int]$val) { if ($val -eq 1) { "Y" } else { "N" } }

# ── EXCEL OPEN ────────────────────────────────────────────────────────────────
$excel = $null
$wb = $null
$rate = $null

try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false

    $wb = $excel.Workbooks.Open($file)

    # =========================
    # STATE SAFE READ
    # =========================
    $state = ""
    if ($pol.PSObject.Properties.Name -contains "state" -and $pol.state) {
        $state = $pol.state.ToUpper()
    }
    else {
        Write-Host "[RATER][$tcId] WARNING: No state → default TEXAS"
        $state = "TEXAS"
    }

    # ============================================================
    #  TEXAS
    # ============================================================
    if ($state -in @("TX", "TEXAS")) {

        # ── POLICY ROW 4 ──────────────────────────────────────────────────────────
        # Policy-level fields written once — apply to every vehicle on the policy.
        #
        # Column layout confirmed from row 3 labels in the rater file:
        #   B = Effective Date      C = Term           D = Non-Owner (Yes/No)
        #   E = Garage Zip          F = Prior Coverage months
        #   G = Rollover Discount (Y/N)                H = IsRenew (0/1)
        #   I = Days In Force
        #
        # Coverage selection flags (every other column — alternating with pre-filled
        # limit cells that we do NOT overwrite):
        #   N = UMBI   P = UIMBI   R = UMPD   T = UIMPD   V = PIP   X = MedPay
        #   J = BI Selection and L = PD Selection are always-on coverages —
        #   left pre-filled in the template, not written by this script.

        $rate = $wb.Sheets.Item("RateOrder")
        Write-Host "[RATER][$tcId] TX mapping started"

        # ---------------- POLICY ----------------
        $rate.Range("B4").Value2 = "$($pol.effectiveDate)"
        $rate.Range("C4").Value2 = [int]$pol.term
        $rate.Range("D4").Value2 = To-YesNo $pol.nonOwner
        $rate.Range("E4").Value2 = [int]$pol.zip
        $rate.Range("F4").Value2 = [int]$pol.priorCovMonths
        $rate.Range("G4").Value2 = To-YN $pol.rolloverDiscount
        $rate.Range("H4").Value2 = [int]$pol.isRenew
        $rate.Range("I4").Value2 = [int]$pol.daysInForce

        # Write only selection flags — limit cells (O4, Q4, S4, U4, W4, Y4)
        # remain at their pre-filled values from the template.
        $rate.Range("N4").Value2 = [int]$pol.umbi
        $rate.Range("P4").Value2 = [int]$pol.uimbi
        $rate.Range("R4").Value2 = [int]$pol.umpd
        $rate.Range("T4").Value2 = [int]$pol.uimpd
        $rate.Range("V4").Value2 = [int]$pol.pip
        $rate.Range("X4").Value2 = [int]$pol.medpay

        # ── VEHICLE ROWS 8–15 (pass 1 — core data + deductibles + limits) ─────────
        # Each vehicle occupies one row: vehicle N goes to row (7 + N).
        # V1 -> row 8,  V2 -> row 9,  ...,  V8 -> row 15.
        #
        # Column layout confirmed from row 7 labels in the rater file:
        #   B = VIN               C = Year             D = Make
        #   E = Model             F = Comp Symbol      G = Coll Symbol
        #   H = Vehicle Use       I = Unacceptable Risk (Y/N)
        #   J = Comp Selection    K = Coll Selection
        #   L = Comp Deductible   M = Coll Deductible
        #   N = RR Selection      O = RR Limit-Duration (e.g. "30-30")
        #   P = RSA Selection     Q = RSA Value
        #   R onward: rater-calculated fields — do NOT write.
        #
        # RR/RSA LIMIT cells (O, Q) are written here in pass 1.
        # RR/RSA SELECTION cells (N, P) are written in pass 2 AFTER Calculate() —
        # this prevents the rater's dependent-dropdown from resetting the limit
        # cells when the selection flag changes (same two-pass pattern as the
        # single-vehicle rater, now applied per vehicle row).
        for ($v = 0; $v -lt $data.vehicles.Count; $v++) {
            $veh = $data.vehicles[$v]
            $row = 8 + $v

            $rate.Range("B$row").Value2 = "$($veh.vin)"
            $rate.Range("C$row").Value2 = [int]$veh.year
            $rate.Range("D$row").Value2 = "$($veh.make)"
            $rate.Range("E$row").Value2 = "$($veh.model)"
            $rate.Range("F$row").Value2 = [int]$veh.compSymbol
            $rate.Range("G$row").Value2 = [int]$veh.collSymbol
            $rate.Range("H$row").Value2 = "$($veh.vehicleUse)"
            $rate.Range("I$row").Value2 = To-YN $veh.unacceptableRisk

            # Physical damage — selection flags
            $rate.Range("J$row").Value2 = [int]$veh.compSelection
            $rate.Range("K$row").Value2 = [int]$veh.collSelection

            # Deductibles written only when coverage is selected — 0 otherwise
            if ([int]$veh.compSelection -eq 1) {
                $rate.Range("L$row").Value2 = [int]$veh.compDed
            }
            else { $rate.Range("L$row").Value2 = 0 }

            if ([int]$veh.collSelection -eq 1) {
                $rate.Range("M$row").Value2 = [int]$veh.collDed
            }
            else { $rate.Range("M$row").Value2 = 0 }

            # Pass 1: limits before selection flags. O column format: "{limit}-{duration}"
            # e.g. "30-30" (limit=$30, duration=30 days). Written regardless of selection
            # flag so the value is ready when the flag is enabled in pass 2.
            if ($veh.rrLimit -and $veh.rrDuration) {
                $rate.Range("O$row").Value2 = "$($veh.rrLimit)-$($veh.rrDuration)"
            }
            if ($veh.rsaVal) {
                $rate.Range("Q$row").Value2 = [int]$veh.rsaVal
            }
        }

        # ── DRIVER ROWS 19–26 ─────────────────────────────────────────────────────
        # Each driver occupies one row: driver N goes to row (18 + N).
        # D1 -> row 19,  D2 -> row 20,  ...,  D8 -> row 26.
        #
        # Column layout confirmed from row 18 labels in the rater file:
        #   B = Gender            C = Marital Status   D = DOB
        #   E = License State     F = License Status
        #   G = SR22 (Yes/No)     H = Defensive Driver (Y/N)
        #   I = Drug Discount (Y/N)
        #   J = Major Violations  K = Minor Violations  L = Chargeable Violations
        #   M onward: rater-calculated (Driver Age, ASM, Class, etc.) — do NOT write.
        #
        # Note: licenseYears, licenseMonths, occupation, learnersPermit are present
        # in the raterData struct but have no input columns in rows 19-26.
        # The rater derives driver age from DOB and license class from licenseStatus.
        for ($d = 0; $d -lt $data.drivers.Count; $d++) {
            $drv = $data.drivers[$d]
            $row = 19 + $d

            $rate.Range("B$row").Value2 = "$($drv.gender)"
            $rate.Range("C$row").Value2 = "$($drv.maritalStatus)"
            $rate.Range("D$row").Value2 = "$($drv.dob)"
            $rate.Range("E$row").Value2 = "$($drv.licenseState)"
            $rate.Range("F$row").Value2 = "$($drv.licenseStatus)"
            $rate.Range("G$row").Value2 = To-YesNo $drv.sr22
            $rate.Range("H$row").Value2 = To-YN $drv.defensiveDriver
            $rate.Range("I$row").Value2 = To-YN $drv.drugDiscount
            $rate.Range("J$row").Value2 = [int]$drv.majorViolations
            $rate.Range("K$row").Value2 = [int]$drv.minorViolations
            $rate.Range("L$row").Value2 = [int]$drv.chargeableViolations
        }

        # ── RR/RSA PASS 2 — SELECTION FLAGS ──────────────────────────────────────
        # Trigger a Calculate() first so dependent cells settle, then write the
        # RR (col N) and RSA (col P) selection flags per vehicle row.
        Write-Host "[RATER][$tcId] Calculate() before writing RR/RSA selection flags..."
        $excel.Calculate()
        Start-Sleep -Seconds 1

        for ($v = 0; $v -lt $data.vehicles.Count; $v++) {
            $veh = $data.vehicles[$v]
            $row = 8 + $v
            $rate.Range("N$row").Value2 = [int]$veh.rrSelection
            $rate.Range("P$row").Value2 = [int]$veh.rsaSelection
        }

        # ── RR/RSA PASS 3 — RE-CONFIRM LIMITS ────────────────────────────────────
        # Writing the selection flag (N, P) may reset the limit cell (O, Q).
        # Re-write the limits after Calculate() to ensure they hold.
        $excel.Calculate()
        Start-Sleep -Seconds 1

        for ($v = 0; $v -lt $data.vehicles.Count; $v++) {
            $veh = $data.vehicles[$v]
            $row = 8 + $v

            if ([int]$veh.rrSelection -eq 1 -and $veh.rrLimit -and $veh.rrDuration) {
                $rate.Range("O$row").Value2 = "$($veh.rrLimit)-$($veh.rrDuration)"
            }

            if ([int]$veh.rsaSelection -eq 1 -and $veh.rsaVal) {
                $rate.Range("Q$row").Value2 = [int]$veh.rsaVal
            }
        }

        $excel.Calculate()
        Start-Sleep -Seconds 1

        # ── INVOKE VBA MACRO ──────────────────────────────────────────────────────
        # CalcPolicyTotalPremium loops every vehicle slot:
        #   sets B29/E29 selector cells -> Application.Calculate -> reads C136
        #   writes per-vehicle premium to L152:L159
        # L160 = SUM(L152:L159)  |  M160 = =L160  <- this is the output cell we read.
        # We invoke the macro — we do NOT replicate its logic here.
        $wb.Application.Run("CalcPolicyTotalPremium")

        # ==========================================
        # READ DYNAMIC COMBINATIONS / For Multiple Vehicle/ Driver
        # ==========================================

        $mappings = @()

        for ($row = 152; $row -le 159; $row++) {

            $veh = $rate.Range("G$row").Text.Trim()

            $drv = $rate.Range("H$row").Text.Trim()

            if ($veh -and $drv -and $veh -ne "-" -and $drv -ne "-") {

                $mappings += @{
                    vehicle = $veh
                    driver  = $drv
                }
            }
        }

        # ==========================================
        # SAVE MAPPINGS JSON
        # ==========================================

        $mappingsJson =
        $mappings | ConvertTo-Json -Depth 5

        $mappingsPath =
        "$PSScriptRoot\mappings.json"

        Set-Content `
            -Path $mappingsPath `
            -Value $mappingsJson

        Write-Host "[RATER] Mappings saved"

        Write-Host "[$tcId][RATER] TEXAS mapping completed"
    }

    # ============================================================
    # CALIFORNIA
    # ============================================================
    elseif ($state -in @("CA", "CALIFORNIA")) {

        Write-Host "[RATER][$tcId] CA mapping started"

        # Select correct sheet
        if ([int]$pol.nonOwner -eq 1) {
            $rate = $wb.Sheets.Item("NonOwnerRater")
        }
        else {
            $rate = $wb.Sheets.Item("OwnerRater")
        }

        # --------------------------------------------------------
        # POLICY DETAILS
        # --------------------------------------------------------
        $rate.Range("A3").Value2 = $pol.effectiveDate
        $rate.Range("B3").Value2 = [int]$pol.term
        $rate.Range("C3").Value2 = To-YesNo $pol.nonOwner
        $rate.Range("D3").Value2 = [int]$pol.zip
        $rate.Range("E3").Value2 = [int]$pol.renewalDiscount
        $rate.Range("J3").Value2 = [int]$pol.umbi
        $rate.Range("L3").Value2 = [int]$pol.umpd
    
        # --------------------------------------------------------
        # OPTIONAL COVERAGES
        # --------------------------------------------------------
        $rate.Range("N3").Value2 = To-YN $pol.tripleDeductible
        $rate.Range("O3").Value2 = [int]$pol.motorclub

        # MedPay Selection
        $rate.Range("P3").Value2 = [int]$pol.medpay

        # MedPay Limit
        if ([int]$pol.medpay -eq 1 -and $pol.medpayLimit) {
            $rate.Range("Q3").Value2 = [int]$pol.medpayLimit
        }
    
        $rate.Range("R3").Value2 = [int]$pol.cdw
        #$rate.Range("U3").NumberFormat = "@"
        #$rate.Range("U3").Value2 = "$($pol.deductibleDiscount)"
        $rate.Range("U3").Value2 = [int]$pol.bipdSymbol
        $rate.Range("V3").Value2 = [int]$pol.mpSymbol

        # --------------------------------------------------------
        # VEHICLE SECTION STARTS ROW 10
        # --------------------------------------------------------
        for ($v = 0; $v -lt $data.vehicles.Count; $v++) {

            $veh = $data.vehicles[$v]
            $row = 10 + $v

            # Vehicle No
            $rate.Range("A$($row)").Value2 = [int]($v + 1)

            # VIN
            $rate.Range("B$($row)").Value2 = "$($veh.vin)"

            # Year
            $rate.Range("C$($row)").Value2 = [int]$veh.year


            # Mileage
            $rate.Range("D$($row)").Value2 = [int]$veh.mileage

            # Business Use
            if ($veh.vehicleUse -eq "Business") {
                $rate.Range("E$($row)").Value2 = "Y"
            }
            else {
                $rate.Range("E$($row)").Value2 = "N"
            }

            # Comp Selection
            $rate.Range("F$($row)").Value2 = [int]$veh.compSelection

            # Coll Selection
            $rate.Range("G$($row)").Value2 = [int]$veh.collSelection

            # Symbol
            $rate.Range("K$($row)").Value2 = "$($veh.compSymbol)"
            $rate.Range("L$($row)").Value2 = "$($veh.collSymbol)"

            # Comp Deductible
            if ([int]$veh.compSelection -eq 1) {
                $rate.Range("H$($row)").Value2 = [int]$veh.compDed
            }
            else {
                $rate.Range("H$($row)").Value2 = 0
            }

            # Coll Deductible
            if ([int]$veh.collSelection -eq 1) {
                $rate.Range("I$($row)").Value2 = [int]$veh.collDed
            }
            else {
                $rate.Range("I$($row)").Value2 = 0
            }

            # Comp Deductible
            if ([int]$veh.compSelection -eq 1) {
                $rate.Range("J$($row)").Value2 = [int]$veh.cdwDed
            }
            else {
                $rate.Range("J$($row)").Value2 = 0
            }

            # --------------------------------------------------------
            # DRIVER SECTION STARTS ROW 21
            # --------------------------------------------------------
            for ($d = 0; $d -lt $data.drivers.Count; $d++) {

                $drv = $data.drivers[$d]
                $row = 21 + $d

                # Driver No
                $rate.Range("A$($row)").Value2 = [int]($d + 1)

                # DOB
                $rate.Range("B$($row)").Value2 = "$($drv.dob)"

                # Marital Status
                if ($drv.maritalStatus.ToString().Trim().ToUpper() -eq "SINGLE") {
                    $rate.Range("C$($row)").Value2 = "S"
                }
                else {
                    $rate.Range("C$($row)").Value2 = "M"
                }

                # Driving Experience
                $rate.Range("D$($row)").Value2 = [int]$drv.drivingExp

                # License Years
                $rate.Range("E$($row)").Value2 = [int]$drv.licenseYears

                # Driver Age / Good Student / Youthful Driver etc.
                # Formula / calculated cells -> leave untouched

                # 55 Plus Driver
                $rate.Range("F$row").Value2 = To-YN $drv.age55OrOlder

                # Youthful Driver
                $rate.Range("G$row").Value2 = To-YN $drv.youthfulDriver

                # Good Student Discount
                $rate.Range("H$row").Value2 = To-YN $drv.goodStudent

                # Major Violations
                $rate.Range("I$row").Value2 = [int]$drv.majorViolations

                # Minor Violations
                $rate.Range("J$row").Value2 = [int]$drv.minorViolations

                # Chargeable Accident 36 Months
                $rate.Range("K$row").Value2 = [int]$drv.chargeableAcc36

                # Chargeable Accident <60 Months
                $rate.Range("L$row").Value2 = [int]$drv.chargeableAcc60

                # Convictions <60 Months
                $rate.Range("M$row").Value2 = [int]$drv.convictions60

                $rate.Range("P$row").Value2 = 'N'
            }
        }
        # --------------------------------------------------------
        # RECALCULATE
        # --------------------------------------------------------
        $excel.Calculate()
        Start-Sleep -Seconds 2

        Write-Host "[$tcId][RATER] CALIFORNIA mapping completed"
    }

    else {
        throw "Unsupported state: $state"
    }

    $wb.Save()
    $wb.Close($true)
}
finally {
    if ($wb -ne $null) { try { $wb.Close($false) } catch {} }
    if ($excel -ne $null) { try { $excel.Quit() } catch {} }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
param(
    [string]$file,
    [string]$jsonPath
)

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
Write-Host "[RATER][$tcId] Input loaded - $($data.vehicles.Count) vehicles, $($data.drivers.Count) drivers"

# ── STALE EXCEL CHECK ─────────────────────────────────────────────────────────
# A prior script crash may leave Excel running with a file lock on the rater
# template. Kill any orphaned Excel process before attempting to open the file.
$stale = Get-Process -Name "excel" -ErrorAction SilentlyContinue
if ($stale) {
    Write-Host "[RATER][$tcId] WARNING: Stale Excel process found - killing before open"
    $stale | Stop-Process -Force
    Start-Sleep -Seconds 1
}

# ── FORMAT HELPERS ────────────────────────────────────────────────────────────

# Cells expecting "Yes" or "No" text: Non-Owner (D4), SR22 (driver col G)
function To-YesNo([int]$val) { if ($val -eq 1) { "Yes" } else { "No" } }

# Cells expecting "Y" or "N" text: Rollover Discount (G4), Defensive Driver (H),
# Drug Discount (I), Unacceptable Risk (vehicle col I)
function To-YN([int]$val) { if ($val -eq 1) { "Y" } else { "N" } }

# ── EXCEL OPEN ────────────────────────────────────────────────────────────────
$excel = $null
$wb    = $null
$rate  = $null

try {
    Write-Host "[RATER][$tcId] Opening rater file: $file"

    $excel = New-Object -ComObject Excel.Application
    $excel.Visible       = $false
    $excel.DisplayAlerts = $false

    $wb   = $excel.Workbooks.Open($file)
    $rate = $wb.Sheets.Item("RateOrder")

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
    Write-Host "[RATER][$tcId] Writing policy row 4..."

    $pol = $data.policy

    $rate.Range("B4").Value2 = "$($pol.effectiveDate)"
    $rate.Range("C4").Value2 = [int]$pol.term
    $rate.Range("D4").Value2 = To-YesNo $pol.nonOwner
    $rate.Range("E4").Value2 = [int]$pol.zip
    $rate.Range("F4").Value2 = [int]$pol.priorCovMonths   # months count, not 0/1 flag
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
        $veh  = $data.vehicles[$v]
        $vRow = 8 + $v      # 0-based: vehicle 0 -> row 8, vehicle 1 -> row 9
        $vNum = $v + 1      # 1-based for log messages

        Write-Host "[RATER][$tcId] Writing vehicle $vNum to row $vRow..."

        $rate.Range("B$vRow").Value2 = "$($veh.vin)"
        $rate.Range("C$vRow").Value2 = [int]$veh.year
        $rate.Range("D$vRow").Value2 = "$($veh.make)"
        $rate.Range("E$vRow").Value2 = "$($veh.model)"
        $rate.Range("F$vRow").Value2 = [int]$veh.compSymbol
        $rate.Range("G$vRow").Value2 = [int]$veh.collSymbol
        $rate.Range("H$vRow").Value2 = "$($veh.vehicleUse)"
        $rate.Range("I$vRow").Value2 = To-YN $veh.unacceptableRisk

        # Physical damage — selection flags
        $rate.Range("J$vRow").Value2 = [int]$veh.compSelection
        $rate.Range("K$vRow").Value2 = [int]$veh.collSelection

        # Deductibles written only when coverage is selected — 0 otherwise
        if ([int]$veh.compSelection -eq 1) {
            $rate.Range("L$vRow").Value2 = [int]$veh.compDed
        } else {
            $rate.Range("L$vRow").Value2 = 0
        }

        if ([int]$veh.collSelection -eq 1) {
            $rate.Range("M$vRow").Value2 = [int]$veh.collDed
        } else {
            $rate.Range("M$vRow").Value2 = 0
        }

        # Pass 1: limits before selection flags. O column format: "{limit}-{duration}"
        # e.g. "30-30" (limit=$30, duration=30 days). Written regardless of selection
        # flag so the value is ready when the flag is enabled in pass 2.
        if ($veh.rrLimit -and $veh.rrDuration) {
            $rate.Range("O$vRow").Value2 = "$($veh.rrLimit)-$($veh.rrDuration)"
        }
        if ($veh.rsaVal) {
            $rate.Range("Q$vRow").Value2 = [int]$veh.rsaVal
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
        $drv  = $data.drivers[$d]
        $dRow = 19 + $d     # 0-based: driver 0 -> row 19, driver 1 -> row 20
        $dNum = $d + 1      # 1-based for log messages

        Write-Host "[RATER][$tcId] Writing driver $dNum to row $dRow..."

        $rate.Range("B$dRow").Value2 = "$($drv.gender)"
        $rate.Range("C$dRow").Value2 = "$($drv.maritalStatus)"
        $rate.Range("D$dRow").Value2 = "$($drv.dob)"
        $rate.Range("E$dRow").Value2 = "$($drv.licenseState)"
        $rate.Range("F$dRow").Value2 = "$($drv.licenseStatus)"
        $rate.Range("G$dRow").Value2 = To-YesNo $drv.sr22           # "Yes" or "No"
        $rate.Range("H$dRow").Value2 = To-YN $drv.defensiveDriver   # "Y" or "N"
        $rate.Range("I$dRow").Value2 = To-YN $drv.drugDiscount      # "Y" or "N"
        $rate.Range("J$dRow").Value2 = [int]$drv.majorViolations
        $rate.Range("K$dRow").Value2 = [int]$drv.minorViolations
        $rate.Range("L$dRow").Value2 = [int]$drv.chargeableViolations
    }

    # ── RR/RSA PASS 2 — SELECTION FLAGS ──────────────────────────────────────
    # Trigger a Calculate() first so dependent cells settle, then write the
    # RR (col N) and RSA (col P) selection flags per vehicle row.
    Write-Host "[RATER][$tcId] Calculate() before writing RR/RSA selection flags..."
    $excel.Calculate()
    Start-Sleep -Seconds 1

    for ($v = 0; $v -lt $data.vehicles.Count; $v++) {
        $veh  = $data.vehicles[$v]
        $vRow = 8 + $v
        $rate.Range("N$vRow").Value2 = [int]$veh.rrSelection
        $rate.Range("P$vRow").Value2 = [int]$veh.rsaSelection
    }

    # ── RR/RSA PASS 3 — RE-CONFIRM LIMITS ────────────────────────────────────
    # Writing the selection flag (N, P) may reset the limit cell (O, Q).
    # Re-write the limits after Calculate() to ensure they hold.
    $excel.Calculate()
    Start-Sleep -Seconds 1

    for ($v = 0; $v -lt $data.vehicles.Count; $v++) {
        $veh  = $data.vehicles[$v]
        $vRow = 8 + $v
        if ([int]$veh.rrSelection -eq 1 -and $veh.rrLimit -and $veh.rrDuration) {
            $rate.Range("O$vRow").Value2 = "$($veh.rrLimit)-$($veh.rrDuration)"
        }
        if ([int]$veh.rsaSelection -eq 1 -and $veh.rsaVal) {
            $rate.Range("Q$vRow").Value2 = [int]$veh.rsaVal
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
    Write-Host "[RATER][$tcId] Invoking macro CalcPolicyTotalPremium..."
    $wb.Application.Run("CalcPolicyTotalPremium")

    # ── READ PREMIUM ──────────────────────────────────────────────────────────
    # M160 = =L160 = policy total premium written by the VBA macro
    $premium = $rate.Range("M160").Value2
    Write-Host "[RATER][$tcId] Premium = $premium"

    # ── SAVE ──────────────────────────────────────────────────────────────────
    Write-Host "[RATER][$tcId] Saving rater output file..."
    $wb.Save()
    $wb.Close($true)
    $wb = $null   # mark closed so the finally block skips the Close call

    Write-Host "[RATER][$tcId] Rater execution completed successfully"

} finally {
    # Always runs — ensures Excel quits even if an error occurred mid-run.
    # $wb.Close($false) discards unsaved changes on error so a half-populated
    # rater file is never written to the RaterOutput folder.
    if ($wb    -ne $null) { try { $wb.Close($false)    } catch {} }
    if ($excel -ne $null) { try { $excel.Quit()         } catch {} }
    if ($rate  -ne $null) { try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($rate)  | Out-Null } catch {} }
    if ($excel -ne $null) { try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null } catch {} }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

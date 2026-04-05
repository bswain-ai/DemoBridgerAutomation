$xlsm = "C:\Users\SaiprasadSahoo\OneDrive - Bridger Insurance Services\Desktop\Doc\ToDo\2_RegressionSuite_InProg_Qalibre\RPBG_TX_Eff_10272025_NB_10162025_RN_Multi.xlsm"
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$wb = $excel.Workbooks.Open($xlsm, 0, $true)
$vbProject = $wb.VBProject
foreach ($comp in $vbProject.VBComponents) {
    if ($comp.CodeModule.CountOfLines -gt 0) {
        $code = $comp.CodeModule.Lines(1, $comp.CodeModule.CountOfLines)
        if ($code -match "CalcPolicyTotalPremium") {
            Write-Host "=== MODULE: $($comp.Name) ==="
            Write-Host $code
        }
    }
}
$wb.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null

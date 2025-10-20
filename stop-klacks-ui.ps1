#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Stops the running Klacks.UI application

.DESCRIPTION
    This script stops the Klacks.UI Angular development server by:
    1. Finding processes running on port 4200
    2. Finding ng serve processes
    3. Terminating these processes

.EXAMPLE
    .\stop-klacks-ui.ps1
    Stops all running Klacks.UI instances

.EXAMPLE
    .\stop-klacks-ui.ps1 -Force
    Forcefully stops all running Klacks.UI instances
#>

param(
    [switch]$Force
)

Write-Host "Searching for running Klacks.UI processes..." -ForegroundColor Cyan

$processesFound = $false

# Method 1: Find process by port 4200
try {
    $port = 4200
    $tcpConnections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

    if ($tcpConnections) {
        foreach ($conn in $tcpConnections) {
            $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "Found process on port ${port}: $($process.Name) (PID: $($process.Id))" -ForegroundColor Yellow

                if ($Force) {
                    Stop-Process -Id $process.Id -Force
                    Write-Host "Forcefully stopped process $($process.Id)" -ForegroundColor Green
                } else {
                    Stop-Process -Id $process.Id
                    Write-Host "Stopped process $($process.Id)" -ForegroundColor Green
                }
                $processesFound = $true
            }
        }
    }
} catch {
    Write-Host "Could not check port 4200 (might need admin rights)" -ForegroundColor Yellow
}

# Method 2: Find ng serve processes
$ngProcesses = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*ng serve*" -or
    $_.CommandLine -like "*angular*" -or
    $_.CommandLine -like "*@angular/cli*"
}

if ($ngProcesses) {
    foreach ($proc in $ngProcesses) {
        Write-Host "Found ng serve process: $($proc.Name) (PID: $($proc.Id))" -ForegroundColor Yellow

        if ($Force) {
            Stop-Process -Id $proc.Id -Force
            Write-Host "Forcefully stopped process $($proc.Id)" -ForegroundColor Green
        } else {
            Stop-Process -Id $proc.Id
            Write-Host "Stopped process $($proc.Id)" -ForegroundColor Green
        }
        $processesFound = $true
    }
}

# Method 3: Find any node process in Klacks.Ui directory
$klacksProcesses = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*Klacks.Ui*"
}

if ($klacksProcesses) {
    foreach ($proc in $klacksProcesses) {
        Write-Host "Found Klacks.Ui node process: $($proc.Name) (PID: $($proc.Id))" -ForegroundColor Yellow

        if ($Force) {
            Stop-Process -Id $proc.Id -Force
            Write-Host "Forcefully stopped process $($proc.Id)" -ForegroundColor Green
        } else {
            Stop-Process -Id $proc.Id
            Write-Host "Stopped process $($proc.Id)" -ForegroundColor Green
        }
        $processesFound = $true
    }
}

if (-not $processesFound) {
    Write-Host "No running Klacks.UI processes found." -ForegroundColor Green
} else {
    Write-Host "`nAll Klacks.UI processes have been stopped." -ForegroundColor Green
}

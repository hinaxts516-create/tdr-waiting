# React(Vite) 開発サーバー起動用ラッパー
# PATH に Node を通してから react-app で vite を起動する
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path", "User")
Set-Location (Join-Path $PSScriptRoot "react-app")
& npm run dev -- --port 5174 --strictPort

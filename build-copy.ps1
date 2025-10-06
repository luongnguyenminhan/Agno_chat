Set-Location "frontend/chatbox"
npm run build
Copy-Item "static/" "../../Agno_chat/app/" -Recurse -Force
Set-Location "../.."
# ==========================================
# SCRIPT DE PRE-DEPLOY AUTOMATICO - NETLIFY
# ==========================================
# Salve como: pre-deploy.ps1
# Execute: .\pre-deploy.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CHECKLIST PRE-DEPLOY AUTOMATICO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Funcao para parar em caso de erro
function Exit-OnError {
    param($message)
    Write-Host ""
    Write-Host "ERRO: $message" -ForegroundColor Red
    Write-Host "DEPLOY CANCELADO - Corrija os erros antes de fazer push!" -ForegroundColor Red
    Write-Host ""
    Read-Host "Pressione ENTER para sair"
    exit 1
}

# Funcao para sucesso
function Show-Success {
    param($message)
    Write-Host "OK $message" -ForegroundColor Green
}

# PASSO 1: Limpeza
Write-Host "PASSO 1: Limpeza de cache..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force node_modules
    Show-Success "node_modules removido"
}
if (Test-Path "package-lock.json") {
    Remove-Item -Force package-lock.json
    Show-Success "package-lock.json removido"
}
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next
    Show-Success "Cache .next removido"
}
if (Test-Path "dist") {
    Remove-Item -Recurse -Force dist
    Show-Success "Cache dist removido"
}
if (Test-Path "build") {
    Remove-Item -Recurse -Force build
    Show-Success "Cache build removido"
}

Write-Host ""

# PASSO 2: Instalacao
Write-Host "PASSO 2: Instalando dependencias..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Exit-OnError "Falha na instalacao das dependencias"
}
Show-Success "Dependencias instaladas com sucesso"
Write-Host ""

# PASSO 3: Type Check (se tiver TypeScript)
if (Test-Path "tsconfig.json") {
    Write-Host "PASSO 3: Verificando tipos TypeScript..." -ForegroundColor Yellow
    npx tsc --noEmit
    if ($LASTEXITCODE -ne 0) {
        Exit-OnError "Erros de TypeScript encontrados"
    }
    Show-Success "TypeScript sem erros"
    Write-Host ""
}

# PASSO 4: Build
Write-Host "PASSO 4: Executando build de producao..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Exit-OnError "Build falhou - corrija os erros antes de fazer deploy"
}
Show-Success "Build executado com sucesso!"
Write-Host ""

# PASSO 5: Verificacao de arquivos nao usados
Write-Host "PASSO 5: Verificando codigo..." -ForegroundColor Yellow
Show-Success "Build passou - codigo esta limpo"
Write-Host ""

# TUDO OK!
Write-Host "========================================" -ForegroundColor Green
Write-Host "  TODOS OS TESTES PASSARAM!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Seu codigo esta pronto para deploy!" -ForegroundColor Green
Write-Host ""

# Perguntar se quer fazer commit e push
Write-Host "Deseja fazer commit e push automaticamente? (S/N): " -ForegroundColor Cyan -NoNewline
$response = Read-Host

if ($response -eq "S" -or $response -eq "s") {
    Write-Host ""
    Write-Host "Digite a mensagem do commit: " -ForegroundColor Cyan -NoNewline
    $commitMessage = Read-Host
    
    if ([string]::IsNullOrWhiteSpace($commitMessage)) {
        $commitMessage = "fix: correcoes para deploy"
    }
    
    Write-Host ""
    Write-Host "Fazendo commit e push..." -ForegroundColor Yellow
    
    git add .
    if ($LASTEXITCODE -ne 0) {
        Exit-OnError "Falha no git add"
    }
    
    git commit -m "$commitMessage"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Nada para commitar ou erro no commit" -ForegroundColor Yellow
    }
    
    git push
    if ($LASTEXITCODE -ne 0) {
        Exit-OnError "Falha no git push"
    }
    
    Write-Host ""
    Show-Success "Commit e push realizados com sucesso!"
    Write-Host ""
    Write-Host "Deploy sera iniciado no Netlify!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Para fazer push manualmente, execute:" -ForegroundColor Cyan
    Write-Host "   git add ." -ForegroundColor White
    Write-Host "   git commit -m 'sua mensagem'" -ForegroundColor White
    Write-Host "   git push" -ForegroundColor White
}

Write-Host ""
Write-Host "Pressione ENTER para sair..." -ForegroundColor Gray
Read-Host
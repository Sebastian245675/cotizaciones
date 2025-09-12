# Script para simplificar el perfil del cliente en el PDF
$content = Get-Content "src\hooks\useQuoteExport.ts"

# Reemplazar líneas específicas
$content = $content -replace 'Título con icono', 'Título simple'
$content = $content -replace 'Línea divisoria vertical estilizada', 'Línea divisoria vertical simple'

# Eliminar líneas de rectángulo blanco duplicado después de "Marco principal del cliente simple"
$newContent = @()
$skipNext = $false

for ($i = 0; $i -lt $content.Length; $i++) {
    $line = $content[$i]
    
    # Si encontramos la línea del marco principal del cliente simple y la siguiente es setFillColor(245, 245, 245)
    if ($line -match "Marco principal del cliente simple" -and $content[$i+1] -match "setFillColor\(245, 245, 245\)") {
        $newContent += $line
        $newContent += $content[$i+1]  # setFillColor(245, 245, 245)
        $newContent += $content[$i+2]  # rect con fondo gris
        $i += 2
        
        # Buscar y saltar la línea del rectángulo blanco
        $j = $i + 1
        while ($j -lt $content.Length -and $content[$j] -notmatch "setFillColor\(255, 255, 255\)") {
            $newContent += $content[$j]
            $j++
        }
        
        # Saltar la línea setFillColor(255, 255, 255) y su rect
        if ($j -lt $content.Length -and $content[$j] -match "setFillColor\(255, 255, 255\)") {
            $j += 2  # Saltar setFillColor y su rect
        }
        
        $i = $j - 1
    } else {
        $newContent += $line
    }
}

$newContent | Set-Content "src\hooks\useQuoteExport.ts"
Write-Host "Perfil del cliente simplificado"
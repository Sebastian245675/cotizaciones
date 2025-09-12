import re

# Leer el archivo
with open('src/hooks/useQuoteExport.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Buscar el mini header y agregar el logo
old_section = '''        // Mini header para página de totales
        doc.setFillColor(240, 240, 240);
        doc.rect(0, 0, pageWidth, 30, 'F');
        
        doc.setTextColor(60, 60, 60);'''

new_section = '''        // Mini header para página de totales con logo
        doc.setFillColor(240, 240, 240);
        doc.rect(0, 0, pageWidth, 30, 'F');
        
        // Agregar logo en la página de totales
        try {
          doc.addImage(MIRG_LOGO_BASE64, 'PNG', margin, 8, 20, 15);
        } catch (error) {
          console.log('Error adding MIRG logo to totals page:', error);
        }
        
        doc.setTextColor(60, 60, 60);'''

# Encontrar la primera ocurrencia y reemplazarla
first_occurrence = content.find(old_section)
if first_occurrence != -1:
    # Reemplazar solo la primera ocurrencia
    content = content[:first_occurrence] + new_section + content[first_occurrence + len(old_section):]
    
    # Guardar el archivo
    with open('src/hooks/useQuoteExport.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Logo agregado a la página de totales")
else:
    print("❌ No se encontró la sección a reemplazar")
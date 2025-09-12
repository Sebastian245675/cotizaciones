import re

# Leer el archivo
with open('src/hooks/useQuoteExport.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Dividir en líneas para renombrar cada declaración de forma única
lines = content.split('\n')
terms_counter = 1

for i, line in enumerate(lines):
    if 'const termsAndConditions = [' in line:
        if terms_counter == 1:
            lines[i] = line.replace('const termsAndConditions = [', 'const termsAndConditions1 = [')
        elif terms_counter == 2:
            lines[i] = line.replace('const termsAndConditions = [', 'const termsAndConditions2 = [')
        elif terms_counter == 3:
            lines[i] = line.replace('const termsAndConditions = [', 'const termsAndConditions3 = [')
        elif terms_counter == 4:
            lines[i] = line.replace('const termsAndConditions = [', 'const termsAndConditions4 = [')
        terms_counter += 1

# Ahora actualizar las referencias
content = '\n'.join(lines)

# Actualizar referencias de manera secuencial
replacements = [
    ('termsAndConditions1.forEach', 'termsAndConditions1.forEach'),
    ('termsAndConditions2.forEach', 'termsAndConditions2.forEach'),
    ('termsAndConditions3.forEach', 'termsAndConditions3.forEach'),
    ('termsAndConditions4.forEach', 'termsAndConditions4.forEach')
]

# Como no podemos distinguir fácilmente, voy a usar un enfoque diferente
# Reemplazar todas las ocurrencias secuencialmente
counter = 1
while 'termsAndConditions.forEach' in content:
    content = content.replace('termsAndConditions.forEach', f'termsAndConditions{counter}.forEach', 1)
    counter += 1

# Guardar el archivo
with open('src/hooks/useQuoteExport.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Variables de términos renombradas para evitar conflictos")